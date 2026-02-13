"use client";

import { useCallback, useState } from "react";
import { useAppState } from "@/app/store";
import {
  NETWORK,
  WQI_ADDRESS,
  WQI_POOL_ADDRESS,
  WQI_FAUCET_ADDRESS,
  WQI_ENABLED,
  WQI_FAUCET_ENABLED,
} from "@/lib/constants";
import ERC20ABI from "@/lib/abi/ERC20.json";
import WqiPoolABI from "@/lib/abi/WqiPool.json";
import WqiFaucetABI from "@/lib/abi/WqiFaucet.json";

export interface FaucetInfo {
  dripAmount: string;
  cooldownSeconds: number;
  lastDripTimestamp: number;
  canDrip: boolean;
  cooldownRemaining: number;
}

export function useWqi() {
  const { web3Provider, rpcProvider } = useAppState();
  const [isSwapping, setIsSwapping] = useState(false);
  const [isDripping, setIsDripping] = useState(false);

  const getReadProvider = useCallback(async () => {
    const quais = await import("quais");
    return (
      (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
      new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false })
    );
  }, [rpcProvider]);

  const getSigner = useCallback(async () => {
    if (!web3Provider) throw new Error("Wallet not connected");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = web3Provider as any;
    return provider.getSigner();
  }, [web3Provider]);

  const getWqiBalance = useCallback(
    async (address: string): Promise<string> => {
      if (!WQI_ENABLED) return "0";
      const quais = await import("quais");
      const provider = await getReadProvider();
      const token = new quais.Contract(WQI_ADDRESS, ERC20ABI, provider);
      const balance: bigint = await token.balanceOf(address);
      return quais.formatUnits(balance, 18);
    },
    [getReadProvider]
  );

  const getSwapQuote = useCallback(
    async (quaiAmount: string): Promise<string> => {
      if (!WQI_ENABLED) return "0";
      const quais = await import("quais");
      const provider = await getReadProvider();
      const pool = new quais.Contract(WQI_POOL_ADDRESS, WqiPoolABI, provider);
      const amountIn = quais.parseUnits(quaiAmount, 18);
      const tokenOut: bigint = await pool.getQuaiToTokenQuote(amountIn);
      return quais.formatUnits(tokenOut, 18);
    },
    [getReadProvider]
  );

  const swapQuaiForWqi = useCallback(
    async (quaiAmount: string, minWqiOut: string): Promise<string> => {
      if (!WQI_ENABLED) throw new Error("wQI not enabled");
      setIsSwapping(true);
      try {
        const quais = await import("quais");
        const signer = await getSigner();
        const pool = new quais.Contract(WQI_POOL_ADDRESS, WqiPoolABI, signer);
        const value = quais.parseUnits(quaiAmount, 18);
        const minOut = quais.parseUnits(minWqiOut, 18);
        const tx = await pool.swapQuaiForTokens(minOut, { value });
        const receipt = await tx.wait();
        return receipt.hash as string;
      } finally {
        setIsSwapping(false);
      }
    },
    [getSigner]
  );

  const getFaucetInfo = useCallback(
    async (address: string): Promise<FaucetInfo> => {
      if (!WQI_FAUCET_ENABLED) {
        return {
          dripAmount: "0",
          cooldownSeconds: 0,
          lastDripTimestamp: 0,
          canDrip: false,
          cooldownRemaining: 0,
        };
      }
      const quais = await import("quais");
      const provider = await getReadProvider();
      const faucet = new quais.Contract(WQI_FAUCET_ADDRESS, WqiFaucetABI, provider);

      const [dripAmountRaw, cooldown, lastDripRaw] = await Promise.all([
        faucet.dripAmount() as Promise<bigint>,
        faucet.cooldownSeconds() as Promise<bigint>,
        faucet.lastDrip(address) as Promise<bigint>,
      ]);

      const cooldownSeconds = Number(cooldown);
      const lastDripTimestamp = Number(lastDripRaw);
      const now = Math.floor(Date.now() / 1000);
      const nextDripAt = lastDripTimestamp + cooldownSeconds;
      const cooldownRemaining = Math.max(0, nextDripAt - now);
      const canDrip = cooldownRemaining === 0;

      return {
        dripAmount: quais.formatUnits(dripAmountRaw, 18),
        cooldownSeconds,
        lastDripTimestamp,
        canDrip,
        cooldownRemaining,
      };
    },
    [getReadProvider]
  );

  const requestDrip = useCallback(async (): Promise<string> => {
    if (!WQI_FAUCET_ENABLED) throw new Error("Faucet not enabled");
    setIsDripping(true);
    try {
      const quais = await import("quais");
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const faucet = new quais.Contract(WQI_FAUCET_ADDRESS, WqiFaucetABI, signer);
      const tx = await faucet.drip(signerAddress);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } finally {
      setIsDripping(false);
    }
  }, [getSigner]);

  return {
    getWqiBalance,
    getSwapQuote,
    swapQuaiForWqi,
    getFaucetInfo,
    requestDrip,
    isSwapping,
    isDripping,
    enabled: WQI_ENABLED,
    faucetEnabled: WQI_FAUCET_ENABLED,
  };
}
