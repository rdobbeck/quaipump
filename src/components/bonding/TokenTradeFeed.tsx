"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Flex, Text, VStack, Link } from "@chakra-ui/react";
import { NETWORK, QUAI_USD_PRICE } from "@/lib/constants";
import { shortenAddress, getExplorerAddressUrl } from "@/lib/utils";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface Trade {
  type: "buy" | "sell";
  user: string;
  quaiAmount: number;
  tokenAmount: number;
  blockNumber: number;
}

interface TokenTradeFeedProps {
  curveAddress: string;
  tokenSymbol: string;
  graduated: boolean;
  poolAddress?: string;
}

const LOOKBACK_BLOCKS = 5000;
const POLL_INTERVAL = 20_000;
const MAX_TRADES = 50;

export function TokenTradeFeed({
  curveAddress,
  tokenSymbol,
  graduated,
  poolAddress,
}: TokenTradeFeedProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    try {
      const quais = await import("quais");
      const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
      const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
      const fromBlock = Math.max(0, currentBlock - LOOKBACK_BLOCKS);

      const allTrades: Trade[] = [];

      if (graduated && poolAddress) {
        // Query Swap events from graduated pool
        const pool = new quais.Contract(poolAddress, GraduatedPoolABI, provider);
        const events = await pool.queryFilter("Swap", fromBlock, currentBlock);

        for (const ev of events) {
          const log = ev as unknown as {
            args: [string, boolean, bigint, bigint];
            blockNumber: number;
          };
          const quaiIn = log.args[1];
          const amountIn = parseFloat(
            quaiIn ? quais.formatQuai(log.args[2]) : quais.formatUnits(log.args[2], 18)
          );
          const amountOut = parseFloat(
            quaiIn ? quais.formatUnits(log.args[3], 18) : quais.formatQuai(log.args[3])
          );

          allTrades.push({
            type: quaiIn ? "buy" : "sell",
            user: log.args[0],
            quaiAmount: quaiIn ? amountIn : amountOut,
            tokenAmount: quaiIn ? amountOut : amountIn,
            blockNumber: log.blockNumber,
          });
        }
      } else {
        // Query bonding curve events
        const contract = new quais.Contract(curveAddress, BondingCurveABI, provider);
        const [buyEvents, sellEvents] = await Promise.all([
          contract.queryFilter("TokensPurchased", fromBlock, currentBlock),
          contract.queryFilter("TokensSold", fromBlock, currentBlock),
        ]);

        for (const ev of buyEvents) {
          const log = ev as unknown as {
            args: [string, bigint, bigint, bigint];
            blockNumber: number;
          };
          allTrades.push({
            type: "buy",
            user: log.args[0],
            quaiAmount: parseFloat(quais.formatQuai(log.args[1])),
            tokenAmount: parseFloat(quais.formatUnits(log.args[2], 18)),
            blockNumber: log.blockNumber,
          });
        }

        for (const ev of sellEvents) {
          const log = ev as unknown as {
            args: [string, bigint, bigint, bigint];
            blockNumber: number;
          };
          allTrades.push({
            type: "sell",
            user: log.args[0],
            quaiAmount: parseFloat(quais.formatQuai(log.args[2])),
            tokenAmount: parseFloat(quais.formatUnits(log.args[1], 18)),
            blockNumber: log.blockNumber,
          });
        }
      }

      allTrades.sort((a, b) => b.blockNumber - a.blockNumber);
      setTrades(allTrades.slice(0, MAX_TRADES));
    } catch {
      // Trade feed unavailable
    } finally {
      setLoading(false);
    }
  }, [curveAddress, graduated, poolAddress]);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const formatAmount = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    if (n < 0.01) return n.toFixed(4);
    if (n < 1) return n.toFixed(3);
    return n.toFixed(2);
  };

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={4}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontSize="xs" fontWeight="600" color="var(--text-primary)">
          Recent Trades
        </Text>
        <Text fontSize="10px" color="var(--text-tertiary)">
          {trades.length} trades
        </Text>
      </Flex>

      {loading ? (
        <VStack spacing={2} align="stretch">
          {[...Array(5)].map((_, i) => (
            <Box key={i} className="skeleton-shimmer" h="32px" rounded="lg" />
          ))}
        </VStack>
      ) : trades.length === 0 ? (
        <Flex
          h="80px"
          align="center"
          justify="center"
          bg="var(--bg-elevated)"
          rounded="lg"
        >
          <Text fontSize="xs" color="var(--text-tertiary)">
            No trades yet
          </Text>
        </Flex>
      ) : (
        <Box maxH="360px" overflowY="auto" className="featured-scroll">
          {/* Header */}
          <Flex
            px={2}
            py={1.5}
            fontSize="9px"
            color="var(--text-tertiary)"
            textTransform="uppercase"
            letterSpacing="0.5px"
            position="sticky"
            top={0}
            bg="var(--bg-surface)"
            zIndex={1}
          >
            <Text flex="0 0 50px">Type</Text>
            <Text flex={1}>Trader</Text>
            <Text flex="0 0 90px" textAlign="right">QUAI</Text>
            <Text flex="0 0 100px" textAlign="right">{tokenSymbol}</Text>
            <Text flex="0 0 70px" textAlign="right">USD</Text>
          </Flex>

          <VStack spacing={0} align="stretch">
            {trades.map((trade, i) => (
              <Flex
                key={`${trade.blockNumber}-${trade.user}-${i}`}
                px={2}
                py={2}
                align="center"
                fontSize="xs"
                borderTop="1px solid"
                borderColor="var(--border)"
                _hover={{ bg: "var(--bg-elevated)" }}
                transition="background 0.1s"
              >
                {/* Type indicator */}
                <Flex flex="0 0 50px" align="center" gap={1.5}>
                  <Box
                    w="6px"
                    h="6px"
                    rounded="full"
                    bg={trade.type === "buy" ? "var(--accent)" : "var(--sell)"}
                  />
                  <Text
                    fontWeight="600"
                    color={
                      trade.type === "buy" ? "var(--accent)" : "var(--sell)"
                    }
                    fontSize="10px"
                    textTransform="uppercase"
                  >
                    {trade.type}
                  </Text>
                </Flex>

                {/* Trader */}
                <Link
                  flex={1}
                  href={getExplorerAddressUrl(trade.user)}
                  isExternal
                  fontFamily="mono"
                  fontSize="11px"
                  color="var(--text-secondary)"
                  _hover={{ color: "var(--accent)", textDecoration: "none" }}
                >
                  {shortenAddress(trade.user)}
                </Link>

                {/* QUAI amount */}
                <Text
                  flex="0 0 90px"
                  textAlign="right"
                  fontFamily="mono"
                  fontSize="11px"
                  color="var(--text-primary)"
                >
                  {formatAmount(trade.quaiAmount)}
                </Text>

                {/* Token amount */}
                <Text
                  flex="0 0 100px"
                  textAlign="right"
                  fontFamily="mono"
                  fontSize="11px"
                  color="var(--text-secondary)"
                >
                  {formatAmount(trade.tokenAmount)}
                </Text>

                {/* USD value */}
                <Text
                  flex="0 0 70px"
                  textAlign="right"
                  fontFamily="mono"
                  fontSize="11px"
                  color="var(--text-tertiary)"
                >
                  ${(trade.quaiAmount * QUAI_USD_PRICE).toFixed(3)}
                </Text>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
