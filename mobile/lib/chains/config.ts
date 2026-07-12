/**
 * Chain registry. All RPC endpoints are free public endpoints - no API
 * keys, no accounts. Centralized here so user-configurable RPCs can be
 * added later by overriding `rpcUrl` per chain.
 */

export type ChainKind = "evm" | "solana" | "tron"

export interface ChainConfig {
  id: string
  name: string
  kind: ChainKind
  symbol: string
  decimals: number
  rpcUrl: string
  /** CoinGecko coin id for USD pricing (public API, no key). */
  coingeckoId: string
  /** Accent color for UI. */
  color: string
}

export const CHAINS: ChainConfig[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    kind: "evm",
    symbol: "ETH",
    decimals: 18,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    coingeckoId: "ethereum",
    color: "#8A92B2",
  },
  {
    id: "base",
    name: "Base",
    kind: "evm",
    symbol: "ETH",
    decimals: 18,
    rpcUrl: "https://base-rpc.publicnode.com",
    coingeckoId: "ethereum",
    color: "#2151F5",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    kind: "evm",
    symbol: "ETH",
    decimals: 18,
    rpcUrl: "https://arbitrum-one-rpc.publicnode.com",
    coingeckoId: "ethereum",
    color: "#2D374B",
  },
  {
    id: "optimism",
    name: "Optimism",
    kind: "evm",
    symbol: "ETH",
    decimals: 18,
    rpcUrl: "https://optimism-rpc.publicnode.com",
    coingeckoId: "ethereum",
    color: "#FF0420",
  },
  {
    id: "bsc",
    name: "BNB Chain",
    kind: "evm",
    symbol: "BNB",
    decimals: 18,
    rpcUrl: "https://bsc-rpc.publicnode.com",
    coingeckoId: "binancecoin",
    color: "#F0B90B",
  },
  {
    id: "solana",
    name: "Solana",
    kind: "solana",
    symbol: "SOL",
    decimals: 9,
    rpcUrl: "https://api.mainnet-beta.solana.com",
    coingeckoId: "solana",
    color: "#14F195",
  },
  {
    id: "tron",
    name: "TRON",
    kind: "tron",
    symbol: "TRX",
    decimals: 6,
    rpcUrl: "https://api.trongrid.io",
    coingeckoId: "tron",
    color: "#EB0029",
  },
]

export const COINGECKO_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price"
