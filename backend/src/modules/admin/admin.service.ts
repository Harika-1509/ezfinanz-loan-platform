import { Prisma, ApplicationStage, AdminReviewStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { emailService } from '../../shared/services/email.service';
import { ListApplicationsQuery, DisburseLoanInput } from './admin.schema';

export interface ApplicationListItem {
  id: string;
  userId: string;
  applicantName: string;
  applicantEmail: string | null;
  applicantPhone: string | null;
  requestedAmount: number;
  tenureMonths: number | null;
  stage: ApplicationStage;
  selfieStatus: string | null;
  submittedAt: Date;
  updatedAt: Date;
}

export interface ApplicationDetailResponse {
  application: {
    id: string;
    userId: string;
    stage: ApplicationStage;
    createdAt: Date;
    updatedAt: Date;
  };
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    createdAt: Date;
  };
  kycDetails: {
    id: string;
    fullName: string;
    dob: Date;
    gender: string;
    address: string;
    idType: string;
    idNumber: string;
    idPhotoUrl: string | null;
    createdAt: Date;
  } | null;
  eligibilityCheck: {
    id: string;
    income: number;
    requestedAmount: number;
    creditScore: number;
    existingDebts: number;
    employerName: string;
    designation: string;
    dtiRatio: number;
    result: string;
    maxApprovedAmount: number;
    createdAt: Date;
  } | null;
  loanTerms: {
    id: string;
    amount: number;
    tenureMonths: number;
    interestRate: number;
    processingFee: number;
    gst: number;
    otherCharges: number;
    emi: number;
    totalInterest: number;
    totalRepayment: number;
    totalCharges: number;
    netDisbursement: number;
    irr: number;
    createdAt: Date;
  } | null;
  bankAccount: {
    id: string;
    holderName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    createdAt: Date;
  } | null;
  declaration: {
    id: string;
    accepted: boolean;
    acceptedAt: Date;
    termsVersion: string;
    ipAddress: string | null;
    createdAt: Date;
  } | null;
  selfie: {
    id: string;
    photoUrl: string;
    adminStatus: string;
    rejectReason: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
  } | null;
}

export interface DisbursementReceipt {
  applicationId: string;
  stage: ApplicationStage;
  referenceId: string;
  disbursedAmount: number;
  nominalAmount: number;
  tenureMonths: number;
  monthlyEmi: number;
  beneficiaryAccount: {
    holderName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  } | null;
  disbursedAt: Date;
  processedBy: string;
  message: string;
}

export class AdminService {
  /**
   * List all loan applications with filtering, search and pagination
   */
  public async listApplications(query: ListApplicationsQuery): Promise<{
    applications: ApplicationListItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const searchQuery = (query.search || query.q)?.trim();

    const where: Prisma.ApplicationWhereInput = {};

    if (query.stage) {
      where.stage = query.stage;
    }

    if (searchQuery) {
      where.OR = [
        {
          user: {
            email: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            phone: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        },
        {
          kycDetails: {
            fullName: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              emailVerified: true,
              phoneVerified: true,
            },
          },
          kycDetails: true,
          eligibilityCheck: true,
          loanTerms: true,
          selfie: true,
        },
      }),
    ]);

    const formattedList: ApplicationListItem[] = applications.map((app) => {
      const requestedAmount = app.loanTerms
        ? Number(app.loanTerms.amount)
        : app.eligibilityCheck
        ? Number(app.eligibilityCheck.requestedAmount)
        : 0;

      return {
        id: app.id,
        userId: app.userId,
        applicantName: app.kycDetails?.fullName || app.user?.email || 'N/A',
        applicantEmail: app.user?.email || null,
        applicantPhone: app.user?.phone || null,
        requestedAmount,
        tenureMonths: app.loanTerms?.tenureMonths || null,
        stage: app.stage,
        selfieStatus: app.selfie?.adminStatus || null,
        submittedAt: app.createdAt,
        updatedAt: app.updatedAt,
      };
    });

    return {
      applications: formattedList,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single application comprehensive detail payload spanning all 7 journey modules
   */
  public async getApplicationDetail(
    applicationId: string
  ): Promise<ApplicationDetailResponse> {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: true,
          },
        },
        kycDetails: true,
        eligibilityCheck: true,
        loanTerms: true,
        bankAccount: true,
        declaration: true,
        selfie: true,
      },
    });

    if (!app) {
      throw AppError.notFound('Loan application not found.');
    }

    return {
      application: {
        id: app.id,
        userId: app.userId,
        stage: app.stage,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      },
      user: {
        id: app.user.id,
        email: app.user.email,
        phone: app.user.phone,
        role: app.user.role,
        emailVerified: app.user.emailVerified,
        phoneVerified: app.user.phoneVerified,
        createdAt: app.user.createdAt,
      },
      kycDetails: app.kycDetails
        ? {
            id: app.kycDetails.id,
            fullName: app.kycDetails.fullName,
            dob: app.kycDetails.dob,
            gender: app.kycDetails.gender,
            address: app.kycDetails.address,
            idType: app.kycDetails.idType,
            idNumber: app.kycDetails.idNumber,
            idPhotoUrl: app.kycDetails.idPhotoUrl,
            createdAt: app.kycDetails.createdAt,
          }
        : null,
      eligibilityCheck: app.eligibilityCheck
        ? {
            id: app.eligibilityCheck.id,
            income: Number(app.eligibilityCheck.income),
            requestedAmount: Number(app.eligibilityCheck.requestedAmount),
            creditScore: app.eligibilityCheck.creditScore,
            existingDebts: Number(app.eligibilityCheck.existingDebts),
            employerName: app.eligibilityCheck.employerName,
            designation: app.eligibilityCheck.designation,
            dtiRatio: Number(app.eligibilityCheck.dtiRatio),
            result: app.eligibilityCheck.result,
            maxApprovedAmount: Number(app.eligibilityCheck.maxApprovedAmount),
            createdAt: app.eligibilityCheck.createdAt,
          }
        : null,
      loanTerms: app.loanTerms
        ? {
            id: app.loanTerms.id,
            amount: Number(app.loanTerms.amount),
            tenureMonths: app.loanTerms.tenureMonths,
            interestRate: Number(app.loanTerms.interestRate),
            processingFee: Number(app.loanTerms.processingFee),
            gst: Number(app.loanTerms.gst),
            otherCharges: Number(app.loanTerms.otherCharges),
            emi: Number(app.loanTerms.emi),
            totalInterest: Number(app.loanTerms.totalInterest),
            totalRepayment: Number(app.loanTerms.totalRepayment),
            totalCharges: Number(app.loanTerms.totalCharges),
            netDisbursement: Number(app.loanTerms.netDisbursement),
            irr: Number(app.loanTerms.irr),
            createdAt: app.loanTerms.createdAt,
          }
        : null,
      bankAccount: app.bankAccount
        ? {
            id: app.bankAccount.id,
            holderName: app.bankAccount.holderName,
            accountNumber: app.bankAccount.accountNumber,
            ifsc: app.bankAccount.ifsc,
            bankName: app.bankAccount.bankName,
            createdAt: app.bankAccount.createdAt,
          }
        : null,
      declaration: app.declaration
        ? {
            id: app.declaration.id,
            accepted: Boolean(app.declaration.acceptedAt),
            acceptedAt: app.declaration.acceptedAt,
            termsVersion: app.declaration.termsVersion,
            ipAddress: app.declaration.ipAddress,
            createdAt: app.declaration.createdAt,
          }
        : null,
      selfie: app.selfie
        ? {
            id: app.selfie.id,
            photoUrl: app.selfie.photoUrl,
            adminStatus: app.selfie.adminStatus,
            rejectReason: app.selfie.rejectReason,
            reviewedBy: app.selfie.reviewedBy,
            reviewedAt: app.selfie.reviewedAt,
            createdAt: app.selfie.createdAt,
          }
        : null,
    };
  }

  /**
   * Approve or reject applicant's verification selfie
   */
  public async reviewSelfie(
    applicationId: string,
    adminUserId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string
  ): Promise<{
    application: {
      id: string;
      stage: ApplicationStage;
    };
    selfie: {
      id: string;
      adminStatus: AdminReviewStatus;
      reviewedBy: string | null;
      reviewedAt: Date | null;
      rejectReason: string | null;
    };
    message: string;
  }> {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        selfie: true,
      },
    });

    if (!app) {
      throw AppError.notFound('Loan application not found.');
    }

    if (!app.selfie) {
      throw AppError.badRequest(
        'No verification selfie has been submitted for this application.'
      );
    }

    const reviewedAt = new Date();
    const isApproved = action === 'APPROVE';
    const targetStatus = isApproved
      ? AdminReviewStatus.APPROVED
      : AdminReviewStatus.REJECTED;
    const targetStage = isApproved
      ? ApplicationStage.APPROVED
      : ApplicationStage.REJECTED;

    const { updatedApp, updatedSelfie } = await prisma.$transaction(
      async (tx) => {
        const selfie = await tx.selfie.update({
          where: { id: app.selfie!.id },
          data: {
            adminStatus: targetStatus,
            reviewedBy: adminUserId,
            reviewedAt,
            rejectReason: isApproved
              ? null
              : reason || 'Document or photo verification failed',
          },
        });

        const application = await tx.application.update({
          where: { id: applicationId },
          data: {
            stage: targetStage,
          },
        });

        return { updatedApp: application, updatedSelfie: selfie };
      }
    );

    // Send asynchronous status update email to borrower if email exists
    if (app.user.email) {
      const subject = isApproved
        ? 'EZFinanz - Loan Application Approved'
        : 'EZFinanz - Loan Application Update';
      const body = isApproved
        ? `Congratulations! Your verification selfie and loan application #${app.id.substring(
            0,
            8
          )} have been approved. Your disbursement will be initiated shortly.`
        : `Your loan application #${app.id.substring(
            0,
            8
          )} could not be approved. Reason: ${
            reason || 'Photo verification criteria was not met.'
          }`;

      await emailService
        .sendEmail({
          to: app.user.email,
          subject,
          html: `<div style="font-family: sans-serif; padding: 16px;"><h2>${subject}</h2><p>${body}</p></div>`,
        })
        .catch(() => {
          // Gracefully suppress email transport errors in test/demo mode
        });
    }

    const message = isApproved
      ? 'Verification selfie approved successfully. Application advanced to APPROVED stage.'
      : `Verification selfie rejected. Application updated to REJECTED stage.`;

    return {
      application: {
        id: updatedApp.id,
        stage: updatedApp.stage,
      },
      selfie: {
        id: updatedSelfie.id,
        adminStatus: updatedSelfie.adminStatus,
        reviewedBy: updatedSelfie.reviewedBy,
        reviewedAt: updatedSelfie.reviewedAt,
        rejectReason: updatedSelfie.rejectReason,
      },
      message,
    };
  }

  /**
   * Execute loan disbursement for an approved application
   */
  public async disburseLoan(
    applicationId: string,
    adminUserId: string,
    input?: DisburseLoanInput
  ): Promise<DisbursementReceipt> {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        loanTerms: true,
        bankAccount: true,
        selfie: true,
      },
    });

    if (!app) {
      throw AppError.notFound('Loan application not found.');
    }

    if (
      app.stage !== ApplicationStage.APPROVED ||
      app.selfie?.adminStatus !== AdminReviewStatus.APPROVED
    ) {
      throw AppError.badRequest(
        `Loan disbursement cannot be confirmed. Application must be in APPROVED stage with an approved selfie. Current stage: ${app.stage}, Selfie Status: ${app.selfie?.adminStatus || 'NONE'}.`
      );
    }

    if (!app.bankAccount || !app.loanTerms) {
      throw AppError.badRequest(
        'Cannot disburse loan: Bank account details or confirmed loan terms are missing.'
      );
    }

    const referenceId =
      input?.referenceId ||
      `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const updatedApp = await prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: ApplicationStage.DISBURSED,
      },
    });

    const netDisbursed = Number(
      app.loanTerms.netDisbursement || app.loanTerms.amount
    );

    // Send disbursement confirmation email
    if (app.user.email) {
      await emailService
        .sendEmail({
          to: app.user.email,
          subject: 'EZFinanz - Loan Disbursed Successfully',
          html: `
          <div style="font-family: sans-serif; padding: 16px;">
            <h2>Loan Disbursed!</h2>
            <p>We are pleased to inform you that ₹${netDisbursed.toLocaleString(
              'en-IN'
            )} has been disbursed to your linked bank account (${app.bankAccount.bankName} - A/C ending in ${app.bankAccount.accountNumber.slice(
            -4
          )}).</p>
            <p><strong>Transaction Reference ID:</strong> ${referenceId}</p>
          </div>
        `,
        })
        .catch(() => {});
    }

    return {
      applicationId: updatedApp.id,
      stage: updatedApp.stage,
      referenceId,
      disbursedAmount: netDisbursed,
      nominalAmount: Number(app.loanTerms.amount),
      tenureMonths: app.loanTerms.tenureMonths,
      monthlyEmi: Number(app.loanTerms.emi),
      beneficiaryAccount: {
        holderName: app.bankAccount.holderName,
        accountNumber: app.bankAccount.accountNumber,
        ifsc: app.bankAccount.ifsc,
        bankName: app.bankAccount.bankName,
      },
      disbursedAt: new Date(),
      processedBy: adminUserId,
      message:
        'Loan disbursed successfully. Application marked as DISBURSED.',
    };
  }

  /**
   * Get operational statistics for admin dashboard
   */
  public async getDashboardStats(): Promise<{
    totalApplications: number;
    pendingReviewCount: number;
    approvedCount: number;
    rejectedCount: number;
    disbursedCount: number;
    stageBreakdown: Record<string, number>;
  }> {
    const [totalApplications, pendingReviewCount, stageGroups] =
      await Promise.all([
        prisma.application.count(),
        prisma.application.count({
          where: { stage: ApplicationStage.WAITING_ADMIN_REVIEW },
        }),
        prisma.application.groupBy({
          by: ['stage'],
          _count: { stage: true },
        }),
      ]);

    const stageBreakdown: Record<string, number> = {};
    for (const group of stageGroups) {
      stageBreakdown[group.stage] = group._count.stage;
    }

    return {
      totalApplications,
      pendingReviewCount,
      approvedCount: stageBreakdown[ApplicationStage.APPROVED] || 0,
      rejectedCount: stageBreakdown[ApplicationStage.REJECTED] || 0,
      disbursedCount: stageBreakdown[ApplicationStage.DISBURSED] || 0,
      stageBreakdown,
    };
  }
}

export const adminService = new AdminService();
