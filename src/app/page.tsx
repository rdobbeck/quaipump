"use client";

import { Box, Container, Text } from "@chakra-ui/react";
import { useLaunchData } from "@/hooks/useLaunchData";
import { LiveTradeFeed } from "@/components/bonding/LiveTradeFeed";
import { BondingTokenList } from "@/components/bonding/BondingTokenList";
import { PlatformStats } from "@/components/browse/PlatformStats";
import { FeaturedSections } from "@/components/browse/FeaturedSections";

export default function HomePage() {
  const {
    launches,
    curveStates,
    poolReservesMap,
    loading,
    statesLoaded,
    stats,
    aboutToGraduate,
    recentlyLaunched,
    topMarketCap,
  } = useLaunchData();

  return (
    <Box minH="calc(100vh - 120px)">
      <Container maxW="container.xl" py={6}>
        <LiveTradeFeed launches={launches} />

        <PlatformStats
          totalLaunches={stats.totalLaunches}
          graduatedCount={stats.graduatedCount}
          totalQuaiLocked={stats.totalQuaiLocked}
          totalQuaiLockedUsd={stats.totalQuaiLockedUsd}
          loading={loading || !statesLoaded}
        />

        {statesLoaded && (
          <FeaturedSections
            aboutToGraduate={aboutToGraduate}
            recentlyLaunched={recentlyLaunched}
            topMarketCap={topMarketCap}
            curveStates={curveStates}
            poolReservesMap={poolReservesMap}
          />
        )}

        <Text fontSize="lg" fontWeight="700" color="var(--text-primary)" mb={4}>
          All Tokens
        </Text>

        <BondingTokenList
          launches={launches}
          loading={loading}
          curveStates={statesLoaded ? curveStates : undefined}
          poolReservesMap={statesLoaded ? poolReservesMap : undefined}
        />
      </Container>
    </Box>
  );
}
