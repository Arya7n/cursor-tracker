import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CursorClientResponse,
  CursorHttpMethod,
} from './cursor.types';
import { sanitizeHeaders } from './cursor.redact';

/**
 * CursorClient — ONLY responsible for HTTP communication with api.cursor.com.
 * Does not normalize business data.
 */
@Injectable()
export class CursorClient implements OnModuleInit {
  private readonly logger = new Logger(CursorClient.name);
  private baseUrl = 'https://api.cursor.com';
  private apiKey = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.baseUrl = (
      this.config.get<string>('CURSOR_API_BASE_URL') || 'https://api.cursor.com'
    ).replace(/\/$/, '');
    this.apiKey = (this.config.get<string>('CURSOR_API_KEY') || '').trim();

    if (!this.apiKey) {
      this.logger.warn(
        'CURSOR_API_KEY is not set. Discovery probes will fail authentication until configured.',
      );
    } else {
      this.logger.log(
        `Cursor client ready (base URL: ${this.baseUrl}, key: [REDACTED])`,
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Perform an authenticated request against the Cursor API.
   * Uses Basic auth with API key as username and empty password (documented).
   */
  async request(
    method: CursorHttpMethod,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | number | undefined>;
      timeoutMs?: number;
    },
  ): Promise<CursorClientResponse> {
    const url = this.buildUrl(path, options?.query);
    const started = Date.now();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: this.buildBasicAuthHeader(),
    };

    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options?.timeoutMs ?? 30_000,
    );

    try {
      const response = await fetch(url, {
        method,
        headers,
        body:
          options?.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
        signal: controller.signal,
      });

      const rawText = await response.text();
      let body: unknown = rawText;
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch {
          body = rawText;
        }
      } else {
        body = null;
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        ok: response.ok,
        responseTimeMs: Date.now() - started,
        headers: sanitizeHeaders(responseHeaders),
        body,
        rawText,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown network error';
      this.logger.error(`Cursor request failed for ${method} ${path}: ${message}`);
      return {
        status: 0,
        ok: false,
        responseTimeMs: Date.now() - started,
        headers: {},
        body: { error: message },
        rawText: message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalized}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private buildBasicAuthHeader(): string {
    // Documented: Basic base64(API_KEY:) — empty password
    const token = Buffer.from(`${this.apiKey}:`, 'utf8').toString('base64');
    return `Basic ${token}`;
  }
}
