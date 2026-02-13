export const NETWORKS = {
  orchard: {
    name: "Quai Orchard Testnet",
    chainId: 15000,
    rpcUrl: "https://orchard.rpc.quai.network",
    explorerUrl: "https://orchard.quaiscan.io",
  },
  mainnet: {
    name: "Quai Mainnet",
    chainId: 9000,
    rpcUrl: "https://rpc.quai.network",
    explorerUrl: "https://quaiscan.io",
  },
} as const;

export const ACTIVE_NETWORK =
  (process.env.NEXT_PUBLIC_NETWORK as keyof typeof NETWORKS) || "orchard";

export const NETWORK = NETWORKS[ACTIVE_NETWORK];

export const FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "0x0009CeD9E1a7946031b1389d8b4e138CD15A78B3";

export const DEX_ROUTER_ADDRESS =
  process.env.NEXT_PUBLIC_DEX_ROUTER_ADDRESS ||
  "0x002F5F0d9c1A012A890002995Ac04fc085d47992";

export const WQI_ADDRESS = process.env.NEXT_PUBLIC_WQI_ADDRESS || "";
export const WQI_POOL_ADDRESS = process.env.NEXT_PUBLIC_WQI_POOL_ADDRESS || "";
export const WQI_FAUCET_ADDRESS = process.env.NEXT_PUBLIC_WQI_FAUCET_ADDRESS || "";
export const WQI_ENABLED = !!WQI_ADDRESS && !!WQI_POOL_ADDRESS;
export const WQI_FAUCET_ENABLED = !!WQI_FAUCET_ADDRESS;

export const BONDING_FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_BONDING_FACTORY_ADDRESS || "";

export const BONDING_FACTORY_V2_ADDRESS =
  process.env.NEXT_PUBLIC_BONDING_FACTORY_V2_ADDRESS || "";

export const QUAI_USD_PRICE = 0.052;
export const BONDING_TOTAL_SUPPLY = 1_000_000_000; // 1B tokens

export const BPS_DENOMINATOR = 10000;
export const MAX_TAX_BPS = 2500;
export const DEFAULT_DECIMALS = 18;
export const DEFAULT_SLIPPAGE_BPS = 500; // 5%
