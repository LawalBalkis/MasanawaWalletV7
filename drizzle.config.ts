import { defineConfig } from 'drizzle-kit'

// Portable database tooling. Point DATABASE_URL at ANY Postgres instance
// (Neon, Supabase, RDS, local docker, ...) and run:
//   pnpm db:migrate   — apply the committed migrations in /drizzle
//   pnpm db:generate  — regenerate migrations after editing lib/db/schema.ts
export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
