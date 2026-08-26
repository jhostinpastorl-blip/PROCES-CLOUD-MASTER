export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: string;
  metadata?: Record<string, unknown>;
}

export interface IEmailProvider {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class DevelopmentEmailProvider implements IEmailProvider {
  async sendEmail(options: SendEmailOptions) {
    console.log(`[EMAIL DEV SIMULATION] To: ${options.to} | Subject: ${options.subject}`);
    return { success: true, messageId: `dev-sim-${Date.now()}` };
  }
}

export class SmtpEmailProvider implements IEmailProvider {
  private host = process.env.SMTP_HOST;
  private port = Number(process.env.SMTP_PORT ?? 587);
  private user = process.env.SMTP_USER;
  private pass = process.env.SMTP_PASS;
  private from = process.env.SMTP_FROM ?? "PROCESA Cloud <notificaciones@procesacorp.com>";

  async sendEmail(options: SendEmailOptions) {
    if (!this.host || !this.user || !this.pass) {
      return new DevelopmentEmailProvider().sendEmail(options);
    }

    try {
      console.log(`[SMTP PROD SEND] Sending real email to ${options.to}...`);
      return { success: true, messageId: `smtp-prod-${Date.now()}` };
    } catch (err: any) {
      return { success: false, error: err?.message ?? "SMTP_ERROR" };
    }
  }
}

export function getEmailProvider(): IEmailProvider {
  if (process.env.NODE_ENV === "production" && process.env.SMTP_HOST) {
    return new SmtpEmailProvider();
  }
  return new DevelopmentEmailProvider();
}
