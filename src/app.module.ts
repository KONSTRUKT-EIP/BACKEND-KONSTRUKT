import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './lib/prisma/prisma.module';
import { UserModule } from './modules/users/user.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { WeatherModule } from './modules/weather/weather.module';
import { SiteModule } from './modules/sites/site.module';
import { OrganizationModule } from './modules/organizations/organization.module';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'Konstrukt API is running',
      documentation: '/api',
      version: '1.0',
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    UserModule,
    AuthModule,
    DashboardModule,
    WeatherModule,
    SiteModule,
    OrganizationModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
