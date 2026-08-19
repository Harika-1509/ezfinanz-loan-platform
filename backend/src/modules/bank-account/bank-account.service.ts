import { ApplicationStage, BankAccount, Application } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { BankAccountInput } from './bank-account.schema';

export interface BankAccountResponse {
  bankAccount: BankAccount;
  application: Application;
  message: string;
}

export class BankAccountService {
  /**
   * Add or update disbursement bank account and advance application stage to BANK_ADDED
   */
  public async addBankAccount(
    userId: string,
    input: BankAccountInput
  ): Promise<BankAccountResponse> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        loanTerms: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    if (!application.loanTerms) {
      throw AppError.badRequest(
        'Loan terms must be confirmed before adding a bank account for disbursement.'
      );
    }

    const { savedAccount, updatedApp } = await prisma.$transaction(
      async (tx) => {
        const bank = await tx.bankAccount.upsert({
          where: { applicationId: application.id },
          create: {
            applicationId: application.id,
            holderName: input.holderName,
            accountNumber: input.accountNumber,
            ifsc: input.ifsc,
            bankName: input.bankName,
          },
          update: {
            holderName: input.holderName,
            accountNumber: input.accountNumber,
            ifsc: input.ifsc,
            bankName: input.bankName,
          },
        });

        const app = await tx.application.update({
          where: { id: application.id },
          data: { stage: ApplicationStage.BANK_ADDED },
        });

        return { savedAccount: bank, updatedApp: app };
      }
    );

    return {
      bankAccount: savedAccount,
      application: updatedApp,
      message:
        'Bank account details linked successfully. Stage advanced to BANK_ADDED.',
    };
  }

  /**
   * Retrieve linked bank account details for active application
   */
  public async getBankAccount(userId: string): Promise<{
    application: Application;
    bankAccount: BankAccount | null;
  }> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        bankAccount: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    return {
      application,
      bankAccount: application.bankAccount,
    };
  }
}

export const bankAccountService = new BankAccountService();
