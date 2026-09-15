import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'cursor-personal-api-explorer',
      postgres: 'optional — not required for this POC',
    };
  }
}
