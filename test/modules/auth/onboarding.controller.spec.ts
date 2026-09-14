import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingController } from '../../../src/modules/auth/onboarding.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';

describe('OnboardingController', () => {
  let controller: OnboardingController;

  const mockTokens = {
    access_token: 'signed-jwt-token',
    refresh_token: 'random-refresh-token',
  };

  const mockAuthService = {
    createOrganizationOnboarding: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthService.createOrganizationOnboarding.mockResolvedValue(mockTokens);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<OnboardingController>(OnboardingController);
  });

  it('should forward the onboarding payload and return tokens', async () => {
    const dto = {
      organizationName: 'Konstrukt BTP',
      plan: 'FREE',
      email: 'owner@example.com',
      password: 'Password1!',
      firstName: 'John',
      lastName: 'Doe',
    };

    const result = await controller.createOrganization(dto);

    expect(mockAuthService.createOrganizationOnboarding).toHaveBeenCalledWith(
      dto,
    );
    expect(result).toEqual(mockTokens);
  });
});
