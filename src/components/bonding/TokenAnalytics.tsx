"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Flex, Text, VStack, HStack, Button } from "@chakra-ui/react";
import { NETWORK, QUAI_USD_PRICE } from "@/lib/constants";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface TradeEvent {
  type: "buy" | "sell";
  quaiAmount: number;
  blockNumber: number;
}

interface TokenAnalyticsProps {
  curveAddress: string;
  tokenSymbol: string;
  graduated: boolean;
  poolAddress?: string;
}

const CHART_HEIGHT = 120;

export function TokenAnalytics({
  curveAddress,
  graduated,
  poolAddress,
}: TokenAnalyticsProps) {
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"all" | "recent">("all");

  useEffect(() => {
    let cancelled = false;
    const fetchTrades = async () => {
      setLoading(true);
      try {
        const quais = await import("quais");
        const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
        const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
        const fromBlock = Math.max(0, currentBlock - 5000);
        const allTrades: TradeEvent[] = [];

        const curve = new quais.Contract(curveAddress, BondingCurveABI, provider);
        try {
          const buyEvents = await curve.queryFilter("TokensPurchased", fromBlock, currentBlock);
          for (const ev of buyEvents) {
            const log = ev as unknown as { args: [string, bigint, bigint, bigint]; blockNumber: number };
            allTrades.push({
              type: "buy",
              quaiAmount: parseFloat(quais.formatQuai(log.args[1])),
              blockNumber: log.blockNumber,
            });
          }
        } catch {}

        try {
          const sellEvents = await curve.queryFilter("TokensSold", fromBlock, currentBlock);
          for (const ev of sellEvents) {
            const log = ev as unknown as { args: [string, bigint, bigint, bigint]; blockNumber: number };
            allTrades.push({
              type: "sell",
              quaiAmount: parseFloat(quais.formatQuai(log.args[2])),
              blockNumber: log.blockNumber,
            });
          }
        } catch {}

        if (graduated && poolAddress) {
          try {
            const pool = new quais.Contract(poolAddress, GraduatedPoolABI, provider);
            const swapEvents = await pool.queryFilter("Swap", fromBlock, currentBlock);
            for (const ev of swapEvents) {
              const log = ev as unknown as { args: [string, bigint, bigint, bigint]; blockNumber: number };
              const quaiIn = parseFloat(quais.formatQuai(log.args[1]));
              allTrades.push({
                type: quaiIn > 0 ? "buy" : "sell",
                quaiAmount: quaiIn > 0 ? quaiIn : parseFloat(quais.formatQuai(log.args[3])),
                blockNumber: log.blockNumber,
              });
            }
          } catch {}
        }

        if (!cancelled) {
          allTrades.sort((a, b) => a.blockNumber - b.blockNumber);
          setTrades(allTrades);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    };
    fetchTrades();
    return () => { cancelled = true; };
  }, [curveAddress, graduated, poolAddress]);

  const filteredTrades = useMemo(() => {
    if (timeframe === "all") return trades;
    // "recent" = last 1000 blocks (~30 min)
    if (trades.length === 0) return [];
    const maxBlock = trades[trades.length - 1].blockNumber;
    return trades.filter((t) => t.blockNumber > maxBlock - 1000);
  }, [trades, timeframe]);

  const stats = useMemo(() => {
    const buys = filteredTrades.filter((t) => t.type === "buy");
    const sells = filteredTrades.filter((t) => t.type === "sell");
    const buyVolume = buys.reduce((sum, t) => sum + t.quaiAmount, 0);
    const sellVolume = sells.reduce((sum, t) => sum + t.quaiAmount, 0);
    const totalVolume = buyVolume + sellVolume;
    const buyRatio = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50;
    return {
      totalTrades: filteredTrades.length,
      buyCount: buys.length,
      sellCount: sells.length,
      buyVolume,
      sellVolume,
      totalVolume,
      buyRatio,
    };
  }, [filteredTrades]);

  // Volume bars (group into 20 buckets)
  const volumeBars = useMemo(() => {
    if (filteredTrades.length < 2) return [];
    const minBlock = filteredTrades[0].blockNumber;
    const maxBlock = filteredTrades[filteredTrades.length - 1].blockNumber;
    const range = maxBlock - minBlock || 1;
    const bucketCount = 20;
    const buckets: { buy: number; sell: number }[] = Array.from({ length: bucketCount }, () => ({ buy: 0, sell: 0 }));

    for (const t of filteredTrades) {
      const idx = Math.min(bucketCount - 1, Math.floor(((t.blockNumber - minBlock) / range) * bucketCount));
      if (t.type === "buy") buckets[idx].buy += t.quaiAmount;
      else buckets[idx].sell += t.quaiAmount;
    }

    const maxVol = Math.max(...buckets.map((b) => b.buy + b.sell), 0.001);
    return buckets.map((b) => ({
      buy: b.buy,
      sell: b.sell,
      total: b.buy + b.sell,
      height: ((b.buy + b.sell) / maxVol) * 100,
      buyPct: b.buy + b.sell > 0 ? (b.buy / (b.buy + b.sell)) * 100 : 50,
    }));
  }, [filteredTrades]);

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={5}
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="xs" fontWeight="600" color="var(--accent)" textTransform="uppercase" letterSpacing="0.05em">
          Analytics
        </Text>
        <HStack spacing={1}>
          {(["all", "recent"] as const).map((tf) => (
            <Button
              key={tf}
              size="xs"
              px={2}
              h="20px"
              fontSize="9px"
              rounded="md"
              bg={timeframe === tf ? "var(--accent)" : "var(--bg-elevated)"}
              color={timeframe === tf ? "#0b0b0f" : "var(--text-tertiary)"}
              _hover={{ borderColor: "var(--accent)" }}
              onClick={() => setTimeframe(tf)}
              textTransform="capitalize"
            >
              {tf === "all" ? "All Time" : "Recent"}
            </Button>
          ))}
        </HStack>
      </Flex>

      {loading ? (
        <VStack spacing={2}>
          <Box className="skeleton-shimmer" h="60px" w="100%" />
          <Box className="skeleton-shimmer" h={`${CHART_HEIGHT}px`} w="100%" />
        </VStack>
      ) : (
        <VStack spacing={4} align="stretch">
          {/* Stats grid */}
          <Flex gap={2} flexWrap="wrap">
            <StatBox label="Total Trades" value={stats.totalTrades.toString()} />
            <StatBox label="Buy Volume" value={`${stats.buyVolume.toFixed(2)} QUAI`} color="var(--accent)" />
            <StatBox label="Sell Volume" value={`${stats.sellVolume.toFixed(2)} QUAI`} color="var(--sell)" />
            <StatBox label="Total Volume" value={`$${(stats.totalVolume * QUAI_USD_PRICE).toFixed(2)}`} />
          </Flex>

          {/* Buy/Sell ratio bar */}
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="10px" color="var(--accent)">
                Buys {stats.buyCount} ({stats.buyRatio.toFixed(0)}%)
              </Text>
              <Text fontSize="10px" color="var(--sell)">
                Sells {stats.sellCount} ({(100 - stats.buyRatio).toFixed(0)}%)
              </Text>
            </Flex>
            <Box h="6px" bg="var(--sell)" rounded="full" overflow="hidden">
              <Box
                h="100%"
                w={`${stats.buyRatio}%`}
                bg="var(--accent)"
                rounded="full"
                transition="width 0.3s"
              />
            </Box>
          </Box>

          {/* Volume chart */}
          {volumeBars.length > 0 && (
            <Box>
              <Text fontSize="10px" color="var(--text-tertiary)" mb={2} textTransform="uppercase">
                Volume Distribution
              </Text>
              <Flex align="end" gap="2px" h={`${CHART_HEIGHT}px`}>
                {volumeBars.map((bar, i) => (
                  <Box key={i} flex={1} h="100%" display="flex" flexDirection="column" justifyContent="flex-end">
                    <Box
                      h={`${bar.height}%`}
                      minH="2px"
                      rounded="sm"
                      overflow="hidden"
                    >
                      <Box h={`${bar.buyPct}%`} bg="var(--accent)" opacity={0.8} />
                      <Box h={`${100 - bar.buyPct}%`} bg="var(--sell)" opacity={0.8} />
                    </Box>
                  </Box>
                ))}
              </Flex>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box flex={1} minW="100px" bg="var(--bg-elevated)" rounded="lg" p={2.5} border="1px solid" borderColor="var(--border)">
      <Text fontSize="9px" color="var(--text-tertiary)" textTransform="uppercase" mb={0.5}>
        {label}
      </Text>
      <Text fontSize="xs" fontWeight="600" fontFamily="mono" color={color || "var(--text-primary)"}>
        {value}
      </Text>
    </Box>
  );
}
