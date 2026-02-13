"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import type { CurveState } from "@/hooks/useBondingCurve";

interface CurveProgressProps {
  curveState: CurveState | null;
  loading: boolean;
}

export function CurveProgress({ curveState, loading }: CurveProgressProps) {
  const graduated = curveState?.graduated ?? false;
  const pct = curveState ? curveState.progress / 100 : 0;

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={4}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="xs" fontWeight="600" color="var(--text-primary)">
          Bonding Curve Progress
        </Text>
        {graduated ? (
          <Box
            bg="rgba(255,215,0,0.15)"
            color="#ffd700"
            px={2}
            py={0.5}
            rounded="md"
            fontSize="10px"
            fontWeight="600"
          >
            GRADUATED
          </Box>
        ) : (
          <Text
            fontSize="xs"
            fontWeight="600"
            fontFamily="mono"
            color="var(--accent)"
          >
            {loading ? "..." : `${pct.toFixed(1)}%`}
          </Text>
        )}
      </Flex>

      <Box
        bg="var(--progress-bg)"
        h="8px"
        rounded="full"
        overflow="hidden"
      >
        {loading ? (
          <Box className="skeleton-shimmer" h="100%" w="100%" />
        ) : (
          <Box
            h="100%"
            w={graduated ? "100%" : `${Math.min(pct, 100)}%`}
            rounded="full"
            className="progress-green"
            transition="width 0.5s ease"
          />
        )}
      </Box>

      {!graduated && curveState && (
        <Text fontSize="10px" color="var(--text-tertiary)" mt={2}>
          When the bonding curve reaches 100%, liquidity is deployed to the DEX and trading continues there.
        </Text>
      )}
    </Box>
  );
}
