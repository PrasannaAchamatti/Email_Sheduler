import { z } from 'zod';

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required')
});

export const demoAuthSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  avatar: z.string().optional()
});

