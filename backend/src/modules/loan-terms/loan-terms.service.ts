import { ApplicationStage, EligibilityResult, LoanTerms, Application } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import {
  calculateLoanTerms,
  DEFAULT_RATE_CONFIG,
  LoanTermsCalculationResult,
} from './loan-terms.calculator';
import {
  LoanTermsCalculateInput,
  LoanTermsConfirmInput,
  ALLOWED_TENURES,
} from './loan-terms.schema';

export interface LoanTermsResponse {
  loanTerms: LoanTerms;
  breakdown: LoanTermsCalculationResult;
  application: Application;
  message: string;
}

export class LoanTermsService {
  /**
   * Idempotently calculate and save draft loan terms without advancing application stage
   */
  public async calculateTerms(
    userId: string,
    input: LoanTermsCalculateInput
  ): Promise<LoanTermsResponse> {
    const { application } = await this.validateEligibility(
      userId,
      input.amount
    );

    const breakdown = calculateLoanTerms({
      amount: input.amount,
      tenureMonths: input.tenureMonths,
    });

    const savedTerms = await prisma.loanTerms.upsert({
      where: { applicationId: application.id },
      create: {
        applicationId: application.id,
        amount: breakdown.amount,
        tenureMonths: breakdown.tenureMonths,
        interestRate: breakdown.interestRate,
        processingFee: breakdown.processingFee,
        gst: breakdown.gst,
        otherCharges: breakdown.otherCharges,
        emi: breakdown.emi,
        totalInterest: breakdown.totalInterest,
        totalRepayment: breakdown.totalRepayment,
        totalCharges: breakdown.totalCharges,
        netDisbursement: breakdown.netDisbursement,
        irr: breakdown.irr,
      },
      update: {
        amount: breakdown.amount,
        tenureMonths: breakdown.tenureMonths,
        interestRate: breakdown.interestRate,
        processingFee: breakdown.processingFee,
        gst: breakdown.gst,
        otherCharges: breakdown.otherCharges,
        emi: breakdown.emi,
        totalInterest: breakdown.totalInterest,
        totalRepayment: breakdown.totalRepayment,
        totalCharges: breakdown.totalCharges,
        netDisbursement: breakdown.netDisbursement,
        irr: breakdown.irr,
      },
    });

    return {
      loanTerms: savedTerms,
      breakdown,
      application,
      message: 'Loan terms calculated successfully.',
    };
  }

  /**
   * Confirm selected loan terms and advance application stage to EMI_SELECTED
   */
  public async confirmTerms(
    userId: string,
    input: LoanTermsConfirmInput
  ): Promise<LoanTermsResponse> {
    const { application } = await this.validateEligibility(
      userId,
      input.amount
    );

    const breakdown = calculateLoanTerms({
      amount: input.amount,
      tenureMonths: input.tenureMonths,
    });

    const [savedTerms, updatedApp] = await prisma.$transaction([
      prisma.loanTerms.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          amount: breakdown.amount,
          tenureMonths: breakdown.tenureMonths,
          interestRate: breakdown.interestRate,
          processingFee: breakdown.processingFee,
          gst: breakdown.gst,
          otherCharges: breakdown.otherCharges,
          emi: breakdown.emi,
          totalInterest: breakdown.totalInterest,
          totalRepayment: breakdown.totalRepayment,
          totalCharges: breakdown.totalCharges,
          netDisbursement: breakdown.netDisbursement,
          irr: breakdown.irr,
        },
        update: {
          amount: breakdown.amount,
          tenureMonths: breakdown.tenureMonths,
          interestRate: breakdown.interestRate,
          processingFee: breakdown.processingFee,
          gst: breakdown.gst,
          otherCharges: breakdown.otherCharges,
          emi: breakdown.emi,
          totalInterest: breakdown.totalInterest,
          totalRepayment: breakdown.totalRepayment,
          totalCharges: breakdown.totalCharges,
          netDisbursement: breakdown.netDisbursement,
          irr: breakdown.irr,
        },
      }),
      prisma.application.update({
        where: { id: application.id },
        data: { stage: ApplicationStage.EMI_SELECTED },
      }),
    ]);

    return {
      loanTerms: savedTerms,
      breakdown,
      application: updatedApp,
      message: 'Loan terms confirmed successfully. Stage advanced to EMI_SELECTED.',
    };
  }

  /**
   * Get available tenure options, interest rates, and borrower's borrowing ceiling
   */
  public async getAvailableOptions(userId: string): Promise<{
    allowedTenures: readonly number[];
    rateMatrix: typeof DEFAULT_RATE_CONFIG;
    maxApprovedAmount: number;
    currentTerms: LoanTerms | null;
  }> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        eligibilityCheck: true,
        loanTerms: true,
      },
    });

    if (!application || !application.eligibilityCheck) {
      throw AppError.badRequest(
        'Eligibility check must be completed before viewing loan options.'
      );
    }

    const maxApprovedAmount = Number(
      application.eligibilityCheck.maxApprovedAmount ??
        application.eligibilityCheck.requestedAmount
    );

    return {
      allowedTenures: ALLOWED_TENURES,
      rateMatrix: DEFAULT_RATE_CONFIG,
      maxApprovedAmount,
      currentTerms: application.loanTerms,
    };
  }

  /**
   * Get currently persisted loan terms for the application
   */
  public async getTermsStatus(userId: string): Promise<{
    application: Application;
    loanTerms: LoanTerms | null;
  }> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        loanTerms: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No loan application found.');
    }

    return {
      application,
      loanTerms: application.loanTerms,
    };
  }

  /**
   * Private helper: validate active application and eligibility pre-conditions
   */
  private async validateEligibility(userId: string, requestedAmount: number) {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        eligibilityCheck: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    if (!application.eligibilityCheck) {
      throw AppError.badRequest(
        'Eligibility check must be performed before configuring loan terms.'
      );
    }

    const { result, maxApprovedAmount } = application.eligibilityCheck;

    if (result === EligibilityResult.NOT_ELIGIBLE) {
      throw AppError.forbidden(
        'Loan terms selection is not available because the application was evaluated as NOT_ELIGIBLE.'
      );
    }

    const maxLimit = Number(
      maxApprovedAmount ?? application.eligibilityCheck.requestedAmount
    );

    if (requestedAmount > maxLimit) {
      throw AppError.badRequest(
        `Requested loan amount of ₹${requestedAmount.toLocaleString(
          'en-IN'
        )} exceeds the maximum approved limit of ₹${maxLimit.toLocaleString('en-IN')}.`
      );
    }

    return { application, maxLimit };
  }
}

export const loanTermsService = new LoanTermsService();
