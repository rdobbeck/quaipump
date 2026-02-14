"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { useAppState } from "@/app/store";
import { NETWORK, QUAI_USD_PRICE } from "@/lib/constants";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface Trade {
  type: "buy" | "sell";
  quaiAmount: string;
  tokenAmount: string;
  blockNumber: number;
  txHash: string;
  venue: "curve" | "pool";
}

interface UserTradeHistoryProps {
  curveAddress: string;
  tokenSymbol: string;
  graduated: boolean;
  poolAddress?: string;
}

// Estimate seconds ago from block number difference (~2s per block on Quai)
function blocksAgo(currentBlock: number, eventBlock: number): string {
  const diff = currentBlock - eventBlock;
  const seconds = diff * 2;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function UserTradeHistory({
  curveAddress,
  tokenSymbol,
  graduated,
  poolAddress,
}: UserTradeHistoryProps) {
  const { account } = useAppState();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestBlock, setLatestBlock] = useState(0);

  useEffect(() => {
    if (!account) {
      setTrades([]);
      return;
    }
    let cancelled = false;

    const fetchTrades = async () => {
      setLoading(true);
      try {
        const quais = await import("quais");
        const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
        const allTrades: Trade[] = [];

        const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
        if (!cancelled) setLatestBlock(currentBlock);
        const fromBlock = Math.max(0, currentBlock - 5000);

        // Query bonding curve events
        const curve = new quais.Contract(curveAddress, BondingCurveABI, provider);

        try {
          const buyFilter = curve.filters.TokensPurchased(account);
          const buyEvents = await curve.queryFilter(buyFilter, fromBlock, currentBlock);
          for (const ev of buyEvents) {
            const log = ev as unknown as { args: [string, bigint, bigint, bigint]; blockNumber: number; transactionHash: string };
            allTrades.push({
              type: "buy",
              quaiAmount: quais.formatQuai(log.args[1]),
              tokenAmount: quais.formatUnits(log.args[2], 18),
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
              venue: "curve",
            });
          }
        } catch {}

        try {
          const sellFilter = curve.filters.TokensSold(account);
          const sellEvents = await curve.queryFilter(sellFilter, fromBlock, currentBlock);
          for (const ev of sellEvents) {
            const log = ev as unknown as { args: [string, bigint, bigint, bigint]; blockNumber: number; transactionHash: string };
            allTrades.push({
              type: "sell",
              quaiAmount: quais.formatQuai(log.args[2]),
              tokenAmount: quais.formatUnits(log.args[1], 18),
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
              venue: "curve",
            });
          }
        } catch {}

        // Query graduated pool events
        if (graduated && poolAddress) {
          try {
            const pool = new quais.Contract(poolAddress, GraduatedPoolABI, provider);
            const swapFilter = pool.filters.Swap(account);
            const swapEvents = await pool.queryFilter(swapFilter, fromBlock, currentBlock);
            for (const ev of swapEvents) {
              const log = ev as unknown as { args: [string, bigint, bigint, bigint]; blockNumber: number; transactionHash: string };
              const quaiIn = log.args[1];
              const isBuy = quaiIn > 0n;
              allTrades.push({
                type: isBuy ? "buy" : "sell",
                quaiAmount: isBuy
                  ? quais.formatQuai(quaiIn)
                  : quais.formatQuai(log.args[3]),
                tokenAmount: isBuy
                  ? quais.formatUnits(log.args[3], 18)
                  : quais.formatUnits(log.args[2], 18),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
                venue: "pool",
              });
            }
          } catch {}
        }

        if (!cancelled) {
          allTrades.sort((a, b) => b.blockNumber - a.blockNumber);
          setTrades(allTrades);
        }
      } catch {
        // Fetch failed
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrades();
    return () => { cancelled = true; };
  }, [account, curveAddress, graduated, poolAddress]);

  if (!account) return null;

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={5}
    >
      <Text
        fontSize="xs"
        fontWeight="600"
        color="var(--accent)"
        textTransform="uppercase"
        letterSpacing="0.05em"
        mb={4}
      >
        Your Trades
      </Text>

      {loading ? (
        <VStack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Box key={i} className="skeleton-shimmer" h="32px" w="100%" />
          ))}
        </VStack>
      ) : trades.length === 0 ? (
        <Text fontSize="xs" color="var(--text-tertiary)" textAlign="center" py={4}>
          No trades yet on this token
        </Text>
      ) : (
        <VStack spacing={0} align="stretch">
          {/* Header */}
          <Flex
            py={1.5}
            px={2}
            fontSize="10px"
            color="var(--text-tertiary)"
            textTransform="uppercase"
            borderBottom="1px solid"
            borderColor="var(--border)"
          >
            <Text flex={1}>Type</Text>
            <Text flex={2} textAlign="right">{tokenSymbol}</Text>
            <Text flex={2} textAlign="right">QUAI</Text>
            <Text flex={1.5} textAlign="right" display={{ base: "none", sm: "block" }}>USD</Text>
            <Text flex={1.5} textAlign="right">When</Text>
          </Flex>

          {trades.map((t, i) => {
            const quaiVal = parseFloat(t.quaiAmount);
            const usdVal = quaiVal * QUAI_USD_PRICE;
            return (
              <Flex
                key={`${t.txHash}-${i}`}
                py={2}
                px={2}
                fontSize="xs"
                borderBottom="1px solid"
                borderColor="var(--border)"
                _hover={{ bg: "var(--bg-elevated)" }}
                align="center"
              >
                <Flex flex={1} align="center" gap={1}>
                  <Box
                    w="6px"
                    h="6px"
                    rounded="full"
                    bg={t.type === "buy" ? "var(--accent)" : "var(--sell)"}
                  />
                  <Text
                    color={t.type === "buy" ? "var(--accent)" : "var(--sell)"}
                    fontWeight="600"
                    fontSize="11px"
                  >
                    {t.type === "buy" ? "BUY" : "SELL"}
                  </Text>
                </Flex>
                <Text
                  flex={2}
                  textAlign="right"
                  fontFamily="mono"
                  color="var(--text-primary)"
                  fontSize="11px"
                >
                  {parseFloat(t.tokenAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
                <Text
                  flex={2}
                  textAlign="right"
                  fontFamily="mono"
                  color="var(--text-secondary)"
                  fontSize="11px"
                >
                  {quaiVal.toFixed(4)}
                </Text>
                <Text
                  flex={1.5}
                  textAlign="right"
                  fontFamily="mono"
                  color="var(--text-tertiary)"
                  fontSize="11px"
                  display={{ base: "none", sm: "block" }}
                >
                  ${usdVal.toFixed(4)}
                </Text>
                <Text
                  flex={1.5}
                  textAlign="right"
                  color="var(--text-tertiary)"
                  fontSize="10px"
                >
                  {latestBlock > 0 ? blocksAgo(latestBlock, t.blockNumber) : `#${t.blockNumber}`}
                </Text>
              </Flex>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}
