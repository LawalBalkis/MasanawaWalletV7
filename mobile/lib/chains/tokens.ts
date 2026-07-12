/**
 * Token registry: ERC-20 (EVM), SPL (Solana) and TRC-20 (TRON).
 * Contract / mint addresses are the canonical mainnet deployments.
 * Centralized here so a user-managed custom-token list can be layered
 * on later. Pure data - no imports, trivially testable.
 */

export interface TokenConfig {
  /** Stable unique id: `${chainId}:${symbol}`. */
  id: string
  /** References ChainConfig.id in ./config. */
  chainId: string
  symbol: string
  name: string
  decimals: number
  /** ERC-20 / TRC-20 contract address, or SPL mint address. */
  address: string
  /** CoinGecko coin id for USD pricing. */
  coingeckoId: string
  /** Accent color for UI. */
  color: string
}

const USDC_COLOR = "#2775CA"
const USDT_COLOR = "#26A17B"
const DAI_COLOR = "#F5AC37"

export const TOKENS: TokenConfig[] = [
  // ---- Ethereum ----
  {
    id: "ethereum:USDC",
    chainId: "ethereum",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    coingeckoId: "usd-coin",
    color: USDC_COLOR,
  },
  {
    id: "ethereum:USDT",
    chainId: "ethereum",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    coingeckoId: "tether",
    color: USDT_COLOR,
  },
  {
    id: "ethereum:DAI",
    chainId: "ethereum",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    coingeckoId: "dai",
    color: DAI_COLOR,
  },
  // ---- Base ----
  {
    id: "base:USDC",
    chainId: "base",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    coingeckoId: "usd-coin",
    color: USDC_COLOR,
  },
  // ---- Arbitrum ----
  {
    id: "arbitrum:USDC",
    chainId: "arbitrum",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    coingeckoId: "usd-coin",
    color: USDC_COLOR,
  },
  {
    id: "arbitrum:USDT",
    chainId: "arbitrum",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    coingeckoId: "tether",
    color: USDT_COLOR,
  },
  // ---- Optimism ----
  {
    id: "optimism:USDC",
    chainId: "optimism",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    coingeckoId: "usd-coin",
    color: USDC_COLOR,
  },
  // ---- BNB Chain ----
  {
    id: "bsc:USDT",
    chainId: "bsc",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 18,
    address: "0x55d398326f99059fF775485246999027B3197955",
    coingeckoId: "tether",
    color: USDT_COLOR,
  },
  {
    id: "bsc:USDC",
    chainId: "bsc",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 18,
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    coingeckoId: "usd-coin",
    color: USDC_COLOR,
  },
  // ---- Solana ----
  {
    id: "solana:USDC",
    chainId: "solana",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    coingeckoId: "usd-coin",
    color: USDC_COLOR,
  },
  {
    id: "solana:USDT",
    chainId: "solana",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    coingeckoId: "tether",
    color: USDT_COLOR,
  },
  // ---- TRON ----
  {
    id: "tron:USDT",
    chainId: "tron",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    coingeckoId: "tether",
    color: USDT_COLOR,
  },
]

export function tokensForChain(chainId: string): TokenConfig[] {
  return TOKENS.filter((t) => t.chainId === chainId)
}

export function findToken(id: string): TokenConfig | undefined {
  return TOKENS.find((t) => t.id === id)
}
