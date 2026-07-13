import 'server-only'

import { walletStore } from '@/lib/wallet/store'

export interface PlatformConfig {
  sendFeeNgn: number
  tradeFeeRate: number
  tradeFeeMinNgn: number
  withdrawFeeNgn: number
  minTradeNgn: number
  minWithdrawNgn: number
  referralBonusNgn: number
  referralQualifyNgn: number
  referralWithdrawMinNgn: number
}

const DEFAULTS: PlatformConfig = {
  sendFeeNgn: 0,
  tradeFeeRate: 0.01,
  tradeFeeMinNgn: 100,
  withdrawFeeNgn: 50,
  minTradeNgn: 1000,
  minWithdrawNgn: 500,
  referralBonusNgn: 200,
  referralQualifyNgn: 2000,
  referralWithdrawMinNgn: 2000,
}

const SETTING_KEY = 'platform_config'

const cache = globalThis as unknown as {
  __platformConfig?: { value: PlatformConfig; fetchedAt: number }
}

const CACHE_TTL_MS = 30_000

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const now = Date.now()
  const cached = cache.__platformConfig
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value
  }

  try {
    const stored = await walletStore.getPlatformSetting(SETTING_KEY)
    if (stored && typeof stored === 'object') {
      const merged = { ...DEFAULTS, ...(stored as Partial<PlatformConfig>) }
      cache.__platformConfig = { value: merged, fetchedAt: now }
      return merged
    }
  } catch {
    // fall through to defaults
  }

  cache.__platformConfig = { value: DEFAULTS, fetchedAt: now }
  return DEFAULTS
}

export async function setPlatformConfig(
  value: Partial<PlatformConfig>,
  updatedBy: string,
): Promise<void> {
  const current = await getPlatformConfig()
  const merged = { ...current, ...value }
  await walletStore.setPlatformSetting(SETTING_KEY, merged, updatedBy)
  cache.__platformConfig = { value: merged, fetchedAt: Date.now() }
}

export const PLATFORM_CONFIG_DEFAULTS = DEFAULTS

export const CONFIG_LABELS: Record<keyof PlatformConfig, string> = {
  sendFeeNgn: 'Send fee (NGN)',
  tradeFeeRate: 'Trade fee rate (fraction)',
  tradeFeeMinNgn: 'Trade fee minimum (NGN)',
  withdrawFeeNgn: 'Withdrawal fee (NGN)',
  minTradeNgn: 'Minimum trade (NGN)',
  minWithdrawNgn: 'Minimum withdrawal (NGN)',
  referralBonusNgn: 'Referral bonus (NGN)',
  referralQualifyNgn: 'Referral qualification threshold (NGN)',
  referralWithdrawMinNgn: 'Referral withdrawal minimum (NGN)',
}
