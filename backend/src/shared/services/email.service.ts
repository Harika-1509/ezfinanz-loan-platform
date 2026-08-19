/**
 * MOCK EMAIL SERVICE
 *
 * NOTE: This is a mocked implementation for development, demonstration, and testing.
 * In a production deployment, this interface would be implemented by an SMTP/Transactional
 * email provider such as SendGrid, AWS SES, Resend, or Postmark.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SentEmailRecord {
  messageId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  from: string;
  sentAt: Date;
}

export interface IEmailService {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId: string }>;
  getSentEmails(recipientEmail?: string): SentEmailRecord[];
  clearSentEmails(): void;
}

export class MockEmailService implements IEmailService {
  private sentEmails: SentEmailRecord[] = [];
  private readonly defaultFrom: string = 'EZFinanz <noreply@ezfinanz.com>';

  /**
   * Simulates sending an email by storing it in memory and logging to standard output.
   */
  public async sendEmail(
    options: SendEmailOptions
  ): Promise<{ success: boolean; messageId: string }> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const record: SentEmailRecord = {
      messageId,
      to: options.to.trim().toLowerCase(),
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
      from: options.from || this.defaultFrom,
      sentAt: new Date(),
    };

    this.sentEmails.push(record);

    console.log(`
    📧 [MockEmailService] =====================================
    To:      ${record.to}
    From:    ${record.from}
    Subject: ${record.subject}
    Msg ID:  ${record.messageId}
    Time:    ${record.sentAt.toISOString()}
    ----------------------------------------------------------
    ${(record.text || '').slice(0, 180)}...
    ==========================================================
    `);

    return {
      success: true,
      messageId,
    };
  }

  /**
   * Retrieve sent emails, optionally filtered by recipient (useful for tests or demo inspection)
   */
  public getSentEmails(recipientEmail?: string): SentEmailRecord[] {
    if (!recipientEmail) {
      return [...this.sentEmails];
    }
    const filter = recipientEmail.trim().toLowerCase();
    return this.sentEmails.filter((email) => email.to === filter);
  }

  /**
   * Clear in-memory email records
   */
  public clearSentEmails(): void {
    this.sentEmails = [];
  }
}

export const emailService: IEmailService = new MockEmailService();
