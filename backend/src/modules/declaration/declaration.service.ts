import { ApplicationStage, Declaration, Application } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { DeclarationAcceptInput } from './declaration.schema';

export interface DeclarationDetailsResponse {
  termsVersion: string;
  applicantName: string;
  loanSummary: {
    sanctionedAmount: number;
    tenureMonths: number;
    interestRate: number;
    emi: number;
    processingFee: number;
    gst: number;
    totalCharges: number;
    netDisbursement: number;
    irr: number;
  } | null;
  disbursementBank: {
    bankName: string;
    accountNumberMasked: string;
    ifsc: string;
    holderName: string;
  } | null;
  clauses: string[];
  fullLegalText: string;
}

export interface DeclarationResponse {
  declaration: Declaration;
  application: Application;
  message: string;
}

export class DeclarationService {
  /**
   * Retrieve structured declaration text and loan agreement disclosures
   */
  public async getDeclarationText(
    userId: string
  ): Promise<DeclarationDetailsResponse> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        kycDetails: true,
        loanTerms: true,
        bankAccount: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    const applicantName =
      application.kycDetails?.fullName || 'Valued Customer';

    const loanSummary = application.loanTerms
      ? {
          sanctionedAmount: Number(application.loanTerms.amount),
          tenureMonths: application.loanTerms.tenureMonths,
          interestRate: Number(application.loanTerms.interestRate),
          emi: Number(application.loanTerms.emi),
          processingFee: Number(application.loanTerms.processingFee),
          gst: Number(application.loanTerms.gst),
          totalCharges: Number(application.loanTerms.totalCharges),
          netDisbursement: Number(application.loanTerms.netDisbursement),
          irr: Number(application.loanTerms.irr),
        }
      : null;

    const disbursementBank = application.bankAccount
      ? {
          bankName: application.bankAccount.bankName,
          accountNumberMasked: `XXXX-XXXX-${application.bankAccount.accountNumber.slice(
            -4
          )}`,
          ifsc: application.bankAccount.ifsc,
          holderName: application.bankAccount.holderName,
        }
      : null;

    const clauses = [
      '1. Truthfulness of Information: I hereby declare that all information and documentation provided by me during this application process are true, complete, and accurate.',
      '2. Purpose of Loan: The loan proceeds shall be utilized exclusively for lawful personal purposes and not for any speculative or unlawful activities.',
      '3. Repayment Commitment: I agree to repay the loan amount along with applicable interest and charges through scheduled monthly instalments (EMIs) as detailed in the sanction terms.',
      '4. Credit Bureau Authorization: I authorize EZFinanz and its financing partners to report loan repayment status, delays, and defaults to credit information companies (CIBIL, Experian, Equifax, CRIF High Mark).',
      '5. Disbursement Authorization: I authorize the net disbursement amount to be directly transferred to my validated bank account as specified in this application.',
      '6. Electronic Consent: I confirm that clicking "Accept & Confirm" constitutes a valid, legally binding electronic signature under the Information Technology Act, 2000.',
    ];

    const fullLegalText = `EZFINANZ PERSONAL LOAN DECLARATION & BORROWER UNDERTAKING\nVersion v1.0\n\nBorrower: ${applicantName}\n${
      loanSummary
        ? `Sanctioned Amount: ₹${loanSummary.sanctionedAmount.toLocaleString(
            'en-IN'
          )}\nTenure: ${loanSummary.tenureMonths} Months\nEMI: ₹${loanSummary.emi.toLocaleString(
            'en-IN'
          )}\nAnnual Interest Rate: ${loanSummary.interestRate}%\nEffective IRR: ${
            loanSummary.irr
          }%`
        : ''
    }\n\n${clauses.join('\n\n')}`;

    return {
      termsVersion: 'v1.0',
      applicantName,
      loanSummary,
      disbursementBank,
      clauses,
      fullLegalText,
    };
  }

  /**
   * Accept declaration and advance application stage to DECLARATION_CONFIRMED
   */
  public async acceptDeclaration(
    userId: string,
    input: DeclarationAcceptInput,
    ipAddress?: string
  ): Promise<DeclarationResponse> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        bankAccount: true,
        loanTerms: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    if (!application.bankAccount) {
      throw AppError.badRequest(
        'Disbursement bank account must be linked before accepting the loan declaration.'
      );
    }

    const { savedDeclaration, updatedApp } = await prisma.$transaction(
      async (tx) => {
        const decl = await tx.declaration.upsert({
          where: { applicationId: application.id },
          create: {
            applicationId: application.id,
            acceptedAt: new Date(),
            termsVersion: input.termsVersion || 'v1.0',
            ipAddress: ipAddress || null,
          },
          update: {
            acceptedAt: new Date(),
            termsVersion: input.termsVersion || 'v1.0',
            ipAddress: ipAddress || null,
          },
        });

        const app = await tx.application.update({
          where: { id: application.id },
          data: { stage: ApplicationStage.DECLARATION_CONFIRMED },
        });

        return { savedDeclaration: decl, updatedApp: app };
      }
    );

    return {
      declaration: savedDeclaration,
      application: updatedApp,
      message:
        'Loan declaration accepted successfully. Stage advanced to DECLARATION_CONFIRMED.',
    };
  }

  /**
   * Retrieve active declaration status for application
   */
  public async getDeclarationStatus(userId: string): Promise<{
    application: Application;
    declaration: Declaration | null;
  }> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        declaration: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    return {
      application,
      declaration: application.declaration,
    };
  }
}

export const declarationService = new DeclarationService();
