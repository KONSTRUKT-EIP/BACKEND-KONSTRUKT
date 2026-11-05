import { Injectable, Logger } from '@nestjs/common';

type BrevoEmailPayload = {
  sender?: { name: string; email: string };
  to: [{ email: string }];
  templateId: number;
  params: {
    inviterName: string;
    organizationName: string;
    siteName: string;
    role: string;
    invitationLink: string;
    expirationHours: number;
  };
};

export type InvitationEmailData = {
  inviterName: string;
  organizationName: string;
  siteName: string;
  role: string;
  invitationLink: string;
  expirationHours: number;
};

@Injectable()
export class InvitationMailerService {
  private readonly logger = new Logger(InvitationMailerService.name);

  async sendInvitation(
    email: string,
    data: InvitationEmailData,
  ): Promise<void> {
    const provider = process.env.MAIL_PROVIDER ?? 'console';

    if (provider === 'console') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Console mail provider cannot be used in production; configure Brevo',
        );
      }
      this.logger.log(`[INVITATION_EMAIL] simulated recipient=${email}`);
      return;
    }

    if (provider !== 'brevo') {
      throw new Error(`Unsupported mail provider: ${provider}`);
    }

    const apiKey = process.env.BREVO_API_KEY;
    const templateId = Number(process.env.BREVO_INVITATION_TEMPLATE_ID);

    if (!apiKey || !Number.isInteger(templateId) || templateId <= 0) {
      throw new Error(
        'Brevo mail provider requires BREVO_API_KEY and a valid BREVO_INVITATION_TEMPLATE_ID',
      );
    }

    const payload: BrevoEmailPayload = {
      to: [{ email }],
      templateId,
      params: data,
    };

    let response: Response;
    try {
      response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(
        `Brevo request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Brevo rejected the email with status ${response.status}`,
      );
    }

    this.logger.log(`[INVITATION_EMAIL] sent recipient=${email}`);
  }
}
