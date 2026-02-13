"use client";

import { Box } from "@chakra-ui/react";
import type { LaunchInfo, CurveState } from "@/hooks/useBondingCurve";
import { BondingTokenCard } from "@/components/bonding/BondingTokenCard";
import { FeaturedRow } from "./FeaturedRow";

interface FeaturedSectionsProps {
  aboutToGraduate: LaunchInfo[];
  recentlyLaunched: LaunchInfo[];
  topMarketCap: LaunchInfo[];
  curveStates: Record<string, CurveState>;
  poolReservesMap: Record<string, { quai: string; token: string }>;
}

export function FeaturedSections({
  aboutToGraduate,
  recentlyLaunched,
  topMarketCap,
  curveStates,
  poolReservesMap,
}: FeaturedSectionsProps) {
  return (
    <Box mb={6}>
      {aboutToGraduate.length > 0 && (
        <FeaturedRow title="About to Graduate" titleColor="#ff9800">
          {aboutToGraduate.map((l) => (
            <Box key={l.launchId} minW="280px" flexShrink={0}>
              <BondingTokenCard
                launch={l}
                curveState={curveStates[l.curveAddress]}
                poolReserves={poolReservesMap[l.curveAddress]}
              />
            </Box>
          ))}
        </FeaturedRow>
      )}

      {recentlyLaunched.length > 0 && (
        <FeaturedRow title="Recently Launched" titleColor="var(--accent)">
          {recentlyLaunched.map((l) => (
            <Box key={l.launchId} minW="280px" flexShrink={0}>
              <BondingTokenCard
                launch={l}
                curveState={curveStates[l.curveAddress]}
                poolReserves={poolReservesMap[l.curveAddress]}
              />
            </Box>
          ))}
        </FeaturedRow>
      )}

      {topMarketCap.length > 0 && (
        <FeaturedRow title="Top Market Cap" titleColor="#ffd700">
          {topMarketCap.map((l) => (
            <Box key={l.launchId} minW="280px" flexShrink={0}>
              <BondingTokenCard
                launch={l}
                curveState={curveStates[l.curveAddress]}
                poolReserves={poolReservesMap[l.curveAddress]}
              />
            </Box>
          ))}
        </FeaturedRow>
      )}
    </Box>
  );
}
