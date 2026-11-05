import { z } from 'zod';

export const createSenderSchema = z.object({
  name: z.string().min(1, 'Sender name is required'),
  email: z.string().email('Valid sender email is required'),
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required')
});

