import { z } from 'zod';

export const scheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Email subject is required'),
  body: z.string().min(1, 'Email body is required'),
  recipients: z.array(z.string().email('Invalid recipient email format')).min(1, 'At least one recipient is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:mm'),
  delayBetweenEmails: z.coerce.number().int().min(500, 'Minimum delay is 500ms').default(2000),
  hourlyLimit: z.coerce.number().int().min(1, 'Hourly limit must be at least 1').default(200),
  senderId: z.string().min(1, 'Sender ID is required')
});

export const searchEmailQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

