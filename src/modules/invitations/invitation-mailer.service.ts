import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InvitationMailerService {
  private readonly logger = new Logger(InvitationMailerService.name);

  sendInvitation(email: string, link: string) {
    this.logger.log(`[INVITATION_EMAIL] recipient=${email} link=${link}`);
  }
}
