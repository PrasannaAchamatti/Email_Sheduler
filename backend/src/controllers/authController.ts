import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { env } from '../config/env';
import { getGoogleAuthUrl, exchangeGoogleCode } from '../integrations/google/googleAuth';
import { logger } from '../config/logger';

const COOKIE_NAME = 'reachinbox_token';

function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

export class AuthController {
  public static async getGoogleAuthStatus(req: Request, res: Response) {
    const url = getGoogleAuthUrl();
    res.status(200).json({
      success: true,
      data: {
        configured: Boolean(url),
        authUrl: url || null
      }
    });
  }

  public static async handleGoogleCallback(req: Request, res: Response) {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.redirect(`${env.FRONTEND_URL}/login?error=Missing+Google+authorization+code`);
      }

      const googleUser = await exchangeGoogleCode(code);
      const { user, token } = await AuthService.loginAsDemoUser(
        googleUser.email,
        googleUser.name,
        googleUser.avatar
      );

      setAuthCookie(res, token);
      res.redirect(`${env.FRONTEND_URL}/`);
    } catch (err: any) {
      logger.error('Google OAuth callback failed:', err.message);
      res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(err.message || 'Google OAuth failed')}`);
    }
  }

  public static async loginGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = req.body;
      const { user, token } = await AuthService.loginWithGoogle(idToken);
      setAuthCookie(res, token);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role
          },
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async loginDemo(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, avatar } = req.body;
      const { user, token } = await AuthService.loginAsDemoUser(email, name, avatar);
      setAuthCookie(res, token);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role
          },
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const user = await AuthService.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}

