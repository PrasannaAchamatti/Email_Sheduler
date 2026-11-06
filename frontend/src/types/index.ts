export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  slackIntegration?: {
    connected: boolean;
    teamName?: string | null;
    channelName?: string | null;
  } | null;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  isEthereal: boolean;
  isActive: boolean;
  createdAt: string;
  webUrl?: string;
}

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  status: 'scheduled' | 'processing' | 'completed' | 'paused' | 'cancelled';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  emails?: Email[];
}

export interface Email {
  id: string;
  campaignId?: string | null;
  userId: string;
  senderId: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    isEthereal?: boolean;
  };
  campaign?: {
    id: string;
    subject: string;
  } | null;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: 'scheduled' | 'waiting' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  errorMessage?: string | null;
  messageId?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  isPaused: boolean;
  total: number;
}

export interface RateLimitUsage {
  senderId: string;
  senderName: string;
  senderEmail: string;
  currentCount: number;
  maxLimit: number;
  hourWindow: string;
  resetsAt: string;
  remaining: number;
  percentUsed: number;
}

export interface SlackStatus {
  connected: boolean;
  type?: 'webhook' | 'oauth' | null;
  teamId?: string | null;
  teamName?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  webhookUrl?: string | null;
  connectedAt?: string | null;
}

export interface RecipientParseResult {
  validEmails: string[];
  invalidCount: number;
  totalParsed: number;
  duplicateCount: number;
  preview: string[];
  errors: string[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

