"use client";

import { useCallback, useState } from "react";
import { useAppState } from "@/app/store";
import { FACTORY_ADDRESS, NETWORK } from "@/lib/constants";
import TokenomicsFactoryABI from "@/lib/abi/TokenomicsFactory.json";

export interface TokenDeployment {
  token: string;
  vestingVault: string;
  liquidityLocker: string;
  owner: string;
  createdAt: number;
}

export interface CreateTokenParams {
  tokenConfig: {
    name: string;
    symbol: string;
    decimals: number;
    supplyType: number;
    initialSupply: bigint;
    hardCap: bigint;
    burnOnTransfer: boolean;
    burnOnTransferBps: number;
  };
  taxConfig: {
    buyTaxBps: number;
    sellTaxBps: number;
    treasuryShareBps: number;
    autoLpShareBps: number;
    burnShareBps: number;
    reflectionShareBps: number;
  };
  limitConfig: {
    maxWalletAmount: bigint;
    maxTxAmount: bigint;
  };
  allocations: {
    recipient: string;
    bps: number;
    vested: boolean;
  }[];
  vestingSchedules: {
    beneficiary: string;
    totalAmount: bigint;
    cliffDuration: bigint;
    vestingDuration: bigint;
    startTime: bigint;
  }[];
  dexRouter: string;
  lpLockDuration: bigint;
  owner: string;
  treasuryWallet: string;
}

export function useTokenomicsFactory() {
  const { web3Provider, rpcProvider } = useAppState();
  const [isDeploying, setIsDeploying] = useState(false);

  const getDeploymentCount = useCallback(async (): Promise<number> => {
    const quais = await import("quais");
    const provider =
      (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
      new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
    const contract = new quais.Contract(
      FACTORY_ADDRESS,
      TokenomicsFactoryABI,
      provider
    );
    const count = await contract.getDeploymentCount();
    return Number(count);
  }, [rpcProvider]);

  const getDeployment = useCallback(
    async (index: number): Promise<TokenDeployment> => {
      const quais = await import("quais");
      const provider =
        (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
        new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
      const contract = new quais.Contract(
        FACTORY_ADDRESS,
        TokenomicsFactoryABI,
        provider
      );
      const d = await contract.getDeployment(index);
      return {
        token: d.token,
        vestingVault: d.vestingVault,
        liquidityLocker: d.liquidityLocker,
        owner: d.owner,
        createdAt: Number(d.createdAt),
      };
    },
    [rpcProvider]
  );

  const getAllDeployments = useCallback(async (): Promise<TokenDeployment[]> => {
    const count = await getDeploymentCount();
    const results: TokenDeployment[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await getDeployment(i));
    }
    return results;
  }, [getDeploymentCount, getDeployment]);

  const createToken = useCallback(
    async (params: CreateTokenParams, salt: string) => {
      if (!web3Provider) throw new Error("Wallet not connected");

      setIsDeploying(true);
      try {
        const quais = await import("quais");
        const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
        const signer = await provider.getSigner();
        const contract = new quais.Contract(
          FACTORY_ADDRESS,
          TokenomicsFactoryABI,
          signer
        );

        const tx = await contract.createToken(
          [
            [
              params.tokenConfig.name,
              params.tokenConfig.symbol,
              params.tokenConfig.decimals,
              params.tokenConfig.supplyType,
              params.tokenConfig.initialSupply,
              params.tokenConfig.hardCap,
              params.tokenConfig.burnOnTransfer,
              params.tokenConfig.burnOnTransferBps,
            ],
            [
              params.taxConfig.buyTaxBps,
              params.taxConfig.sellTaxBps,
              params.taxConfig.treasuryShareBps,
              params.taxConfig.autoLpShareBps,
              params.taxConfig.burnShareBps,
              params.taxConfig.reflectionShareBps,
            ],
            [params.limitConfig.maxWalletAmount, params.limitConfig.maxTxAmount],
            params.allocations.map((a) => [a.recipient, a.bps, a.vested]),
            params.vestingSchedules.map((v) => [
              v.beneficiary,
              v.totalAmount,
              v.cliffDuration,
              v.vestingDuration,
              v.startTime,
            ]),
            params.dexRouter,
            params.lpLockDuration,
            params.owner,
            params.treasuryWallet,
          ],
          salt
        );

        const receipt = await tx.wait();

        const iface = new quais.Interface(TokenomicsFactoryABI);
        let tokenAddress = "";
        let vestingVault = "";
        let liquidityLocker = "";

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog({
              topics: log.topics,
              data: log.data,
            });
            if (parsed?.name === "TokenCreated") {
              tokenAddress = parsed.args.token;
              vestingVault = parsed.args.vestingVault;
              liquidityLocker = parsed.args.liquidityLocker;
              break;
            }
          } catch {
            // skip
          }
        }

        return { tokenAddress, vestingVault, liquidityLocker, txHash: receipt.hash };
      } finally {
        setIsDeploying(false);
      }
    },
    [web3Provider]
  );

  return {
    createToken,
    getDeployment,
    getDeploymentCount,
    getAllDeployments,
    isDeploying,
  };
}
