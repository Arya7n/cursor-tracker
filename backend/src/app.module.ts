import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CursorModule } from './modules/cursor/cursor.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    CursorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
