"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Flex,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useBondingCurve, type CurveState, type LaunchInfo } from "@/hooks/useBondingCurve";
import { QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY } from "@/lib/constants";
import { shortenAddress } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

interface BondingTokenCardProps {
  launch: LaunchInfo;
  curveState?: CurveState | null;
  poolReserves?: { quai: string; token: string } | null;
}

export function BondingTokenCard({ launch, curveState: externalState, poolReserves }: BondingTokenCardProps) {
  const { getCurveState } = useBondingCurve();
  const [state, setState] = useState<CurveState | null>(externalState ?? null);
  const [loading, setLoading] = useState(!externalState);

  useEffect(() => {
    if (externalState) {
      setState(externalState);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getCurveState(launch.curveAddress)
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [launch.curveAddress, getCurveState, externalState]);

  if (loading) {
    return (
      <Box
        bg="var(--bg-surface)"
        p={4}
        rounded="xl"
        border="1px solid"
        borderColor="var(--border)"
      >
        <VStack spacing={3} align="stretch">
          <Box className="skeleton-shimmer" h="18px" w="60%" />
          <Box className="skeleton-shimmer" h="14px" w="80%" />
          <Box className="skeleton-shimmer" h="14px" w="40%" />
          <Box className="skeleton-shimmer" h="6px" w="100%" />
        </VStack>
      </Box>
    );
  }

  const graduated = state?.graduated ?? false;
  const poolQuai = poolReserves ? parseFloat(poolReserves.quai) : 0;
  const poolToken = poolReserves ? parseFloat(poolReserves.token) : 0;
  const priceQuai = graduated && poolToken > 0
    ? poolQuai / poolToken
    : state ? parseFloat(state.currentPrice) : 0;
  const priceUsd = priceQuai * QUAI_USD_PRICE;
  const mcapUsd = priceUsd * BONDING_TOTAL_SUPPLY;
  const realQuai = graduated ? poolQuai : (state ? parseFloat(state.realQuaiReserves) : 0);
  const pct = state ? state.progress / 100 : 0;

  return (
    <Box
      as={NextLink}
      href={`/token/${launch.curveAddress}`}
      bg="var(--bg-surface)"
      p={4}
      rounded="xl"
      border="1px solid"
      borderColor="var(--border)"
      className="card-hover"
      display="block"
      _hover={{ textDecoration: "none" }}
    >
      <VStack spacing={3} align="stretch">
        {/* Header: Icon + Name + Symbol + Age */}
        <Flex justify="space-between" align="start">
          <HStack spacing={2.5}>
            {launch.imageUrl ? (
              <Box
                w="36px"
                h="36px"
                rounded="full"
                overflow="hidden"
                flexShrink={0}
                bg="var(--bg-elevated)"
              >
                <img
                  src={launch.imageUrl}
                  alt={launch.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </Box>
            ) : (
              <Flex
                w="36px"
                h="36px"
                rounded="full"
                bg={graduated ? "rgba(255,215,0,0.15)" : "var(--accent-glow)"}
                align="center"
                justify="center"
                flexShrink={0}
              >
                <Text
                  fontSize="sm"
                  fontWeight="700"
                  color={graduated ? "#ffd700" : "var(--accent)"}
                >
                  {launch.symbol.slice(0, 2)}
                </Text>
              </Flex>
            )}
            <Box>
              <Text fontWeight="600" fontSize="sm" color="var(--text-primary)" lineHeight="1.2">
                {launch.name}
              </Text>
              <HStack spacing={1.5} mt={0.5}>
                <Box
                  bg={graduated ? "rgba(255,215,0,0.15)" : "rgba(0,230,118,0.12)"}
                  color={graduated ? "#ffd700" : "var(--accent)"}
                  px={1.5}
                  py={0}
                  rounded="md"
                  fontSize="10px"
                  fontWeight="600"
                >
                  ${launch.symbol}
                </Box>
                {parseFloat(launch.stakedAmount || "0") > 0 && (
                  <Box
                    bg="rgba(0,230,118,0.12)"
                    color="var(--accent)"
                    px={1.5}
                    py={0}
                    rounded="md"
                    fontSize="10px"
                    fontWeight="600"
                  >
                    STAKED {launch.stakedAmount} QUAI
                  </Box>
                )}
                <Text fontSize="10px" color="var(--text-tertiary)">
                  {timeAgo(launch.createdAt)}
                </Text>
              </HStack>
            </Box>
          </HStack>
        </Flex>

        {/* Description preview */}
        {launch.description && (
          <Text
            fontSize="xs"
            color="var(--text-secondary)"
            noOfLines={1}
          >
            {launch.description}
          </Text>
        )}

        {/* Stats grid */}
        <Flex gap={2} flexWrap="wrap">
          <StatPill label="Price" value={priceUsd > 0 ? `$${priceUsd.toExponential(2)}` : "..."} />
          <StatPill label="MCap" value={mcapUsd > 0 ? `$${mcapUsd.toFixed(2)}` : "..."} />
          <StatPill label={graduated ? "Liquidity" : "QUAI"} value={realQuai.toFixed(2)} />
        </Flex>

        {/* Progress bar or graduated badge */}
        {graduated ? (
          <Flex justify="space-between" align="center">
            <Text fontSize="10px" color="var(--text-secondary)">
              Liquidity Pool
            </Text>
            <Box
              bg="rgba(255,215,0,0.15)"
              color="#ffd700"
              px={1.5}
              py={0}
              rounded="md"
              fontSize="10px"
              fontWeight="600"
            >
              0.3% FEE
            </Box>
          </Flex>
        ) : (
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="10px" color="var(--text-secondary)">
                Bonding Curve
              </Text>
              <Text
                fontSize="10px"
                fontWeight="600"
                color="var(--accent)"
              >
                {`${pct.toFixed(1)}%`}
              </Text>
            </Flex>
            <Box
              bg="var(--progress-bg)"
              h="4px"
              rounded="full"
              overflow="hidden"
            >
              <Box
                h="100%"
                w={`${Math.min(pct, 100)}%`}
                rounded="full"
                className="progress-green"
              />
            </Box>
          </Box>
        )}

        {/* Creator link */}
        <HStack spacing={1}>
          <Text color="var(--text-tertiary)" fontSize="10px">
            by
          </Text>
          <Text
            color="var(--text-secondary)"
            fontSize="10px"
            fontFamily="mono"
          >
            {shortenAddress(launch.creator)}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <Box
      bg="var(--bg-elevated)"
      px={2}
      py={1}
      rounded="md"
      flex="1"
      minW="0"
    >
      <Text fontSize="9px" color="var(--text-tertiary)" textTransform="uppercase" letterSpacing="0.5px">
        {label}
      </Text>
      <Text fontSize="xs" fontFamily="mono" color="var(--text-primary)" isTruncated>
        {value}
      </Text>
    </Box>
  );
}
