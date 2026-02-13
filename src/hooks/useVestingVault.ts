"use client";

import { useCallback } from "react";
import { useAppState } from "@/app/store";
import { NETWORK } from "@/lib/constants";
import VestingVaultABI from "@/lib/abi/VestingVault.json";

export interface VestingPosition {
  totalAmount: string;
  released: string;
  cliffEnd: number;
  vestingEnd: number;
  startTime: number;
}

export function useVestingVault() {
  const { web3Provider, rpcProvider } = useAppState();

  const getToken = useCallback(
    async (vaultAddress: string): Promise<string> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(vaultAddress, VestingVaultABI, provider);
      return contract.token();
    },
    [rpcProvider]
  );

  const getPosition = useCallback(
    async (
      vaultAddress: string,
      beneficiary: string,
      decimals: number
    ): Promise<VestingPosition> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(vaultAddress, VestingVaultABI, provider);
      const p = await contract.getPosition(beneficiary);
      return {
        totalAmount: quais.formatUnits(p.totalAmount, decimals),
        released: quais.formatUnits(p.released, decimals),
        cliffEnd: Number(p.cliffEnd),
        vestingEnd: Number(p.vestingEnd),
        startTime: Number(p.startTime),
      };
    },
    [rpcProvider]
  );

  const releasable = useCallback(
    async (vaultAddress: string, beneficiary: string, decimals: number): Promise<string> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(vaultAddress, VestingVaultABI, provider);
      const amount = await contract.releasable(beneficiary);
      return quais.formatUnits(amount, decimals);
    },
    [rpcProvider]
  );

  const vested = useCallback(
    async (vaultAddress: string, beneficiary: string, decimals: number): Promise<string> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(vaultAddress, VestingVaultABI, provider);
      const amount = await contract.vested(beneficiary);
      return quais.formatUnits(amount, decimals);
    },
    [rpcProvider]
  );

  const release = useCallback(
    async (vaultAddress: string) => {
      if (!web3Provider) throw new Error("Wallet not connected");
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const contract = new quais.Contract(vaultAddress, VestingVaultABI, signer);
      const tx = await contract.release();
      return tx.wait();
    },
    [web3Provider]
  );

  const getBeneficiaries = useCallback(
    async (vaultAddress: string): Promise<string[]> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(vaultAddress, VestingVaultABI, provider);
      return contract.getBeneficiaries();
    },
    [rpcProvider]
  );

  return {
    getToken,
    getPosition,
    releasable,
    vested,
    release,
    getBeneficiaries,
  };
}
