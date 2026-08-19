import bcrypt from 'bcryptjs';
import { Role, ApplicationStage, User, Application } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { SignupInput, LoginInput } from './auth.schema';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../shared/utils/jwt';
import { AppError } from '../../shared/utils/app-error';

export interface SanitizedUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  phoneVerified: boolean;
  oauthProvider: string | null;
  oauthId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  user: SanitizedUser;
  application: Application | null;
  accessToken: string;
  refreshToken: string;
}

export interface OAuthProfileInput {
  googleId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export class AuthService {
  private sanitizeUser(user: User): SanitizedUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      oauthProvider: user.oauthProvider,
      oauthId: user.oauthId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * User Signup
   * Hashes password (bcrypt cost factor 12), creates User and initial Application row in a transaction.
   */
  public async signup(input: SignupInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();

    // 1. Check for duplicate email at application level
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      throw AppError.conflict('An account with this email address already exists. Please log in.');
    }

    // 2. Check for duplicate phone if provided
    if (input.phone) {
      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone: input.phone },
      });
      if (existingUserByPhone) {
        throw AppError.conflict('An account with this phone number already exists.');
      }
    }

    // 3. Hash password with bcrypt (Cost Factor: 12 >= 10)
    const passwordHash = await bcrypt.hash(input.password, 12);

    // 4. Create User and linked Application inside a single atomic transaction
    const { user, application } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          phone: input.phone || null,
          passwordHash,
          role: Role.CUSTOMER,
          emailVerified: false,
          phoneVerified: false,
        },
      });

      const newApplication = await tx.application.create({
        data: {
          userId: newUser.id,
          stage: ApplicationStage.SIGNUP_COMPLETED,
        },
      });

      return { user: newUser, application: newApplication };
    });

    // 5. Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    // 6. Store hashed/persisted refresh token in database (30 day TTL)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      user: this.sanitizeUser(user),
      application,
      accessToken,
      refreshToken,
    };
  }

  /**
   * User Login
   * Verifies email + password, issues JWT access token and rotating refresh token.
   */
  public async login(input: LoginInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();

    // 1. Fetch user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    // 2. Compare password against hash
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    // 3. Fetch active loan application
    const application = await prisma.application.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Generate JWT access and refresh tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    // 5. Save refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      user: this.sanitizeUser(user),
      application,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Google / OAuth User Login & Registration Flow
   * Handles first-time auto-registration (with emailVerified = true) or returning login.
   */
  public async handleOAuthLogin(profile: OAuthProfileInput): Promise<AuthResult> {
    const email = profile.email.trim().toLowerCase();
    const googleId = profile.googleId.trim();

    // 1. Check if user exists by oauthId or by email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ oauthProvider: 'google', oauthId: googleId }, { email }],
      },
    });

    let application: Application | null = null;

    if (!user) {
      // First-time OAuth login: Auto-create User (emailVerified = true) and Application
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            emailVerified: true, // Google verifies user email
            phoneVerified: false,
            oauthProvider: 'google',
            oauthId: googleId,
            role: Role.CUSTOMER,
          },
        });

        const newApp = await tx.application.create({
          data: {
            userId: newUser.id,
            stage: ApplicationStage.SIGNUP_COMPLETED,
          },
        });

        return { user: newUser, application: newApp };
      });

      user = result.user;
      application = result.application;
    } else {
      // Returning user: Ensure oauth link is updated and email is marked verified
      const updateData: { oauthProvider?: string; oauthId?: string; emailVerified?: boolean } = {};
      if (!user.oauthId || user.oauthProvider !== 'google') {
        updateData.oauthProvider = 'google';
        updateData.oauthId = googleId;
      }
      if (!user.emailVerified) {
        updateData.emailVerified = true;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }

      // Fetch active application
      application = await prisma.application.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!application) {
        application = await prisma.application.create({
          data: {
            userId: user.id,
            stage: ApplicationStage.SIGNUP_COMPLETED,
          },
        });
      }
    }

    // 2. Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    // 3. Save refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      user: this.sanitizeUser(user),
      application,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Token Refresh
   * Validates refresh token from cookie/body, rotates token in DB, and returns new access token.
   */
  public async refreshToken(
    rawToken: string
  ): Promise<{ accessToken: string; refreshToken: string; user: SanitizedUser }> {
    if (!rawToken) {
      throw AppError.unauthorized('No refresh token provided.');
    }

    // 1. Verify token cryptographic signature
    verifyToken(rawToken);

    // 2. Verify token exists in database and has not expired
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: rawToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Invalidate if found expired
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw AppError.unauthorized('Invalid or expired refresh token. Please log in again.');
    }

    const user = storedToken.user;

    // 3. Generate new access token & rotating refresh token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
    });

    // 4. Atomic token rotation: Delete old token, insert new token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt,
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Invalidate Refresh Token on Logout
   */
  public async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;

    try {
      await prisma.refreshToken.deleteMany({
        where: { token: rawToken },
      });
    } catch {
      // Silent catch - logout should always succeed on client
    }
  }

  /**
   * Get authenticated user profile with active loan application
   */
  public async getMe(
    userId: string
  ): Promise<{ user: SanitizedUser; application: Application | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('User not found.');
    }

    const application = await prisma.application.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      user: this.sanitizeUser(user),
      application,
    };
  }
}

export const authService = new AuthService();
