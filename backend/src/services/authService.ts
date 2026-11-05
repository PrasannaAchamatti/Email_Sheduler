import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { verifyGoogleToken } from '../integrations/google/googleAuth';
import { logger } from '../config/logger';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.SESSION_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.SESSION_SECRET) as AuthTokenPayload;
}

export class AuthService {
  /**
   * Authenticate or register with Google OAuth ID token
   */
  public static async loginWithGoogle(idToken: string) {
    const googleUser = await verifyGoogleToken(idToken);

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }]
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar || null,
          role: 'USER'
        }
      });
      logger.info(`Created new user via Google OAuth: ${user.email} (${user.id})`);
    } else {
      // Update avatar or googleId if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleUser.name,
          avatar: googleUser.avatar || user.avatar,
          googleId: googleUser.googleId
        }
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return { user, token };
  }

  /**
   * Demo / Evaluator login for instant testing without needing immediate Google Cloud Console config
   */
  public static async loginAsDemoUser(
    email = 'evaluator@reachinbox.test',
    name = 'ReachInbox Evaluator',
    avatar?: string
  ) {
    let user = await prisma.user.findUnique({
      where: { email }
    });

    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`;

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          avatar: defaultAvatar,
          role: 'ADMIN'
        }
      });
      logger.info(`Created Demo Evaluator user: ${user.email} (${user.id})`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          avatar: avatar || user.avatar || defaultAvatar
        }
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return { user, token };
  }

  /**
   * Get user profile by ID
   */
  public static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        slackIntegration: {
          select: {
            connected: true,
            teamName: true,
            channelName: true
          }
        }
      }
    });
    return user;
  }
}

