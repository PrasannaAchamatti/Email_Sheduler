import { Client } from '@elastic/elasticsearch';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export const EMAILS_INDEX = 'reachinbox_emails';

let esClient: Client | null = null;
let isElasticsearchConnected = false;

export function getElasticsearchClient(): Client {
  if (!esClient) {
    const options: any = {
      node: env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200'
    };

    if (env.ELASTICSEARCH_USERNAME && env.ELASTICSEARCH_PASSWORD) {
      options.auth = {
        username: env.ELASTICSEARCH_USERNAME,
        password: env.ELASTICSEARCH_PASSWORD
      };
    }

    esClient = new Client(options);
  }
  return esClient;
}

export function isEsConnected(): boolean {
  return isElasticsearchConnected;
}

export async function initElasticsearch(): Promise<boolean> {
  try {
    const client = getElasticsearchClient();
    const ping = await client.ping();
    if (!ping) {
      logger.warn('Elasticsearch ping did not return true. Operating in graceful database-backed search mode.');
      isElasticsearchConnected = false;
      return false;
    }

    isElasticsearchConnected = true;
    logger.info(`Elasticsearch connected successfully at ${env.ELASTICSEARCH_URL}`);

    // Ensure index exists
    const indexExists = await client.indices.exists({ index: EMAILS_INDEX });
    if (!indexExists) {
      await client.indices.create({
        index: EMAILS_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                email_analyzer: {
                  type: 'custom',
                  tokenizer: 'uax_url_email',
                  filter: ['lowercase']
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              senderName: { type: 'text' },
              recipient: {
                type: 'text',
                analyzer: 'email_analyzer',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              etherealPreviewUrl: { type: 'keyword' },
              errorMessage: { type: 'text' }
            }
          }
        }
      });
      logger.info(`Created Elasticsearch index: ${EMAILS_INDEX}`);
    }

    return true;
  } catch (err: any) {
    logger.warn(`Elasticsearch unavailable (${err.message}). System will continue with database-backed search and queue indexing for retry.`);
    isElasticsearchConnected = false;
    return false;
  }
}

export interface EmailDocument {
  id: string;
  userId: string;
  campaignId?: string | null;
  senderId: string;
  senderEmail: string;
  senderName: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
}

export async function indexEmailDocument(doc: EmailDocument): Promise<boolean> {
  if (!isElasticsearchConnected) return false;
  try {
    const client = getElasticsearchClient();
    await client.index({
      index: EMAILS_INDEX,
      id: doc.id,
      document: {
        ...doc,
        scheduledAt: new Date(doc.scheduledAt).toISOString(),
        sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
        createdAt: new Date(doc.createdAt).toISOString(),
        updatedAt: new Date(doc.updatedAt).toISOString()
      },
      refresh: 'wait_for'
    });
    return true;
  } catch (err: any) {
    logger.error(`Failed to index email ${doc.id} in Elasticsearch:`, err.message);
    return false;
  }
}

export async function updateEmailStatusInElastic(
  emailId: string,
  update: {
    status: string;
    sentAt?: Date | null;
    errorMessage?: string | null;
    etherealPreviewUrl?: string | null;
    attempts?: number;
  }
): Promise<boolean> {
  if (!isElasticsearchConnected) return false;
  try {
    const client = getElasticsearchClient();
    await client.update({
      index: EMAILS_INDEX,
      id: emailId,
      doc: {
        ...update,
        sentAt: update.sentAt ? new Date(update.sentAt).toISOString() : undefined,
        updatedAt: new Date().toISOString()
      },
      refresh: 'wait_for'
    });
    return true;
  } catch (err: any) {
    logger.warn(`Failed to update email ${emailId} in Elasticsearch:`, err.message);
    return false;
  }
}

export interface SearchEmailsParams {
  userId: string;
  query?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SearchEmailsResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  results: EmailDocument[];
  source: 'elasticsearch' | 'database';
}

export async function searchEmailsInElastic(
  params: SearchEmailsParams
): Promise<SearchEmailsResult | null> {
  if (!isElasticsearchConnected) return null;
  try {
    const client = getElasticsearchClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const from = (page - 1) * limit;

    const mustFilters: any[] = [{ term: { userId: params.userId } }];

    if (params.status && params.status !== 'all') {
      mustFilters.push({ term: { status: params.status } });
    }

    if (params.startDate || params.endDate) {
      const rangeFilter: any = {};
      if (params.startDate) rangeFilter.gte = params.startDate;
      if (params.endDate) rangeFilter.lte = params.endDate;
      mustFilters.push({ range: { scheduledAt: rangeFilter } });
    }

    let queryBlock: any;
    if (params.query && params.query.trim()) {
      queryBlock = {
        bool: {
          must: mustFilters,
          should: [
            { wildcard: { recipient: `*${params.query.trim().toLowerCase()}*` } },
            { match_phrase_prefix: { recipient: params.query.trim() } },
            { match: { subject: { query: params.query.trim(), boost: 2 } } },
            { match: { body: { query: params.query.trim(), boost: 1 } } }
          ],
          minimum_should_match: 1
        }
      };
    } else {
      queryBlock = {
        bool: {
          must: mustFilters
        }
      };
    }

    const response = await client.search({
      index: EMAILS_INDEX,
      from,
      size: limit,
      sort: [{ scheduledAt: { order: 'desc' } }],
      query: queryBlock
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total?.value ?? 0);

    const results = response.hits.hits.map((hit: any) => ({
      ...hit._source,
      id: hit._id
    })) as EmailDocument[];

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      results,
      source: 'elasticsearch'
    };
  } catch (err: any) {
    logger.error('Elasticsearch search error, falling back:', err.message);
    return null;
  }
}

