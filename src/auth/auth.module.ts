import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthToken } from './entities/auth-token.entity.js';
import { TokenService } from './services/token.service.js';
import { MailModule } from '../mail/mail.module.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { RefreshToken } from './entities/refresh-token.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthToken, RefreshToken]),
    UsersModule,
    MailModule,
    

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],

  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtAuthGuard, RolesGuard,],
})
export class AuthModule {}