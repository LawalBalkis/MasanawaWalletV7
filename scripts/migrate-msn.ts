/**
 * Phase 2 — One-shot NGN→MSN balance migration.
 *
 * For every user who has historical NGN transaction rows but no existing
 * `convert` row, this script computes their net NGN balance from those rows
 * and writes a single `convert` ledger row crediting that amount as MSN
 * (1 MSN = ₦1, so the amount is identical).
 *
 * Idempotent: users who already have a `convert` row are skipped, so the
 * script can be run multiple times safely.
 *
 * Usage:  npx tsx scripts/migrate-msn.ts
 */
import postgres from 'postgres'

const DATABASE_URL =
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DB_URL ??
  `postgresql://postgres.${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}:${process.env.SUPABASE_DB_PASSWORD ?? ''}@db.${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}.supabase.co:5432/postgres`

if (!DATABASE_URL) {
  console.error('Missing SUPABASE_DB_URL or DATABASE_URL env var')
  process.exit(1)
}

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1 })

  // Find users who have historical NGN rows but no convert row yet.
  const candidates = await sql`
    SELECT t.user_id,
           COALESCE(SUM(CASE WHEN t.type IN ('fund','receive') THEN t.amount
                             WHEN t.type IN ('withdraw','buy','send') THEN t.amount
                             ELSE t.amount END), 0) AS ngn_balance
    FROM transactions t
    WHERE t.asset = 'NGN'
      AND t.status = 'completed'
      AND t.user_id NOT IN (
        SELECT user_id FROM transactions WHERE type = 'convert'
      )
    GROUP BY t.user_id
  `

  if (candidates.length === 0) {
    console.log('No users need migration. All done.')
    await sql.end()
    return
  }

  console.log(`Found ${candidates.length} user(s) to migrate.`)

  for (const row of candidates) {
    const userId = row.user_id as string
    const ngnBalance = Number(row.ngn_balance)

    if (ngnBalance <= 0) {
      console.log(`  ${userId}: NGN balance ${ngnBalance} — skipping (zero or negative)`)
      continue
    }

    const txId = `convert-${userId}-${Date.now()}`
    await sql`
      INSERT INTO transactions (id, user_id, type, asset, amount, ngn_value, fee_ngn, status, note)
      VALUES (${txId}, ${userId}, 'convert', 'MSN', ${ngnBalance}, ${ngnBalance}, 0, 'completed',
              'One-time NGN→MSN migration (1 MSN = ₦1)')
    `
    console.log(`  ${userId}: migrated ₦${ngnBalance.toFixed(2)} → ${ngnBalance.toFixed(2)} MSN`)
  }

  console.log('Migration complete.')
  await sql.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
