import { describe, it, expect, beforeEach } from 'vitest';
import { emailService } from '../email.service';

describe('EmailService', () => {
  beforeEach(() => {
    emailService.clearSentEmails();
  });

  it('should send an email and return a messageId', async () => {
    const result = await emailService.sendEmail({
      to: 'customer@example.com',
      subject: 'Loan Application Approved',
      html: '<h1>Congratulations!</h1><p>Your loan has been sanctioned.</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should retrieve sent emails filtered by recipient', async () => {
    await emailService.sendEmail({
      to: 'aarav@example.com',
      subject: 'Email Verification OTP',
      html: '<p>Your OTP is 482910</p>',
    });

    await emailService.sendEmail({
      to: 'priya@example.com',
      subject: 'KYC Document Received',
      html: '<p>We have received your PAN card.</p>',
    });

    const aaravEmails = emailService.getSentEmails('aarav@example.com');
    expect(aaravEmails).toHaveLength(1);
    expect(aaravEmails[0].subject).toBe('Email Verification OTP');

    const allEmails = emailService.getSentEmails();
    expect(allEmails).toHaveLength(2);
  });

  it('should clear stored emails', async () => {
    await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Welcome to EZFinanz',
      html: '<p>Welcome!</p>',
    });

    expect(emailService.getSentEmails()).toHaveLength(1);
    emailService.clearSentEmails();
    expect(emailService.getSentEmails()).toHaveLength(0);
  });

  it('should mask email addresses appropriately for privacy', () => {
    expect(emailService.maskEmail('john.doe@example.com')).toBe('j***e@example.com');
    expect(emailService.maskEmail('al@test.com')).toBe('a*@test.com');
  });
});
