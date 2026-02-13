"use client";

import { useCallback } from "react";
import { useAppState } from "@/app/store";
import { NETWORK } from "@/lib/constants";
import LiquidityLockerABI from "@/lib/abi/LiquidityLocker.json";

export interface LockerInfo {
  lpToken: string;
  owner: string;
  unlockTime: number;
  lockedBalance: string;
}

export function useLiquidityLocker() {
  const { web3Provider, rpcProvider } = useAppState();

  const getLockerInfo = useCallback(
    async (lockerAddress: string): Promise<LockerInfo> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(
        lockerAddress,
        LiquidityLockerABI,
        provider
      );
      const [lpToken, owner, unlockTime, lockedBalance] = await Promise.all([
        contract.lpToken(),
        contract.owner(),
        contract.unlockTime(),
        contract.lockedBalance(),
      ]);
      return {
        lpToken,
        owner,
        unlockTime: Number(unlockTime),
        lockedBalance: quais.formatUnits(lockedBalance, 18),
      };
    },
    [rpcProvider]
  );

  const withdraw = useCallback(
    async (lockerAddress: string, to: string) => {
      if (!web3Provider) throw new Error("Wallet not connected");
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const contract = new quais.Contract(lockerAddress, LiquidityLockerABI, signer);
      const tx = await contract.withdraw(to);
      return tx.wait();
    },
    [web3Provider]
  );

  const extendLock = useCallback(
    async (lockerAddress: string, newUnlockTime: number) => {
      if (!web3Provider) throw new Error("Wallet not connected");
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const contract = new quais.Contract(lockerAddress, LiquidityLockerABI, signer);
      const tx = await contract.extendLock(newUnlockTime);
      return tx.wait();
    },
    [web3Provider]
  );

  return { getLockerInfo, withdraw, extendLock };
}
