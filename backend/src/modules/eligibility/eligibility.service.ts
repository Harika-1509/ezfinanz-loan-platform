import { ApplicationStage, EligibilityCheck, Application } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { creditBureauService } from '../../shared/services/credit-bureau.service';
import {
  calculateEligibility,
  EligibilityCalculationResult,
} from './eligibility.calculator';
import { EligibilityCheckInput } from './eligibility.schema';

export interface EligibilityEvaluationResult {
  eligibilityCheck: EligibilityCheck;
  calculation: EligibilityCalculationResult;
  application: Application;
  message: string;
}

export class EligibilityService {
  /**
   * Evaluate and persist loan eligibility assessment for an active application
   */
  public async evaluateEligibility(
    userId: string,
    input: EligibilityCheckInput
  ): Promise<EligibilityEvaluationResult> {
    // 1. Fetch active application with KYC details
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        kycDetails: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    if (!application.kycDetails) {
      throw AppError.forbidden(
        'KYC details must be submitted before checking loan eligibility.'
      );
    }

    // 2. Resolve Credit Score (use provided or fetch from mock bureau via PAN/ID)
    let creditScore = input.creditScore;
    if (!creditScore) {
      const bureauReport = await creditBureauService.fetchCreditReport({
        idNumber: application.kycDetails.idNumber,
        fullName: application.kycDetails.fullName,
        monthlyIncome: input.income,
        requestedAmount: input.requestedAmount,
        existingDebts: input.existingDebts,
      });
      creditScore = bureauReport.cibilScore;
    }

    // 3. Execute Pure Calculation Engine
    const calculation = calculateEligibility({
      income: input.income,
      requestedAmount: input.requestedAmount,
      creditScore,
      existingDebts: input.existingDebts,
      employerName: input.employerName,
      designation: input.designation,
    });

    // 4. Atomically persist eligibility check and advance stage to ELIGIBILITY_CHECKED
    const [savedCheck, updatedApp] = await prisma.$transaction([
      prisma.eligibilityCheck.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          income: input.income,
          requestedAmount: input.requestedAmount,
          creditScore: creditScore!,
          existingDebts: input.existingDebts,
          employerName: input.employerName.trim(),
          designation: input.designation.trim(),
          dtiRatio: calculation.dtiRatio,
          result: calculation.result,
          maxApprovedAmount: calculation.maxApprovedAmount,
        },
        update: {
          income: input.income,
          requestedAmount: input.requestedAmount,
          creditScore: creditScore!,
          existingDebts: input.existingDebts,
          employerName: input.employerName.trim(),
          designation: input.designation.trim(),
          dtiRatio: calculation.dtiRatio,
          result: calculation.result,
          maxApprovedAmount: calculation.maxApprovedAmount,
        },
      }),
      prisma.application.update({
        where: { id: application.id },
        data: { stage: ApplicationStage.ELIGIBILITY_CHECKED },
      }),
    ]);

    return {
      eligibilityCheck: savedCheck,
      calculation,
      application: updatedApp,
      message: `Eligibility evaluated successfully: ${calculation.result}`,
    };
  }

  /**
   * Get current eligibility assessment status for the user
   */
  public async getEligibilityStatus(userId: string): Promise<{
    application: Application;
    eligibilityCheck: EligibilityCheck | null;
    calculation?: EligibilityCalculationResult | null;
  }> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        eligibilityCheck: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No loan application found.');
    }

    let calculation: EligibilityCalculationResult | null = null;
    if (application.eligibilityCheck) {
      const check = application.eligibilityCheck;
      calculation = calculateEligibility({
        income: Number(check.income),
        requestedAmount: Number(check.requestedAmount),
        creditScore: check.creditScore,
        existingDebts: Number(check.existingDebts),
        employerName: check.employerName,
        designation: check.designation,
      });
    }

    return {
      application,
      eligibilityCheck: application.eligibilityCheck,
      calculation,
    };
  }
}

export const eligibilityService = new EligibilityService();
