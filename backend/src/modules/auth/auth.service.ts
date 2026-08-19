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
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  user: SanitizedUser;
  application: Application | null;
  accessToken: string;
  refreshToken: string;
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

      const newApp = await tx.application.create({
        data: {
          userId: newUser.id,
          stage: ApplicationStage.SIGNUP_COMPLETED,
        },
      });

      return { user: newUser, application: newApp };
    });

    // 5. Generate JWT Access and Refresh Tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // 6. Save Refresh Token in Database (expires in 30 days)
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
   * Verifies email & password, issues short-lived access token and refresh token.
   */
  public async login(input: LoginInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();

    // 1. Retrieve user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    // 3. Find most recent loan application
    let application = await prisma.application.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // If customer has no application, create one
    if (!application && user.role === Role.CUSTOMER) {
      application = await prisma.application.create({
        data: {
          userId: user.id,
          stage: ApplicationStage.SIGNUP_COMPLETED,
        },
      });
    }

    // 4. Generate Tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // 5. Persist Refresh Token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
   * Refresh Token Endpoint
   * Rotates refresh tokens and issues fresh access token.
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
      throw AppError.unauthorized('Refresh token is invalid or expired. Please sign in again.');
    }

    const user = storedToken.user;

    // 3. Rotate tokens: Generate new Access + Refresh tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // 4. Atomic token rotation in DB
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
   * User Logout
   * Removes refresh token from database.
   */
  public async logout(rawToken?: string): Promise<void> {
    if (rawToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: rawToken },
      });
    }
  }

  /**
   * Get Current Authenticated User Profile & Active Loan Application
   */
  public async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            kycDetails: true,
            eligibilityCheck: true,
            loanTerms: true,
            bankAccount: true,
            declaration: true,
            selfie: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User account not found.');
    }

    return {
      user: this.sanitizeUser(user),
      application: user.applications[0] || null,
    };
  }
}

export const authService = new AuthService();
