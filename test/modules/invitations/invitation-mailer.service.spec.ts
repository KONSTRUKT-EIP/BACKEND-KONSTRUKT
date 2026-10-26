import { InvitationMailerService } from '../../../src/modules/invitations/invitation-mailer.service';

const emailData = {
  inviterName: 'Marie Dupont',
  organizationName: 'Konstrukt',
  siteName: 'Site A',
  role: 'COLLABORATEUR',
  invitationLink: 'http://localhost/invite/token',
  expirationHours: 48,
};

describe('InvitationMailerService', () => {
  const originalEnv = process.env;
  let service: InvitationMailerService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    service = new InvitationMailerService();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('simulates email delivery with the console provider', async () => {
    process.env.MAIL_PROVIDER = 'console';

    await expect(
      service.sendInvitation('person@example.com', emailData),
    ).resolves.toBeUndefined();
  });

  it('rejects the console provider in production', async () => {
    process.env.MAIL_PROVIDER = 'console';
    process.env.NODE_ENV = 'production';

    await expect(
      service.sendInvitation('person@example.com', emailData),
    ).rejects.toThrow('cannot be used in production');
  });

  it('sends the invitation through Brevo', async () => {
    process.env.MAIL_PROVIDER = 'brevo';
    process.env.BREVO_API_KEY = 'test-api-key';
    process.env.MAIL_FROM_EMAIL = 'no-reply@konstrukt.test';
    process.env.MAIL_FROM_NAME = 'Konstrukt';
    process.env.BREVO_INVITATION_TEMPLATE_ID = '2';
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }));

    await service.sendInvitation('person@example.com', emailData);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'api-key': 'test-api-key',
          'content-type': 'application/json',
        }) as Record<string, string>,
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body: Record<string, unknown> =
      typeof request.body === 'string'
        ? (JSON.parse(request.body) as Record<string, unknown>)
        : {};
    expect(body).toMatchObject({
      to: [{ email: 'person@example.com' }],
      templateId: 2,
      params: emailData,
    });
  });

  it('rejects when Brevo rejects the request', async () => {
    process.env.MAIL_PROVIDER = 'brevo';
    process.env.BREVO_API_KEY = 'test-api-key';
    process.env.BREVO_INVITATION_TEMPLATE_ID = '2';
    process.env.MAIL_FROM_EMAIL = 'no-reply@konstrukt.test';
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 401 }));

    await expect(
      service.sendInvitation('person@example.com', emailData),
    ).rejects.toThrow('Brevo rejected the email with status 401');
  });
});
