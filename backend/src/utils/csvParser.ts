import { parse } from 'csv-parse/sync';

export interface ParseResult {
  validEmails: string[];
  invalidCount: number;
  totalParsed: number;
  duplicateCount: number;
  preview: string[];
  errors: string[];
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export function parseRecipientsContent(fileContent: string | Buffer): ParseResult {
  const content = Buffer.isBuffer(fileContent) ? fileContent.toString('utf-8') : fileContent;
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return {
      validEmails: [],
      invalidCount: 0,
      totalParsed: 0,
      duplicateCount: 0,
      preview: [],
      errors: ['File is empty']
    };
  }

  const rawList: string[] = [];
  let isTabular = false;
  let emailColIdx = -1;

  try {
    const records = parse(content, {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true
    }) as string[][];

    if (records.length > 0) {
      const firstRow = records[0].map(c => c.trim().toLowerCase());
      // Check if first row contains an email header
      emailColIdx = firstRow.findIndex(h =>
        ['email', 'emails', 'email address', 'email_address', 'recipient', 'recipients', 'mail'].includes(h)
      );

      if (emailColIdx !== -1) {
        isTabular = true;
        // Extract only the email column from row 1 onward
        for (let i = 1; i < records.length; i++) {
          const row = records[i];
          if (row[emailColIdx] !== undefined) {
            rawList.push(row[emailColIdx]);
          }
        }
      } else if (records[0].length > 1) {
        // Multi-column without explicit email header: check which column has the most '@'
        const colAtCounts = new Array(records[0].length).fill(0);
        for (const row of records) {
          row.forEach((cell, idx) => {
            if (cell.includes('@')) colAtCounts[idx]++;
          });
        }
        const maxAtIdx = colAtCounts.indexOf(Math.max(...colAtCounts));
        if (colAtCounts[maxAtIdx] > 0) {
          isTabular = true;
          for (const row of records) {
            if (row[maxAtIdx]) {
              rawList.push(row[maxAtIdx]);
            }
          }
        }
      }
    }

    if (!isTabular) {
      // Single column or free-form text
      for (const row of records) {
        for (const cell of row) {
          if (cell && typeof cell === 'string') {
            const parts = cell.split(/[,;\r\n\t]+/).map(p => p.trim()).filter(Boolean);
            rawList.push(...parts);
          }
        }
      }
    }
  } catch (err: any) {
    const parts = content.split(/[,;\r\n\t]+/).map(p => p.trim()).filter(Boolean);
    rawList.push(...parts);
  }

  let invalidCount = 0;
  const seen = new Set<string>();
  const validEmails: string[] = [];
  let duplicateCount = 0;

  for (const raw of rawList) {
    const cleaned = raw.replace(/^["']|["']$/g, '').trim().toLowerCase();
    if (!cleaned) continue;

    // Filter headers if any leaked through
    if (['email', 'emails', 'email address', 'email_address', 'recipient', 'recipients', 'mail'].includes(cleaned)) {
      continue;
    }

    if (isValidEmail(cleaned)) {
      if (seen.has(cleaned)) {
        duplicateCount++;
      } else {
        seen.add(cleaned);
        validEmails.push(cleaned);
      }
    } else {
      invalidCount++;
    }
  }

  return {
    validEmails,
    invalidCount,
    totalParsed: validEmails.length + duplicateCount + invalidCount,
    duplicateCount,
    preview: validEmails.slice(0, 10),
    errors
  };
}
