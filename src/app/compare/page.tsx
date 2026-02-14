"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Container,
  Flex,
  HStack,
  Text,
  Button,
  VStack,
  Input,
} from "@chakra-ui/react";
import { useLaunchData } from "@/hooks/useLaunchData";
import { NETWORK, QUAI_USD_PRICE } from "@/lib/constants";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface PricePoint {
  block: number;
  price: number;
}

interface ChartToken {
  curveAddress: string;
  symbol: string;
  name: string;
  color: string;
  graduated: boolean;
  poolAddress?: string;
}

const COLORS = ["#00e676", "#ff5252", "#448aff", "#ffd740"];
const CHART_HEIGHT = 300;

export default function ComparePage() {
  const { launches, curveStates } = useLaunchData();
  const [selected, setSelected] = useState<ChartToken[]>([]);
  const [search, setSearch] = useState("");
  const [priceData, setPriceData] = useState<Record<string, PricePoint[]>>({});
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return launches.slice(0, 8);
    const q = search.toLowerCase().trim();
    return launches
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.symbol.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [launches, search]);

  const addToken = useCallback(
    (addr: string) => {
      if (selected.length >= 4) return;
      if (selected.some((s) => s.curveAddress === addr)) return;
      const l = launches.find((x) => x.curveAddress === addr);
      if (!l) return;
      const s = curveStates[addr];
      setSelected((prev) => [
        ...prev,
        {
          curveAddress: addr,
          symbol: l.symbol,
          name: l.name,
          color: COLORS[prev.length % COLORS.length],
          graduated: s?.graduated ?? false,
          poolAddress: s?.pool,
        },
      ]);
      setSearch("");
    },
    [selected, launches, curveStates]
  );

  const removeToken = useCallback((addr: string) => {
    setSelected((prev) => {
      const next = prev.filter((s) => s.curveAddress !== addr);
      return next.map((s, i) => ({ ...s, color: COLORS[i % COLORS.length] }));
    });
    setPriceData((prev) => {
      const next = { ...prev };
      delete next[addr];
      return next;
    });
  }, []);

  // Fetch price data for selected tokens
  useEffect(() => {
    if (selected.length === 0) return;
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      const quais = await import("quais");
      const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
      const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
      const fromBlock = Math.max(0, currentBlock - 5000);

      const result: Record<string, PricePoint[]> = {};

      for (const tok of selected) {
        if (priceData[tok.curveAddress]?.length) {
          result[tok.curveAddress] = priceData[tok.curveAddress];
          continue;
        }

        const points: PricePoint[] = [];
        try {
          if (tok.graduated && tok.poolAddress) {
            const pool = new quais.Contract(tok.poolAddress, GraduatedPoolABI, provider);
            const events = await pool.queryFilter("Swap", fromBlock, currentBlock);
            for (const ev of events) {
              const log = ev as unknown as { args: [string, bigint, bigint, bigint]; blockNumber: number };
              const amtIn = parseFloat(quais.formatQuai(log.args[1]));
              const amtOut = parseFloat(quais.formatUnits(log.args[2], 18));
              if (amtOut > 0) {
                points.push({ block: log.blockNumber, price: (amtIn / amtOut) * QUAI_USD_PRICE });
              }
            }
          } else {
            const curve = new quais.Contract(tok.curveAddress, BondingCurveABI, provider);
            const buyEvents = await curve.queryFilter("TokensPurchased", fromBlock, currentBlock);
            for (const ev of buyEvents) {
              const log = ev as unknown as { args: [string, bigint, bigint, bigint]; blockNumber: number };
              const quaiSpent = parseFloat(quais.formatQuai(log.args[1]));
              const tokensReceived = parseFloat(quais.formatUnits(log.args[2], 18));
              if (tokensReceived > 0) {
                points.push({ block: log.blockNumber, price: (quaiSpent / tokensReceived) * QUAI_USD_PRICE });
              }
            }
          }
        } catch {}
        points.sort((a, b) => a.block - b.block);
        result[tok.curveAddress] = points;
      }

      if (!cancelled) {
        setPriceData(result);
        setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.length]);

  // Normalize all series to percentage change for overlay
  const normalizedData = useMemo(() => {
    const result: Record<string, { block: number; pct: number }[]> = {};
    for (const tok of selected) {
      const pts = priceData[tok.curveAddress];
      if (!pts || pts.length < 2) continue;
      const basePrice = pts[0].price;
      if (basePrice <= 0) continue;
      result[tok.curveAddress] = pts.map((p) => ({
        block: p.block,
        pct: ((p.price - basePrice) / basePrice) * 100,
      }));
    }
    return result;
  }, [selected, priceData]);

  // Find global min/max for chart scaling
  const { minPct, maxPct, minBlock, maxBlock } = useMemo(() => {
    let min = 0, max = 0, minB = Infinity, maxB = 0;
    for (const pts of Object.values(normalizedData)) {
      for (const p of pts) {
        if (p.pct < min) min = p.pct;
        if (p.pct > max) max = p.pct;
        if (p.block < minB) minB = p.block;
        if (p.block > maxB) maxB = p.block;
      }
    }
    return { minPct: min, maxPct: max || 1, minBlock: minB, maxBlock: maxB || 1 };
  }, [normalizedData]);

  const range = maxPct - minPct || 1;
  const blockRange = maxBlock - minBlock || 1;

  return (
    <Container maxW="container.xl" py={6}>
      <Text fontSize="xl" fontWeight="700" color="var(--text-primary)" mb={1}>
        Compare Tokens
      </Text>
      <Text fontSize="xs" color="var(--text-tertiary)" mb={6}>
        Overlay price charts for up to 4 tokens
      </Text>

      {/* Token selector */}
      <Flex gap={3} mb={4} flexWrap="wrap" align="start">
        <Box flex={1} minW="200px" position="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token to add..."
            size="sm"
            bg="var(--bg-elevated)"
            border="1px solid"
            borderColor="var(--border)"
            color="var(--text-primary)"
            rounded="lg"
            _placeholder={{ color: "var(--text-tertiary)" }}
            _focus={{ borderColor: "var(--accent)", boxShadow: "none" }}
          />
          {search.trim() && (
            <Box
              position="absolute"
              top="100%"
              left={0}
              right={0}
              mt={1}
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              rounded="lg"
              zIndex={10}
              maxH="200px"
              overflowY="auto"
            >
              {filtered.map((l) => {
                const already = selected.some((s) => s.curveAddress === l.curveAddress);
                return (
                  <Flex
                    key={l.curveAddress}
                    px={3}
                    py={2}
                    align="center"
                    justify="space-between"
                    _hover={{ bg: "var(--bg-elevated)" }}
                    cursor={already ? "default" : "pointer"}
                    opacity={already ? 0.4 : 1}
                    onClick={() => !already && addToken(l.curveAddress)}
                  >
                    <Box>
                      <Text fontSize="xs" color="var(--text-primary)" fontWeight="500">
                        {l.name}
                      </Text>
                      <Text fontSize="10px" fontFamily="mono" color="var(--text-tertiary)">
                        ${l.symbol}
                      </Text>
                    </Box>
                    {already && (
                      <Text fontSize="10px" color="var(--text-tertiary)">Added</Text>
                    )}
                  </Flex>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Selected pills */}
        <HStack spacing={2} flexWrap="wrap">
          {selected.map((tok) => (
            <Button
              key={tok.curveAddress}
              size="xs"
              px={3}
              rounded="full"
              bg="var(--bg-elevated)"
              color="var(--text-primary)"
              border="2px solid"
              borderColor={tok.color}
              fontWeight="600"
              _hover={{ bg: "var(--bg-surface)" }}
              onClick={() => removeToken(tok.curveAddress)}
              rightIcon={
                <Text color="var(--text-tertiary)" fontSize="10px" ml={-1}>x</Text>
              }
            >
              ${tok.symbol}
            </Button>
          ))}
          {selected.length < 4 && selected.length > 0 && (
            <Text fontSize="10px" color="var(--text-tertiary)">
              {4 - selected.length} more
            </Text>
          )}
        </HStack>
      </Flex>

      {/* Chart */}
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        rounded="xl"
        p={4}
      >
        {selected.length === 0 ? (
          <Flex h={`${CHART_HEIGHT}px`} align="center" justify="center">
            <Text fontSize="sm" color="var(--text-tertiary)">
              Select tokens above to compare price performance
            </Text>
          </Flex>
        ) : loading ? (
          <Box className="skeleton-shimmer" h={`${CHART_HEIGHT}px`} rounded="lg" />
        ) : Object.keys(normalizedData).length === 0 ? (
          <Flex h={`${CHART_HEIGHT}px`} align="center" justify="center">
            <Text fontSize="sm" color="var(--text-tertiary)">
              Not enough trade data for comparison
            </Text>
          </Flex>
        ) : (
          <VStack spacing={2} align="stretch">
            {/* Legend */}
            <Flex gap={4} flexWrap="wrap">
              {selected.map((tok) => {
                const pts = normalizedData[tok.curveAddress];
                const lastPct = pts?.[pts.length - 1]?.pct ?? 0;
                return (
                  <HStack key={tok.curveAddress} spacing={1.5}>
                    <Box w="10px" h="3px" rounded="full" bg={tok.color} />
                    <Text fontSize="11px" fontWeight="600" color="var(--text-primary)">
                      ${tok.symbol}
                    </Text>
                    <Text
                      fontSize="10px"
                      fontFamily="mono"
                      color={lastPct >= 0 ? "var(--accent)" : "var(--sell)"}
                    >
                      {lastPct >= 0 ? "+" : ""}{lastPct.toFixed(1)}%
                    </Text>
                  </HStack>
                );
              })}
            </Flex>

            {/* SVG chart */}
            <svg
              viewBox={`0 0 100 ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              width="100%"
              height={CHART_HEIGHT}
              style={{ display: "block" }}
              onMouseLeave={() => {}}
            >
              {/* Zero line */}
              {minPct < 0 && (
                <line
                  x1="0"
                  y1={CHART_HEIGHT - 4 - ((0 - minPct) / range) * (CHART_HEIGHT - 8)}
                  x2="100"
                  y2={CHART_HEIGHT - 4 - ((0 - minPct) / range) * (CHART_HEIGHT - 8)}
                  stroke="var(--border)"
                  strokeWidth="0.3"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="4 4"
                />
              )}

              {selected.map((tok) => {
                const pts = normalizedData[tok.curveAddress];
                if (!pts || pts.length < 2) return null;

                const path = pts
                  .map((p, i) => {
                    const x = ((p.block - minBlock) / blockRange) * 96 + 2;
                    const y = CHART_HEIGHT - 4 - ((p.pct - minPct) / range) * (CHART_HEIGHT - 8);
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .join(" ");

                return (
                  <path
                    key={tok.curveAddress}
                    d={path}
                    fill="none"
                    stroke={tok.color}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    opacity={0.9}
                  />
                );
              })}
            </svg>

            {/* Y-axis labels */}
            <Flex justify="space-between" px={1}>
              <Text fontSize="9px" fontFamily="mono" color="var(--text-tertiary)">
                {minPct >= 0 ? "+" : ""}{minPct.toFixed(0)}%
              </Text>
              <Text fontSize="9px" fontFamily="mono" color="var(--text-tertiary)">
                {maxPct >= 0 ? "+" : ""}{maxPct.toFixed(0)}%
              </Text>
            </Flex>
          </VStack>
        )}
      </Box>
    </Container>
  );
}
