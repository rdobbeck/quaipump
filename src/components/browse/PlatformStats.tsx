"use client";

import { SimpleGrid, Box, Text } from "@chakra-ui/react";

interface PlatformStatsProps {
  totalLaunches: number;
  graduatedCount: number;
  totalQuaiLocked: number;
  totalQuaiLockedUsd: number;
  loading: boolean;
}

export function PlatformStats({
  totalLaunches,
  graduatedCount,
  totalQuaiLocked,
  totalQuaiLockedUsd,
  loading,
}: PlatformStatsProps) {
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
      <StatCard
        label="Total Launches"
        value={loading ? null : String(totalLaunches)}
      />
      <StatCard
        label="Graduated"
        value={loading ? null : String(graduatedCount)}
        color="#ffd700"
      />
      <StatCard
        label="QUAI Locked"
        value={loading ? null : `${totalQuaiLocked.toFixed(2)} QUAI`}
      />
      <StatCard
        label="TVL (USD)"
        value={loading ? null : `$${totalQuaiLockedUsd.toFixed(2)}`}
      />
    </SimpleGrid>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | null;
  color?: string;
}) {
  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={4}
    >
      <Text
        fontSize="xs"
        color="var(--text-tertiary)"
        textTransform="uppercase"
        letterSpacing="0.5px"
        mb={1}
      >
        {label}
      </Text>
      {value === null ? (
        <Box className="skeleton-shimmer" h="20px" w="70%" />
      ) : (
        <Text
          fontSize="md"
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
