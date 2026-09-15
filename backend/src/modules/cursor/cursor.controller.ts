import { Controller, Get, Query } from '@nestjs/common';
import { CursorService } from './cursor.service';

@Controller('cursor')
export class CursorController {
  constructor(private readonly cursorService: CursorService) {}

  @Get('discovery')
  discovery() {
    return this.cursorService.discover();
  }

  @Get('account')
  account() {
    return this.cursorService.getAccount();
  }

  @Get('usage')
  usage() {
    return this.cursorService.getUsage();
  }

  @Get('spending')
  spending() {
    return this.cursorService.getSpending();
  }

  @Get('usage/history')
  usageHistory() {
    return this.cursorService.getUsageHistory();
  }

  @Get('dashboard')
  dashboard() {
    return this.cursorService.getDashboard();
  }

  @Get('debug')
  debug() {
    return this.cursorService.getDebugInspections();
  }

  @Get('debug/inspect')
  inspect(
    @Query('endpoint') endpoint: string,
    @Query('method') method?: 'GET' | 'POST',
  ) {
    if (!endpoint) {
      return {
        error: 'Query param "endpoint" is required (e.g. /v1/me)',
      };
    }
    return this.cursorService.inspectEndpoint(endpoint, method ?? 'GET');
  }
}
