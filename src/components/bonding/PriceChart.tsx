"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { NETWORK, QUAI_USD_PRICE } from "@/lib/constants";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface PricePoint {
  block: number;
  price: number;
}

interface PriceChartProps {
  curveAddress: string;
  graduated: boolean;
  poolAddress?: string;
  currentPrice: number;
}

const LOOKBACK_BLOCKS = 5000;
const CHART_HEIGHT = 200;
const CHART_PADDING = 4;

export function PriceChart({ curveAddress, graduated, poolAddress, currentPrice }: PriceChartProps) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fetchPriceHistory = useCallback(async () => {
    try {
      const quais = await import("quais");
      const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
      const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
      const fromBlock = Math.max(0, currentBlock - LOOKBACK_BLOCKS);

      const pricePoints: PricePoint[] = [];

      if (graduated && poolAddress) {
        const pool = new quais.Contract(poolAddress, GraduatedPoolABI, provider);
        const events = await pool.queryFilter("Swap", fromBlock, currentBlock);
        for (const ev of events) {
          const log = ev as unknown as {
            args: [string, boolean, bigint, bigint];
            blockNumber: number;
          };
          const quaiIn = log.args[1];
          const amountIn = parseFloat(quais.formatQuai(log.args[2]));
          const amountOut = parseFloat(quais.formatUnits(log.args[3], 18));
          if (amountOut > 0) {
            const price = quaiIn ? amountIn / amountOut : amountOut > 0 ? amountIn / amountOut : 0;
            pricePoints.push({ block: log.blockNumber, price: price * QUAI_USD_PRICE });
          }
        }
      } else {
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
          const quaiSpent = parseFloat(quais.formatQuai(log.args[1]));
          const tokensReceived = parseFloat(quais.formatUnits(log.args[2], 18));
          if (tokensReceived > 0) {
            pricePoints.push({
              block: log.blockNumber,
              price: (quaiSpent / tokensReceived) * QUAI_USD_PRICE,
            });
          }
        }

        for (const ev of sellEvents) {
          const log = ev as unknown as {
            args: [string, bigint, bigint, bigint];
            blockNumber: number;
          };
          const tokensSold = parseFloat(quais.formatUnits(log.args[1], 18));
          const quaiReceived = parseFloat(quais.formatQuai(log.args[2]));
          if (tokensSold > 0) {
            pricePoints.push({
              block: log.blockNumber,
              price: (quaiReceived / tokensSold) * QUAI_USD_PRICE,
            });
          }
        }
      }

      pricePoints.sort((a, b) => a.block - b.block);

      // Add current price as final point
      if (currentPrice > 0) {
        pricePoints.push({
          block: currentBlock,
          price: currentPrice * QUAI_USD_PRICE,
        });
      }

      setPoints(pricePoints);
    } catch {
      // Chart data unavailable
    } finally {
      setLoading(false);
    }
  }, [curveAddress, graduated, poolAddress, currentPrice]);

  useEffect(() => {
    fetchPriceHistory();
  }, [fetchPriceHistory]);

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const displayPrice = hoverPoint ? hoverPoint.price : (points.length > 0 ? points[points.length - 1].price : currentPrice * QUAI_USD_PRICE);

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={4}
      position="relative"
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontSize="xs" fontWeight="600" color="var(--text-primary)">
          Price Chart
        </Text>
        <Text fontSize="sm" fontWeight="600" fontFamily="mono" color="var(--accent)">
          {displayPrice > 0 ? `$${displayPrice.toExponential(2)}` : "..."}
        </Text>
      </Flex>

      {loading ? (
        <Box className="skeleton-shimmer" h={`${CHART_HEIGHT}px`} w="100%" rounded="lg" />
      ) : points.length < 2 ? (
        <Flex
          h={`${CHART_HEIGHT}px`}
          align="center"
          justify="center"
          bg="var(--bg-elevated)"
          rounded="lg"
        >
          <Text fontSize="xs" color="var(--text-tertiary)">
            Not enough trade data for chart
          </Text>
        </Flex>
      ) : (
        <ChartSVG
          points={points}
          height={CHART_HEIGHT}
          onHover={setHoverIndex}
        />
      )}
    </Box>
  );
}

function ChartSVG({
  points,
  height,
  onHover,
}: {
  points: PricePoint[];
  height: number;
  onHover: (index: number | null) => void;
}) {
  const prices = points.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const w = 100; // percentage-based viewBox
  const h = height;
  const pad = CHART_PADDING;

  const pathPoints = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((p.price - minPrice) / range) * (h - pad * 2);
    return { x, y };
  });

  const linePath = pathPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${pathPoints[pathPoints.length - 1].x} ${h - pad} L ${pathPoints[0].x} ${h - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: "block", cursor: "crosshair" }}
      onMouseLeave={() => onHover(null)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const index = Math.round(x * (points.length - 1));
        onHover(Math.max(0, Math.min(points.length - 1, index)));
      }}
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGrad)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
