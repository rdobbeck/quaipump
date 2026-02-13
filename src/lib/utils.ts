import { NETWORK } from "./constants";

export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${NETWORK.explorerUrl}/address/${address}`;
}

export function getExplorerTxUrl(hash: string): string {
  return `${NETWORK.explorerUrl}/tx/${hash}`;
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCountdown(targetTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = targetTimestamp - now;
  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatSupply(value: string, decimals = 2): string {
  const num = parseFloat(value);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
  return num.toFixed(decimals);
}

export function supplyTypeLabel(st: number): string {
  return st === 0 ? "Fixed" : "Mintable";
}
