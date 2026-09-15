import { Module } from '@nestjs/common';
import { CursorClient } from './cursor.client';
import { CursorController } from './cursor.controller';
import { CursorService } from './cursor.service';

@Module({
  controllers: [CursorController],
  providers: [CursorClient, CursorService],
  exports: [CursorService, CursorClient],
})
export class CursorModule {}
