"use client";

import { SimpleGrid, Box, Text } from "@chakra-ui/react";
import type { CurveState } from "@/hooks/useBondingCurve";
import { QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY } from "@/lib/constants";

interface CurveStatsProps {
  curveState: CurveState | null;
  poolReserves?: { quai: string; token: string } | null;
  loading: boolean;
}

export function CurveStats({ curveState, poolReserves, loading }: CurveStatsProps) {
  const graduated = curveState?.graduated ?? false;
  const poolQuai = poolReserves ? parseFloat(poolReserves.quai) : 0;
  const poolToken = poolReserves ? parseFloat(poolReserves.token) : 0;

  const priceQuai = graduated && poolToken > 0
    ? poolQuai / poolToken
    : curveState ? parseFloat(curveState.currentPrice) : 0;
  const priceUsd = priceQuai * QUAI_USD_PRICE;
  const mcapUsd = priceUsd * BONDING_TOTAL_SUPPLY;
  const realQuai = graduated ? poolQuai : (curveState ? parseFloat(curveState.realQuaiReserves) : 0);
  const pct = curveState ? curveState.progress / 100 : 0;

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
      <StatBox
        label="Price (USD)"
        value={loading ? null : priceUsd > 0 ? `$${priceUsd.toExponential(2)}` : "$0.00"}
      />
      <StatBox
        label="Market Cap"
        value={loading ? null : mcapUsd > 0 ? `$${mcapUsd.toFixed(2)}` : "$0.00"}
      />
      <StatBox
        label={graduated ? "Liquidity" : "QUAI Deposited"}
        value={loading ? null : `${realQuai.toFixed(2)} QUAI`}
      />
      <StatBox
        label="Progress"
        value={loading ? null : graduated ? "Graduated" : `${pct.toFixed(1)}%`}
        color={graduated ? "#ffd700" : "var(--accent)"}
      />
    </SimpleGrid>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | null; color?: string }) {
  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={3}
    >
      <Text
        fontSize="9px"
        color="var(--text-tertiary)"
        textTransform="uppercase"
        letterSpacing="0.5px"
        mb={1}
      >
        {label}
      </Text>
      {value === null ? (
        <Box className="skeleton-shimmer" h="16px" w="70%" />
      ) : (
        <Text
          fontSize="sm"
          fontWeight="600"
          fontFamily="mono"
          color={color || "var(--text-primary)"}
        >
          {value}
        </Text>
      )}
    </Box>
  );
}
