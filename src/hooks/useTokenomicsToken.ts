"use client";

import { useCallback } from "react";
import { useAppState } from "@/app/store";
import { NETWORK } from "@/lib/constants";
import TokenomicsTokenABI from "@/lib/abi/TokenomicsToken.json";

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  supplyType: number;
  hardCap: string;
  owner: string;
  taxConfig: {
    buyTaxBps: number;
    sellTaxBps: number;
    treasuryShareBps: number;
    autoLpShareBps: number;
    burnShareBps: number;
    reflectionShareBps: number;
  };
  limitConfig: {
    maxWalletAmount: string;
    maxTxAmount: string;
  };
  totalFees: string;
  dexRouter: string;
  treasuryWallet: string;
  liquidityLocker: string;
  mainPair: string;
}

export function useTokenomicsToken() {
  const { web3Provider, rpcProvider } = useAppState();

  const getTokenInfo = useCallback(
    async (tokenAddress: string): Promise<TokenInfo> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(
        tokenAddress,
        TokenomicsTokenABI,
        provider
      );

      const [
        name,
        symbol,
        decimals,
        totalSupply,
        supplyType,
        hardCap,
        owner,
        taxConfig,
        limitConfig,
        totalFees,
        dexRouter,
        treasuryWallet,
        liquidityLocker,
        mainPair,
      ] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.supplyType(),
        contract.hardCap(),
        contract.getOwner(),
        contract.getTaxConfig(),
        contract.getLimitConfig(),
        contract.totalFees(),
        contract.dexRouter(),
        contract.treasuryWallet(),
        contract.liquidityLockerAddress(),
        contract.mainPair(),
      ]);

      const dec = Number(decimals);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: dec,
        totalSupply: quais.formatUnits(totalSupply, dec),
        supplyType: Number(supplyType),
        hardCap: quais.formatUnits(hardCap, dec),
        owner,
        taxConfig: {
          buyTaxBps: Number(taxConfig.buyTaxBps),
          sellTaxBps: Number(taxConfig.sellTaxBps),
          treasuryShareBps: Number(taxConfig.treasuryShareBps),
          autoLpShareBps: Number(taxConfig.autoLpShareBps),
          burnShareBps: Number(taxConfig.burnShareBps),
          reflectionShareBps: Number(taxConfig.reflectionShareBps),
        },
        limitConfig: {
          maxWalletAmount: quais.formatUnits(limitConfig.maxWalletAmount, dec),
          maxTxAmount: quais.formatUnits(limitConfig.maxTxAmount, dec),
        },
        totalFees: quais.formatUnits(totalFees, dec),
        dexRouter,
        treasuryWallet,
        liquidityLocker,
        mainPair,
      };
    },
    [rpcProvider]
  );

  const balanceOf = useCallback(
    async (tokenAddress: string, account: string): Promise<string> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(
        tokenAddress,
        TokenomicsTokenABI,
        provider
      );
      const [balance, decimals] = await Promise.all([
        contract.balanceOf(account),
        contract.decimals(),
      ]);
      return quais.formatUnits(balance, Number(decimals));
    },
    [rpcProvider]
  );

  const reduceTax = useCallback(
    async (tokenAddress: string, newBuyBps: number, newSellBps: number) => {
      if (!web3Provider) throw new Error("Wallet not connected");
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const contract = new quais.Contract(tokenAddress, TokenomicsTokenABI, signer);
      const tx = await contract.reduceTax(newBuyBps, newSellBps);
      return tx.wait();
    },
    [web3Provider]
  );

  const removeLimits = useCallback(
    async (tokenAddress: string) => {
      if (!web3Provider) throw new Error("Wallet not connected");
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const contract = new quais.Contract(tokenAddress, TokenomicsTokenABI, signer);
      const tx = await contract.removeLimits();
      return tx.wait();
    },
    [web3Provider]
  );

  const mint = useCallback(
    async (tokenAddress: string, to: string, amount: string) => {
      if (!web3Provider) throw new Error("Wallet not connected");
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const contract = new quais.Contract(tokenAddress, TokenomicsTokenABI, signer);
      const decimals = await contract.decimals();
      const tx = await contract.mint(to, quais.parseUnits(amount, Number(decimals)));
      return tx.wait();
    },
    [web3Provider]
  );

  const renounceOwnership = useCallback(
    async (tokenAddress: string) => {
      if (!web3Provider) throw new Error("Wallet not connected");
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const contract = new quais.Contract(tokenAddress, TokenomicsTokenABI, signer);
      const tx = await contract.renounceOwnership();
      return tx.wait();
    },
    [web3Provider]
  );

  const approve = useCallback(
    async (tokenAddress: string, spender: string, amount: bigint) => {
      if (!web3Provider) throw new Error("Wallet not connected");
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const contract = new quais.Contract(tokenAddress, TokenomicsTokenABI, signer);
      const tx = await contract.approve(spender, amount);
      return tx.wait();
    },
    [web3Provider]
  );

  const allowance = useCallback(
    async (tokenAddress: string, owner: string, spender: string): Promise<bigint> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
      const contract = new quais.Contract(tokenAddress, TokenomicsTokenABI, provider);
      return contract.allowance(owner, spender);
    },
    [rpcProvider]
  );

  return {
    getTokenInfo,
    balanceOf,
    reduceTax,
    removeLimits,
    mint,
    renounceOwnership,
    approve,
    allowance,
  };
}
