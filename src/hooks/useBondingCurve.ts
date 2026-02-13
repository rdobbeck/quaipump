"use client";

import { useCallback, useState } from "react";
import { useAppState } from "@/app/store";
import { BONDING_FACTORY_ADDRESS, BONDING_FACTORY_V2_ADDRESS, NETWORK } from "@/lib/constants";
import BondingCurveFactoryABI from "@/lib/abi/BondingCurveFactory.json";
import BondingCurveFactoryV2ABI from "@/lib/abi/BondingCurveFactoryV2.json";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";
import BondingCurveTokenABI from "@/lib/abi/BondingCurveToken.json";
import BondingCurveTokenV2ABI from "@/lib/abi/BondingCurveTokenV2.json";

// Bonding curve constants for max-buy chunk calculation
const K_BIGINT = 36_482_000_000n * (10n ** 36n);
const MAX_BUY_TOKENS_WEI = 16_000_000n * (10n ** 18n);
const FEE_BPS_BIGINT = 100n;

export interface TokenomicsConfig {
  buyTaxBps: number;
  sellTaxBps: number;
  treasuryShareBps: number;
  autoLpShareBps: number;
  burnShareBps: number;
  reflectionShareBps: number;
  maxWalletAmount: string; // in tokens (decimal string)
  maxTxAmount: string; // in tokens (decimal string)
  burnOnTransfer: boolean;
  burnOnTransferBps: number;
  treasuryWallet: string;
}

export interface LaunchInfo {
  launchId: number;
  tokenAddress: string;
  curveAddress: string;
  creator: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  website: string;
  twitter: string;
  telegram: string;
  createdAt: number;
  stakedAmount: string;
}

export interface CurveState {
  graduated: boolean;
  pool: string;
  currentPrice: string;
  progress: number;
  realQuaiReserves: string;
  realTokenReserves: string;
  virtualQuaiReserves: string;
  virtualTokenReserves: string;
}

export function useBondingCurve() {
  const { web3Provider, rpcProvider, account } = useAppState();
  const [isLaunching, setIsLaunching] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);

  const getReadProvider = useCallback(async () => {
    const quais = await import("quais");
    return (
      (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
      new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false })
    );
  }, [rpcProvider]);

  const launchToken = useCallback(
    async (
      name: string,
      symbol: string,
      description: string = "",
      imageUrl: string = "",
      website: string = "",
      twitter: string = "",
      telegram: string = ""
    ) => {
      if (!web3Provider || !account) {
        throw new Error("Wallet not connected");
      }

      setIsLaunching(true);
      try {
        const quais = await import("quais");
        const provider = web3Provider as InstanceType<
          typeof quais.BrowserProvider
        >;
        const signer = await provider.getSigner();

        const contract = new quais.Contract(
          BONDING_FACTORY_ADDRESS,
          BondingCurveFactoryABI,
          signer
        );

        const fee = await contract.creationFee();

        const tx = await contract.launchToken(name, symbol, description, imageUrl, website, twitter, telegram, { value: fee });
        const receipt = await tx.wait();

        const iface = new quais.Interface(BondingCurveFactoryABI);
        let tokenAddress = "";
        let curveAddress = "";
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog({
              topics: log.topics,
              data: log.data,
            });
            if (parsed?.name === "TokenLaunched") {
              tokenAddress = parsed.args.tokenAddress;
              curveAddress = parsed.args.curveAddress;
              break;
            }
          } catch {
            // Skip logs that don't match
          }
        }

        return { tokenAddress, curveAddress, txHash: receipt.hash };
      } finally {
        setIsLaunching(false);
      }
    },
    [web3Provider, account]
  );

  const launchTokenWithTokenomics = useCallback(
    async (
      name: string,
      symbol: string,
      tokenomics: TokenomicsConfig
    ) => {
      if (!web3Provider || !account) {
        throw new Error("Wallet not connected");
      }
      if (!BONDING_FACTORY_V2_ADDRESS) {
        throw new Error("V2 factory address not configured");
      }

      setIsLaunching(true);
      try {
        const quais = await import("quais");
        const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
        const signer = await provider.getSigner();

        const contract = new quais.Contract(
          BONDING_FACTORY_V2_ADDRESS,
          BondingCurveFactoryV2ABI,
          signer
        );

        const fee = await contract.creationFee();

        const params = {
          name,
          symbol,
          decimals: 18,
          taxConfig: {
            buyTaxBps: tokenomics.buyTaxBps,
            sellTaxBps: tokenomics.sellTaxBps,
            treasuryShareBps: tokenomics.treasuryShareBps,
            autoLpShareBps: tokenomics.autoLpShareBps,
            burnShareBps: tokenomics.burnShareBps,
            reflectionShareBps: tokenomics.reflectionShareBps,
          },
          limitConfig: {
            maxWalletAmount: quais.parseUnits(tokenomics.maxWalletAmount || "0", 18),
            maxTxAmount: quais.parseUnits(tokenomics.maxTxAmount || "0", 18),
          },
          burnOnTransfer: tokenomics.burnOnTransfer,
          burnOnTransferBps: tokenomics.burnOnTransferBps,
          bondingCurve: "0x0000000000000000000000000000000000000000", // factory overrides
          treasuryWallet: tokenomics.treasuryWallet,
        };

        const tx = await contract.launchTokenWithTokenomics(params, { value: fee });
        const receipt = await tx.wait();

        const iface = new quais.Interface(BondingCurveFactoryV2ABI);
        let tokenAddress = "";
        let curveAddress = "";
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog({ topics: log.topics, data: log.data });
            if (parsed?.name === "TokenLaunched") {
              tokenAddress = parsed.args.tokenAddress;
              curveAddress = parsed.args.curveAddress;
              break;
            }
          } catch {
            // Skip logs that don't match
          }
        }

        return { tokenAddress, curveAddress, txHash: receipt.hash };
      } finally {
        setIsLaunching(false);
      }
    },
    [web3Provider, account]
  );

  const buyTokens = useCallback(
    async (curveAddress: string, quaiAmount: string, minTokensOut: string) => {
      if (!web3Provider || !account) {
        throw new Error("Wallet not connected");
      }

      setIsBuying(true);
      try {
        const quais = await import("quais");
        const provider = web3Provider as InstanceType<
          typeof quais.BrowserProvider
        >;
        const signer = await provider.getSigner();

        const contract = new quais.Contract(
          curveAddress,
          BondingCurveABI,
          signer
        );

        const tx = await contract.buy(quais.parseUnits(minTokensOut, 18), {
          value: quais.parseQuai(quaiAmount),
        });
        const receipt = await tx.wait();
        return receipt.hash;
      } finally {
        setIsBuying(false);
      }
    },
    [web3Provider, account]
  );

  const buyTokensChunked = useCallback(
    async (
      curveAddress: string,
      totalQuaiAmount: string,
      slippage: number,
      onProgress?: (current: number, total: number) => void
    ): Promise<string[]> => {
      if (!web3Provider || !account) {
        throw new Error("Wallet not connected");
      }

      setIsBuying(true);
      try {
        const quais = await import("quais");
        const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
        const signer = await provider.getSigner();
        const readProvider = await getReadProvider();

        const contract = new quais.Contract(curveAddress, BondingCurveABI, signer);
        const readContract = new quais.Contract(curveAddress, BondingCurveABI, readProvider);

        let remainingQuai = quais.parseQuai(totalQuaiAmount);
        const txHashes: string[] = [];

        // Estimate number of chunks from initial quote
        const totalQuote: bigint = await readContract.getBuyQuote(remainingQuai);
        const numChunks = Number((totalQuote + MAX_BUY_TOKENS_WEI - 1n) / MAX_BUY_TOKENS_WEI);

        let chunk = 0;
        while (remainingQuai > 0n) {
          chunk++;
          onProgress?.(chunk, Math.max(numChunks, chunk));

          // Check if remaining amount fits in one tx
          const quote: bigint = await readContract.getBuyQuote(remainingQuai);

          let chunkQuai: bigint;
          if (quote <= MAX_BUY_TOKENS_WEI) {
            chunkQuai = remainingQuai;
          } else {
            // Calculate max QUAI that yields ~16M tokens using curve formula
            const vToken: bigint = await readContract.virtualTokenReserves();
            const vQuai: bigint = await readContract.virtualQuaiReserves();

            const targetVToken = vToken - MAX_BUY_TOKENS_WEI;
            const requiredVQuai = K_BIGINT / targetVToken;
            const quaiInNet = requiredVQuai - vQuai;
            chunkQuai = quaiInNet * 10000n / (10000n - FEE_BPS_BIGINT);

            if (chunkQuai > remainingQuai) chunkQuai = remainingQuai;
            if (chunkQuai <= 0n) break;
          }

          const expectedTokens: bigint = await readContract.getBuyQuote(chunkQuai);
          const slippageBps = BigInt(Math.floor(slippage * 10000));
          const minTokensOut = expectedTokens * (10000n - slippageBps) / 10000n;

          const tx = await contract.buy(minTokensOut, { value: chunkQuai });
          const receipt = await tx.wait();
          txHashes.push(receipt.hash);

          remainingQuai -= chunkQuai;
        }

        return txHashes;
      } finally {
        setIsBuying(false);
      }
    },
    [web3Provider, account, getReadProvider]
  );

  const sellTokens = useCallback(
    async (
      curveAddress: string,
      tokenAmount: string,
      minQuaiOut: string
    ) => {
      if (!web3Provider || !account) {
        throw new Error("Wallet not connected");
      }

      setIsSelling(true);
      try {
        const quais = await import("quais");
        const provider = web3Provider as InstanceType<
          typeof quais.BrowserProvider
        >;
        const signer = await provider.getSigner();

        const contract = new quais.Contract(
          curveAddress,
          BondingCurveABI,
          signer
        );

        const tx = await contract.sell(
          quais.parseUnits(tokenAmount, 18),
          quais.parseQuai(minQuaiOut)
        );
        const receipt = await tx.wait();
        return receipt.hash;
      } finally {
        setIsSelling(false);
      }
    },
    [web3Provider, account]
  );

  const getCurveState = useCallback(
    async (curveAddress: string): Promise<CurveState> => {
      const quais = await import("quais");
      const provider = await getReadProvider();
      const contract = new quais.Contract(
        curveAddress,
        BondingCurveABI,
        provider
      );

      const [
        graduated,
        pool,
        price,
        prog,
        realQuai,
        realToken,
        virtualQuai,
        virtualToken,
      ] = await Promise.all([
        contract.graduated(),
        contract.pool(),
        contract.currentPrice(),
        contract.progress(),
        contract.realQuaiReserves(),
        contract.realTokenReserves(),
        contract.virtualQuaiReserves(),
        contract.virtualTokenReserves(),
      ]);

      return {
        graduated,
        pool,
        currentPrice: quais.formatUnits(price, 18),
        progress: Number(prog),
        realQuaiReserves: quais.formatQuai(realQuai),
        realTokenReserves: quais.formatUnits(realToken, 18),
        virtualQuaiReserves: quais.formatQuai(virtualQuai),
        virtualTokenReserves: quais.formatUnits(virtualToken, 18),
      };
    },
    [getReadProvider]
  );

  const getBuyQuote = useCallback(
    async (curveAddress: string, quaiAmount: string): Promise<string> => {
      const quais = await import("quais");
      const provider = await getReadProvider();
      const contract = new quais.Contract(
        curveAddress,
        BondingCurveABI,
        provider
      );
      const tokens = await contract.getBuyQuote(quais.parseQuai(quaiAmount));
      return quais.formatUnits(tokens, 18);
    },
    [getReadProvider]
  );

  const getSellQuote = useCallback(
    async (curveAddress: string, tokenAmount: string): Promise<string> => {
      const quais = await import("quais");
      const provider = await getReadProvider();
      const contract = new quais.Contract(
        curveAddress,
        BondingCurveABI,
        provider
      );
      const quaiOut = await contract.getSellQuote(
        quais.parseUnits(tokenAmount, 18)
      );
      return quais.formatQuai(quaiOut);
    },
    [getReadProvider]
  );

  const getTokenBalance = useCallback(
    async (tokenAddress: string, userAddress: string): Promise<string> => {
      const quais = await import("quais");
      const provider = await getReadProvider();
      const contract = new quais.Contract(
        tokenAddress,
        BondingCurveTokenABI,
        provider
      );
      const balance = await contract.balanceOf(userAddress);
      return quais.formatUnits(balance, 18);
    },
    [getReadProvider]
  );

  const getAllLaunches = useCallback(async (): Promise<LaunchInfo[]> => {
    const quais = await import("quais");
    const provider = await getReadProvider();

    // Fetch V1 launches
    const v1Contract = new quais.Contract(
      BONDING_FACTORY_ADDRESS,
      BondingCurveFactoryABI,
      provider
    );

    const total = Number(await v1Contract.getTotalLaunches());
    const v1Launches: LaunchInfo[] = total === 0
      ? []
      : (await v1Contract.getLaunchesPaginated(0, total)).map(
          (info: Record<string, unknown>, i: number) => ({
            launchId: i,
            tokenAddress: info.tokenAddress as string,
            curveAddress: info.curveAddress as string,
            creator: info.creator as string,
            name: info.name as string,
            symbol: info.symbol as string,
            description: info.description as string,
            imageUrl: info.imageUrl as string,
            website: info.website as string,
            twitter: info.twitter as string,
            telegram: info.telegram as string,
            createdAt: Number(info.createdAt),
            stakedAmount: quais.formatQuai(info.stakedAmount as bigint ?? 0n),
          })
        );

    // Fetch V2 launches (if factory configured)
    if (!BONDING_FACTORY_V2_ADDRESS) return v1Launches;

    try {
      const v2Contract = new quais.Contract(
        BONDING_FACTORY_V2_ADDRESS,
        BondingCurveFactoryV2ABI,
        provider
      );

      const totalV2 = Number(await v2Contract.getTotalLaunches());
      if (totalV2 === 0) return v1Launches;

      // V2 LaunchInfo lacks metadata — read name/symbol from token contracts
      const v2Launches: LaunchInfo[] = await Promise.all(
        Array.from({ length: totalV2 }, async (_, i) => {
          const info = await v2Contract.getLaunchInfo(i);
          let tokenName = "";
          let tokenSymbol = "";
          try {
            const tokenContract = new quais.Contract(
              info.tokenAddress,
              BondingCurveTokenV2ABI,
              provider
            );
            [tokenName, tokenSymbol] = await Promise.all([
              tokenContract.name(),
              tokenContract.symbol(),
            ]);
          } catch {
            // fallback if token read fails
          }
          return {
            launchId: total + i, // offset to avoid ID collision with V1
            tokenAddress: info.tokenAddress as string,
            curveAddress: info.curveAddress as string,
            creator: info.creator as string,
            name: tokenName,
            symbol: tokenSymbol,
            description: "",
            imageUrl: "",
            website: "",
            twitter: "",
            telegram: "",
            createdAt: Number(info.createdAt),
            stakedAmount: "0",
          };
        })
      );

      return [...v1Launches, ...v2Launches];
    } catch {
      // V2 factory not available, return V1 only
      return v1Launches;
    }
  }, [getReadProvider]);

  const getLaunchesByCreator = useCallback(async (creatorAddress: string): Promise<LaunchInfo[]> => {
    const quais = await import("quais");
    const provider = await getReadProvider();
    const contract = new quais.Contract(
      BONDING_FACTORY_ADDRESS,
      BondingCurveFactoryABI,
      provider
    );

    const launchIds: bigint[] = await contract.getLaunchesByCreator(creatorAddress);
    const launches: LaunchInfo[] = [];

    for (const id of launchIds) {
      const info = await contract.getLaunchInfo(Number(id));
      launches.push({
        launchId: Number(id),
        tokenAddress: info.tokenAddress,
        curveAddress: info.curveAddress,
        creator: info.creator,
        name: info.name,
        symbol: info.symbol,
        description: info.description,
        imageUrl: info.imageUrl,
        website: info.website,
        twitter: info.twitter,
        telegram: info.telegram,
        createdAt: Number(info.createdAt),
        stakedAmount: quais.formatQuai(info.stakedAmount ?? 0n),
      });
    }

    return launches;
  }, [getReadProvider]);

  return {
    launchToken,
    launchTokenWithTokenomics,
    buyTokens,
    buyTokensChunked,
    sellTokens,
    getCurveState,
    getBuyQuote,
    getSellQuote,
    getTokenBalance,
    getAllLaunches,
    getLaunchesByCreator,
    isLaunching,
    isBuying,
    isSelling,
  };
}
