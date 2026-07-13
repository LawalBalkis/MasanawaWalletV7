// Lazy Drizzle client. Only instantiated when DATABASE_URL is set — the app
// runs fully on the in-memory store without it (see lib/wallet/store.ts).
import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Db = ReturnType<typeof createDb>

let _db: Db | null = null

function createDb(url: string) {
  const client = postgres(url, { prepare: false })
  return drizzle(client, { schema })
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export function getDb(): Db {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set — the Drizzle store requires a Postgres database.')
  }
  if (!_db) _db = createDb(url)
  return _db
}

export { schema }
