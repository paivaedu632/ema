import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export interface JWTPayload {
  sub: string; // user ID
  aud: string; // audience
  iss: string; // issuer
  iat: number; // issued at
  exp: number; // expires at
  jti: string; // JWT ID
  sid: string; // session ID
  role: string; // user role
}

export interface TokenOptions {
  expiresIn?: string | number; // '30d', '1h', 3600, etc.
  audience?: string;
  issuer?: string;
  role?: string;
}

export class JWTService {
  private readonly secret: string;
  private readonly defaultIssuer: string;
  private readonly defaultAudience: string;

  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.defaultIssuer = process.env.JWT_ISSUER || 'emapay-api';
    this.defaultAudience = process.env.JWT_AUDIENCE || 'emapay-api';

    if (!this.secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Generate a JWT token for a user
   */
  generateToken(userId: string, options: TokenOptions = {}): string {
    const sessionId = `sess_${randomUUID().replace(/-/g, '')}`;
    const jwtId = `jwt_${randomUUID().replace(/-/g, '')}`;

    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: userId,
      aud: options.audience || this.defaultAudience,
      iss: options.issuer || this.defaultIssuer,
      jti: jwtId,
      sid: sessionId,
      role: options.role || 'authenticated'
    };

    const tokenOptions: jwt.SignOptions = {
      expiresIn: options.expiresIn || '30d',
      algorithm: 'HS256'
    };

    return jwt.sign(payload, this.secret, tokenOptions);
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        audience: this.defaultAudience,
        issuer: this.defaultIssuer
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Generate a refresh token (longer expiration)
   */
  generateRefreshToken(userId: string): string {
    return this.generateToken(userId, {
      expiresIn: '90d',
      role: 'refresh'
    });
  }

  /**
   * Check if token is expired without throwing
   */
  isTokenExpired(token: string): boolean {
    try {
      this.verifyToken(token);
      return false;
    } catch (error) {
      return error.message === 'Token has expired';
    }
  }
}

// Singleton instance
export const jwtService = new JWTService();
