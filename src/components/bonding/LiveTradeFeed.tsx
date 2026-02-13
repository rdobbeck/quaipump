"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Box, Text } from "@chakra-ui/react";
import { NETWORK } from "@/lib/constants";
import { shortenAddress } from "@/lib/utils";
import type { LaunchInfo } from "@/hooks/useBondingCurve";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";

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
}

const MAX_FEED_ITEMS = 30;
const POLL_INTERVAL = 15_000;
const LOOKBACK_BLOCKS = 500;

export function LiveTradeFeed({ launches }: LiveTradeFeedProps) {
  const [trades, setTrades] = useState<FeedTrade[]>([]);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const curveToSymbol = useCallback(() => {
    const map = new Map<string, string>();
    for (const l of launches) {
      map.set(l.curveAddress.toLowerCase(), l.symbol);
    }
    return map;
  }, [launches]);

  const fetchTrades = useCallback(async () => {
    if (launches.length === 0) return;

    try {
      const quais = await import("quais");
      const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
      const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
      const fromBlock = Math.max(0, currentBlock - LOOKBACK_BLOCKS);
      const symbolMap = curveToSymbol();

      const allTrades: FeedTrade[] = [];
      const recentLaunches = launches.slice(0, 20);

      const promises = recentLaunches.map(async (launch) => {
        try {
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
              symbol: symbolMap.get(launch.curveAddress.toLowerCase()) || launch.symbol,
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
              symbol: symbolMap.get(launch.curveAddress.toLowerCase()) || launch.symbol,
              curveAddress: launch.curveAddress,
              blockNumber: log.blockNumber,
            });
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
  }, [launches, curveToSymbol]);

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

  const feedItems = [...trades, ...trades];

  return (
    <Box
      position="relative"
      bg="var(--bg-surface)"
      borderBottom="1px solid"
      borderColor="var(--border)"
      h="36px"
      overflow="hidden"
      mb={4}
      rounded="lg"
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
  );
}
