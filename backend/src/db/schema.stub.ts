/**
 * Optional Drizzle schema stub — architecture ready for PostgreSQL.
 * This POC does NOT persist API keys or Cursor responses by default.
 *
 * To enable later:
 * 1. Set DATABASE_URL in .env
 * 2. npm install drizzle-orm pg
 * 3. Wire a DrizzleModule and persist only non-sensitive discovery summaries
 */

// import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
//
// export const discoveryRuns = pgTable('discovery_runs', {
//   id: serial('id').primaryKey(),
//   createdAt: timestamp('created_at').defaultNow(),
//   summary: jsonb('summary'),
//   notes: text('notes'),
// });

export const DRIZZLE_READY = false;
