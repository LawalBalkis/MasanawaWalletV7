'use server'

// ---------------------------------------------------------------------------
// Money server actions: send, buy/sell, bank + crypto withdrawals.
// Every mutation verifies the PIN server-side, enforces tier limits and
// writes ledger rows through the WalletStore boundary.
// ---------------------------------------------------------------------------
import { verifyPin } from '@/lib/auth/actions'
import { generateId } from '@/lib/auth/crypto'
import { rateLimit } from '@/lib/auth/rate-limit'
import { requireUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import {
  FEES,
  NIGERIAN_BANKS,
  assetMeta,
  formatAsset,
  formatNgn,
  tradeFeeNgn,
  type AssetSymbol,
} from './assets'
import { dailyOutflowNgn } from './ledger'
import { getNgnRates } from './prices'
import { walletStore, type LedgerTx } from './store'
import { VERIFICATION_TIERS } from './tiers'

export interface MoneyResult {
  ok: boolean
  error?: string
  txId?: string
}

const VALID_ASSETS: AssetSymbol[] = ['NGN', 'USDT', 'USDC', 'BTC', 'ETH', 'SOL']

function fail(error: string): MoneyResult {
  return { ok: false, error }
}

function refreshWallet() {
  revalidatePath('/dashboard', 'layout')
}

// ---------------------------------------------------------------------------
// Lookups (no PIN required)
// ---------------------------------------------------------------------------

/** Resolve a @username to a display name (for send-flow confirmation). */
export async function resolveRecipient(
  handle: string,
): Promise<{ name: string; username: string } | null> {
  await requireUser()
  const clean = handle.trim().replace(/^@/, '').toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) return null
  const user = await walletStore.getUserByUsername(clean)
  return user ? { name: user.name, username: user.username } : null
}

/**
 * Resolve a bank account to an account name.
 * ⚠️ SWAP POINT: replace with a real name-enquiry API (e.g. Paystack/Flutterwave).
 * Demo: deterministic Nigerian names derived from the account number.
 */
export async function resolveBankAccount(
  bank: string,
  accountNumber: string,
): Promise<string | null> {
  await requireUser()
  if (!NIGERIAN_BANKS.includes(bank) || !/^\d{10}$/.test(accountNumber)) return null
  const first = ['Adaeze', 'Chinedu', 'Femi', 'Amaka', 'Tunde', 'Zainab', 'Emeka', 'Ngozi', 'Ibrahim', 'Kemi']
  const last = ['Okafor', 'Eze', 'Adeyemi', 'Nwosu', 'Bakare', 'Bello', 'Obi', 'Adebayo', 'Musa', 'Ojo']
  const a = Number(accountNumber[8]) % first.length
  const b = Number(accountNumber[9]) % last.length
  return `${first[a]} ${last[b]}`
}

// ---------------------------------------------------------------------------
// Send money to another Masanawa user by @username
// ---------------------------------------------------------------------------

export async function sendMoneyAction(input: {
  pin: string
  recipient: string
  asset: AssetSymbol
  amount: number
  note?: string
}): Promise<MoneyResult> {
  const user = await requireUser()

  const pinCheck = await verifyPin(input.pin)
  if (!pinCheck.ok) return fail(pinCheck.error ?? 'PIN verification failed.')

  if (!rateLimit(`send:${user.id}`, 20, 60 * 60_000)) {
    return fail('Too many transfers in the last hour. Please slow down.')
  }

  if (!VALID_ASSETS.includes(input.asset)) return fail('Unknown asset.')
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter a valid amount.')

  const handle = input.recipient.trim().replace(/^@/, '').toLowerCase()
  const recipient = await walletStore.getUserByUsername(handle)
  if (!recipient) return fail(`No Masanawa user found with username @${handle}.`)
  if (recipient.id === user.id) return fail('You can’t send money to yourself.')

  const balances = await walletStore.getBalances(user.id)
  if (amount > balances[input.asset]) {
    return fail(`Amount exceeds your ${input.asset} balance.`)
  }

  const rates = await getNgnRates()
  const ngnValue = Math.round(amount * rates[input.asset] * 100) / 100
  const meta = assetMeta(input.asset)
  const note = input.note?.trim().slice(0, 140) || undefined
  const date = new Date().toISOString()
  const txId = generateId('tx')

  const rows: LedgerTx[] = [
    {
      id: txId,
      userId: user.id,
      type: 'send',
      asset: input.asset,
      amount: -amount,
      ngnValue,
      feeNgn: FEES.send,
      counterparty: `@${recipient.username}`,
      note,
      status: 'completed',
      date,
    },
    {
      id: generateId('tx'),
      userId: recipient.id,
      type: 'receive',
      asset: input.asset,
      amount,
      ngnValue,
      counterparty: `@${user.username}`,
      note,
      status: 'completed',
      date,
    },
  ]
  await walletStore.addTransactions(rows)

  if (user.notifyTransactions) {
    await walletStore.addNotification({
      userId: user.id,
      title: 'Transfer sent',
      body: `You sent ${formatAsset(amount, meta)} to @${recipient.username}.`,
      txId,
    })
  }
  if (recipient.notifyTransactions) {
    await walletStore.addNotification({
      userId: recipient.id,
      title: 'Payment received',
      body: `You received ${formatAsset(amount, meta)} from @${user.username}.`,
      txId: rows[1].id,
    })
  }

  refreshWallet()
  return { ok: true, txId }
}

// ---------------------------------------------------------------------------
// Buy / sell crypto against NGN
// ---------------------------------------------------------------------------

export async function tradeAction(input: {
  pin: string
  mode: 'buy' | 'sell'
  asset: AssetSymbol
  ngnAmount: number
}): Promise<MoneyResult> {
  const user = await requireUser()

  const pinCheck = await verifyPin(input.pin)
  if (!pinCheck.ok) return fail(pinCheck.error ?? 'PIN verification failed.')

  if (!rateLimit(`trade:${user.id}`, 20, 60 * 60_000)) {
    return fail('Too many trades in the last hour. Please slow down.')
  }

  if (input.asset === 'NGN' || !VALID_ASSETS.includes(input.asset)) {
    return fail('Pick a crypto asset to trade.')
  }
  const ngn = Number(input.ngnAmount)
  if (!Number.isFinite(ngn) || ngn < 1000) return fail(`Minimum trade is ${formatNgn(1000)}.`)

  const rates = await getNgnRates()
  const rate = rates[input.asset]
  const fee = tradeFeeNgn(ngn)
  const assetAmount = ngn / rate
  const meta = assetMeta(input.asset)
  const balances = await walletStore.getBalances(user.id)

  const date = new Date().toISOString()
  const txId = generateId('tx')

  if (input.mode === 'buy') {
    const totalCost = Math.round((ngn + fee) * 100) / 100
    if (totalCost > balances.NGN) {
      return fail(`Total cost ${formatNgn(totalCost)} exceeds your naira balance.`)
    }
    await walletStore.addTransactions([
      {
        id: txId,
        userId: user.id,
        type: 'buy',
        asset: input.asset,
        amount: assetAmount,
        ngnValue: totalCost,
        feeNgn: fee,
        note: `Bought with NGN at ${formatNgn(rate)}/${input.asset}`,
        status: 'completed',
        date,
      },
    ])
    if (user.notifyTransactions) {
      await walletStore.addNotification({
        userId: user.id,
        title: 'Purchase complete',
        body: `You bought ${formatAsset(assetAmount, meta)} for ${formatNgn(totalCost)}.`,
        txId,
      })
    }
  } else {
    if (assetAmount > balances[input.asset]) {
      return fail(`You need ${formatAsset(assetAmount, meta)} but only hold ${formatAsset(balances[input.asset], meta)}.`)
    }
    const proceeds = Math.round((ngn - fee) * 100) / 100
    await walletStore.addTransactions([
      {
        id: txId,
        userId: user.id,
        type: 'sell',
        asset: input.asset,
        amount: -assetAmount,
        ngnValue: proceeds,
        feeNgn: fee,
        note: `Sold to NGN at ${formatNgn(rate)}/${input.asset}`,
        status: 'completed',
        date,
      },
    ])
    if (user.notifyTransactions) {
      await walletStore.addNotification({
        userId: user.id,
        title: 'Sale complete',
        body: `You sold ${formatAsset(assetAmount, meta)} for ${formatNgn(proceeds)}.`,
        txId,
      })
    }
  }

  refreshWallet()
  return { ok: true, txId }
}

// ---------------------------------------------------------------------------
// Withdraw NGN to a Nigerian bank account
// ---------------------------------------------------------------------------

export async function withdrawBankAction(input: {
  pin: string
  bank: string
  accountNumber: string
  amount: number
  saveBeneficiary?: boolean
}): Promise<MoneyResult> {
  const user = await requireUser()

  const pinCheck = await verifyPin(input.pin)
  if (!pinCheck.ok) return fail(pinCheck.error ?? 'PIN verification failed.')

  if (!rateLimit(`withdraw:${user.id}`, 10, 60 * 60_000)) {
    return fail('Too many withdrawals in the last hour. Please slow down.')
  }

  if (!NIGERIAN_BANKS.includes(input.bank)) return fail('Pick a supported bank.')
  if (!/^\d{10}$/.test(input.accountNumber)) return fail('Account number must be 10 digits.')
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount < 500) return fail(`Minimum withdrawal is ${formatNgn(500)}.`)

  const accountName = await resolveBankAccount(input.bank, input.accountNumber)
  if (!accountName) return fail('Could not verify that bank account. Check the details.')

  const tier = VERIFICATION_TIERS[user.tier]
  if (tier.singleWithdrawalNgn !== null && amount > tier.singleWithdrawalNgn) {
    return fail(
      `Amount exceeds your ${formatNgn(tier.singleWithdrawalNgn)} single-withdrawal limit. Upgrade your tier in Settings.`,
    )
  }

  const fee = FEES.withdrawNgn
  const totalDebit = amount + fee
  const balances = await walletStore.getBalances(user.id)
  if (totalDebit > balances.NGN) {
    return fail(`Amount plus the ${formatNgn(fee)} fee exceeds your naira balance.`)
  }

  if (tier.dailyWithdrawalNgn !== null) {
    const txs = await walletStore.listTransactions(user.id)
    const today = dailyOutflowNgn(txs, ['withdraw'], { ngnOnly: true })
    if (today + amount > tier.dailyWithdrawalNgn) {
      return fail(
        `This would exceed your ${formatNgn(tier.dailyWithdrawalNgn)} daily withdrawal limit (${formatNgn(today)} used today).`,
      )
    }
  }

  const txId = generateId('tx')
  await walletStore.addTransactions([
    {
      id: txId,
      userId: user.id,
      type: 'withdraw',
      asset: 'NGN',
      amount: -totalDebit,
      ngnValue: amount,
      feeNgn: fee,
      note: `${input.bank} ••${input.accountNumber.slice(-4)}`,
      status: 'completed',
      date: new Date().toISOString(),
    },
  ])

  if (input.saveBeneficiary) {
    await walletStore.addBeneficiary(user.id, {
      bank: input.bank,
      accountNumber: input.accountNumber,
      accountName,
    })
  }

  if (user.notifyTransactions) {
    await walletStore.addNotification({
      userId: user.id,
      title: 'Withdrawal completed',
      body: `${formatNgn(amount)} arrived at ${input.bank} ••${input.accountNumber.slice(-4)}.`,
      txId,
    })
  }

  refreshWallet()
  return { ok: true, txId }
}

// ---------------------------------------------------------------------------
// Withdraw crypto to an external wallet address
// ---------------------------------------------------------------------------

export async function withdrawCryptoAction(input: {
  pin: string
  asset: AssetSymbol
  address: string
  amount: number
}): Promise<MoneyResult> {
  const user = await requireUser()

  const pinCheck = await verifyPin(input.pin)
  if (!pinCheck.ok) return fail(pinCheck.error ?? 'PIN verification failed.')

  if (!rateLimit(`withdraw:${user.id}`, 10, 60 * 60_000)) {
    return fail('Too many withdrawals in the last hour. Please slow down.')
  }

  if (input.asset === 'NGN' || !VALID_ASSETS.includes(input.asset)) {
    return fail('Pick a crypto asset to withdraw.')
  }
  const address = input.address.trim()
  if (address.length < 20 || address.length > 90 || /\s/.test(address)) {
    return fail('That doesn’t look like a valid wallet address.')
  }
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter a valid amount.')

  const balances = await walletStore.getBalances(user.id)
  if (amount > balances[input.asset]) {
    return fail(`Amount exceeds your ${input.asset} balance.`)
  }

  const rates = await getNgnRates()
  const ngnValue = Math.round(amount * rates[input.asset] * 100) / 100
  const meta = assetMeta(input.asset)

  const tier = VERIFICATION_TIERS[user.tier]
  if (tier.dailyCryptoWithdrawalNgn !== null) {
    const txs = await walletStore.listTransactions(user.id)
    const today = dailyOutflowNgn(txs, ['withdraw'], { cryptoOnly: true })
    if (today + ngnValue > tier.dailyCryptoWithdrawalNgn) {
      return fail(
        `This would exceed your ${formatNgn(tier.dailyCryptoWithdrawalNgn)} daily crypto withdrawal limit (${formatNgn(today)} used today).`,
      )
    }
  }

  const txId = generateId('tx')
  await walletStore.addTransactions([
    {
      id: txId,
      userId: user.id,
      type: 'withdraw',
      asset: input.asset,
      amount: -amount,
      ngnValue,
      note: `To ${address.slice(0, 6)}…${address.slice(-4)}`,
      status: 'completed',
      date: new Date().toISOString(),
    },
  ])

  if (user.notifyTransactions) {
    await walletStore.addNotification({
      userId: user.id,
      title: 'Crypto withdrawal sent',
      body: `${formatAsset(amount, meta)} sent to ${address.slice(0, 6)}…${address.slice(-4)}.`,
      txId,
    })
  }

  refreshWallet()
  return { ok: true, txId }
}
