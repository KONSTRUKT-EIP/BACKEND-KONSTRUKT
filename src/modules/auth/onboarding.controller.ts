import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CreateOrganizationOnboardingDto } from './dto/create-organization-onboarding.dto';

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('organization')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Create an organization and its first administrator',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully.',
  })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  async createOrganization(@Body() dto: CreateOrganizationOnboardingDto) {
    return this.authService.createOrganizationOnboarding(dto);
  }
}
