"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { QUAI_USD_PRICE } from "@/lib/constants";
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

      {!graduated && curveState && pct > 0 && (
        <Box mt={3}>
          {(() => {
            const currentQuai = parseFloat(curveState.realQuaiReserves);
            const estimatedTotal = pct > 0 ? currentQuai / (pct / 100) : 0;
            const remaining = Math.max(0, estimatedTotal - currentQuai);
            const remainingUsd = remaining * QUAI_USD_PRICE;
            return (
              <Flex
                justify="space-between"
                align="center"
                bg="var(--bg-elevated)"
                rounded="lg"
                px={3}
                py={2}
              >
                <Text fontSize="10px" color="var(--text-tertiary)">
                  Est. QUAI to graduate
                </Text>
                <Flex gap={2} align="center">
                  <Text
                    fontSize="xs"
                    fontWeight="600"
                    fontFamily="mono"
                    color="var(--accent)"
                  >
                    {remaining < 1 ? remaining.toFixed(4) : remaining.toFixed(2)} QUAI
                  </Text>
                  <Text fontSize="10px" color="var(--text-tertiary)" fontFamily="mono">
                    (~${remainingUsd.toFixed(2)})
                  </Text>
                </Flex>
              </Flex>
            );
          })()}
          <Text fontSize="10px" color="var(--text-tertiary)" mt={2}>
            When the bonding curve reaches 100%, liquidity is deployed to the DEX.
          </Text>
        </Box>
      )}
    </Box>
  );
}
