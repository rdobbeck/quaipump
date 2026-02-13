"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Box, Flex, Text, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import { NETWORK, QUAI_USD_PRICE } from "@/lib/constants";
import { shortenAddress } from "@/lib/utils";
import type { LaunchInfo, CurveState } from "@/hooks/useBondingCurve";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface FeedTrade {
  type: "buy" | "sell";
  user: string;
  quaiAmount: number;
  symbol: string;
  curveAddress: string;
  blockNumber: number;
}

interface LiveTradeFeedProps {
  launches: LaunchInfo[];
  curveStates?: Record<string, CurveState>;
}

const MAX_FEED_ITEMS = 50;
const POLL_INTERVAL = 15_000;
const LOOKBACK_BLOCKS = 2000;
const MAX_QUERY_CURVES = 30;

export function LiveTradeFeed({ launches, curveStates }: LiveTradeFeedProps) {
  const [trades, setTrades] = useState<FeedTrade[]>([]);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTrades = useCallback(async () => {
    if (launches.length === 0) return;

    try {
      const quais = await import("quais");
      const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
      const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
      const fromBlock = Math.max(0, currentBlock - LOOKBACK_BLOCKS);

      const symbolMap = new Map<string, string>();
      for (const l of launches) {
        symbolMap.set(l.curveAddress.toLowerCase(), l.symbol);
      }

      const allTrades: FeedTrade[] = [];
      const queryLaunches = launches.slice(0, MAX_QUERY_CURVES);

      const promises = queryLaunches.map(async (launch) => {
        const symbol =
          symbolMap.get(launch.curveAddress.toLowerCase()) || launch.symbol;

        // Check if graduated with a pool
        const state = curveStates?.[launch.curveAddress];
        const graduated = state?.graduated ?? false;
        const poolAddress = state?.pool;

        try {
          if (graduated && poolAddress) {
            // Query graduated pool Swap events
            const pool = new quais.Contract(poolAddress, GraduatedPoolABI, provider);
            const events = await pool.queryFilter("Swap", fromBlock, currentBlock);

            for (const ev of events) {
              const log = ev as unknown as {
                args: [string, boolean, bigint, bigint];
                blockNumber: number;
              };
              const quaiIn = log.args[1];
              const amountIn = quaiIn
                ? parseFloat(quais.formatQuai(log.args[2]))
                : parseFloat(quais.formatQuai(log.args[3]));

              allTrades.push({
                type: quaiIn ? "buy" : "sell",
                user: log.args[0],
                quaiAmount: amountIn,
                symbol,
                curveAddress: launch.curveAddress,
                blockNumber: log.blockNumber,
              });
            }
          } else {
            // Query bonding curve events
            const contract = new quais.Contract(
              launch.curveAddress,
              BondingCurveABI,
              provider
            );

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
                symbol,
                curveAddress: launch.curveAddress,
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
                symbol,
                curveAddress: launch.curveAddress,
                blockNumber: log.blockNumber,
              });
            }
          }
        } catch {
          // Skip curves that fail to query
        }
      });

      await Promise.all(promises);

      allTrades.sort((a, b) => b.blockNumber - a.blockNumber);
      setTrades(allTrades.slice(0, MAX_FEED_ITEMS));
    } catch {
      // Feed query failed
    }
  }, [launches, curveStates]);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  if (trades.length === 0) return null;

  const formatQuai = (amount: number): string => {
    if (amount < 0.01) return amount.toFixed(4);
    if (amount < 1) return amount.toFixed(3);
    if (amount < 100) return amount.toFixed(2);
    return amount.toFixed(1);
  };

  // Duplicate for seamless loop
  const feedItems = [...trades, ...trades];

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      mb={4}
      overflow="hidden"
    >
      {/* Ticker bar */}
      <Box
        position="relative"
        h="36px"
        overflow="hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          w="40px"
          bg="linear-gradient(to right, var(--bg-surface), transparent)"
          zIndex={2}
          pointerEvents="none"
        />
        <Box
          position="absolute"
          right={0}
          top={0}
          bottom={0}
          w="40px"
          bg="linear-gradient(to left, var(--bg-surface), transparent)"
          zIndex={2}
          pointerEvents="none"
        />

        <Box
          ref={scrollRef}
          display="flex"
          alignItems="center"
          h="100%"
          whiteSpace="nowrap"
          css={{
            animation: `ticker ${Math.max(trades.length * 3, 30)}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
            "@keyframes ticker": {
              "0%": { transform: "translateX(0)" },
              "100%": { transform: "translateX(-50%)" },
            },
          }}
        >
          {feedItems.map((trade, i) => (
            <Text
              key={`${trade.curveAddress}-${trade.blockNumber}-${i}`}
              as="span"
              display="inline-flex"
              alignItems="center"
              px={3}
              fontSize="xs"
              fontFamily="mono"
              color="var(--text-secondary)"
              flexShrink={0}
            >
              <Text
                as="span"
                color={trade.type === "buy" ? "var(--accent)" : "var(--sell)"}
                mr={1.5}
              >
                {trade.type === "buy" ? "\u25B2" : "\u25BC"}
              </Text>
              <Text as="span" color="var(--text-tertiary)" mr={1}>
                {shortenAddress(trade.user)}
              </Text>
              <Text as="span" mr={1}>
                {trade.type === "buy" ? "bought" : "sold"}
              </Text>
              <Text as="span" color="var(--text-primary)" fontWeight="600" mr={1}>
                {formatQuai(trade.quaiAmount)} QUAI
              </Text>
              <Text as="span" mr={1}>of</Text>
              <Text
                as="span"
                color={trade.type === "buy" ? "var(--accent)" : "var(--sell)"}
                fontWeight="600"
              >
                ${trade.symbol}
              </Text>
              <Text as="span" color="var(--border)" mx={2}>
                |
              </Text>
            </Text>
          ))}
        </Box>
      </Box>

      {/* Expanded recent trades list */}
      <Box
        borderTop="1px solid"
        borderColor="var(--border)"
        maxH="280px"
        overflowY="auto"
        className="featured-scroll"
      >
        {/* Header */}
        <Flex
          px={4}
          py={2}
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
          <Text flex="0 0 90px">Token</Text>
          <Text flex="0 0 90px" textAlign="right">QUAI</Text>
          <Text flex="0 0 70px" textAlign="right">USD</Text>
        </Flex>

        {trades.map((trade, i) => (
          <Link
            key={`${trade.curveAddress}-${trade.blockNumber}-${trade.user}-${i}`}
            as={NextLink}
            href={`/token/${trade.curveAddress}`}
            _hover={{ textDecoration: "none" }}
            display="block"
          >
            <Flex
              px={4}
              py={2}
              align="center"
              fontSize="xs"
              borderTop="1px solid"
              borderColor="var(--border)"
              _hover={{ bg: "var(--bg-elevated)" }}
              transition="background 0.1s"
            >
              <Flex flex="0 0 50px" align="center" gap={1.5}>
                <Box
                  w="6px"
                  h="6px"
                  rounded="full"
                  bg={trade.type === "buy" ? "var(--accent)" : "var(--sell)"}
                />
                <Text
                  fontWeight="600"
                  color={trade.type === "buy" ? "var(--accent)" : "var(--sell)"}
                  fontSize="10px"
                  textTransform="uppercase"
                >
                  {trade.type}
                </Text>
              </Flex>

              <Text
                flex={1}
                fontFamily="mono"
                fontSize="11px"
                color="var(--text-secondary)"
              >
                {shortenAddress(trade.user)}
              </Text>

              <Text
                flex="0 0 90px"
                fontFamily="mono"
                fontSize="11px"
                fontWeight="600"
                color={trade.type === "buy" ? "var(--accent)" : "var(--sell)"}
              >
                ${trade.symbol}
              </Text>

              <Text
                flex="0 0 90px"
                textAlign="right"
                fontFamily="mono"
                fontSize="11px"
                color="var(--text-primary)"
              >
                {formatQuai(trade.quaiAmount)}
              </Text>

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
          </Link>
        ))}
      </Box>
    </Box>
  );
}
