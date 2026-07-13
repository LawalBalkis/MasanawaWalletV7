/**
 * Fiat + number formatting helpers shared across screens.
 */

/** Supported display currencies (must be CoinGecko `vs_currencies` values). */
export const CURRENCIES = [
  { code: "usd", label: "USD", symbol: "$" },
  { code: "ngn", label: "NGN", symbol: "\u20A6" },
  { code: "eur", label: "EUR", symbol: "\u20AC" },
  { code: "gbp", label: "GBP", symbol: "\u00A3" },
  { code: "jpy", label: "JPY", symbol: "\u00A5" },
  { code: "cad", label: "CAD", symbol: "CA$" },
  { code: "aud", label: "AUD", symbol: "AU$" },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]["code"]

/** Format a numeric fiat value using the given ISO currency code. */
export function formatFiat(value: number, currency = "usd"): string {
  const code = currency.toUpperCase()
  try {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: code,
      // JPY has no minor unit; keep others at 2 decimals.
      minimumFractionDigits: code === "JPY" ? 0 : 2,
      maximumFractionDigits: code === "JPY" ? 0 : 2,
    })
  } catch {
    // Fallback if the runtime Intl data lacks the currency.
    const meta = CURRENCIES.find((c) => c.code === currency.toLowerCase())
    return `${meta?.symbol ?? ""}${value.toFixed(2)}`
  }
}

/** Compact price display that keeps small token prices readable. */
export function formatPrice(value: number, currency = "usd"): string {
  if (value > 0 && value < 1) {
    const code = currency.toUpperCase()
    try {
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })
    } catch {
      return `${value.toFixed(6)}`
    }
  }
  return formatFiat(value, currency)
}
