import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './lib/prisma/prisma.module';
import { UserModule } from './modules/users/user.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { WeatherModule } from './modules/weather/weather.module';
import { SiteModule } from './modules/sites/site.module';

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
    PrismaModule,
    UserModule,
    AuthModule,
    DashboardModule,
    WeatherModule,
    SiteModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
