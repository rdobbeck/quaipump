"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Container,
  Flex,
  HStack,
  Text,
  Button,
  VStack,
  Link,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useLaunchData } from "@/hooks/useLaunchData";
import { QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY } from "@/lib/constants";
import { timeAgo } from "@/lib/time";

type SortMetric = "mcap" | "liquidity" | "progress" | "newest";

export default function LeaderboardPage() {
  const { launches, curveStates, poolReservesMap, loading, statesLoaded } =
    useLaunchData();
  const [metric, setMetric] = useState<SortMetric>("mcap");

  const getMcap = (addr: string): number => {
    const s = curveStates[addr];
    if (!s) return 0;
    const pr = poolReservesMap[addr];
    if (s.graduated && pr) {
      const t = parseFloat(pr.token);
      return t > 0
        ? (parseFloat(pr.quai) / t) * QUAI_USD_PRICE * BONDING_TOTAL_SUPPLY
        : 0;
    }
    return parseFloat(s.currentPrice) * QUAI_USD_PRICE * BONDING_TOTAL_SUPPLY;
  };

  const getLiquidity = (addr: string): number => {
    const s = curveStates[addr];
    if (!s) return 0;
    const pr = poolReservesMap[addr];
    if (s.graduated && pr) return parseFloat(pr.quai);
    return parseFloat(s.realQuaiReserves);
  };

  const ranked = useMemo(() => {
    if (!statesLoaded) return [];
    const sorted = [...launches];
    switch (metric) {
      case "mcap":
        return sorted.sort(
          (a, b) => getMcap(b.curveAddress) - getMcap(a.curveAddress)
        );
      case "liquidity":
        return sorted.sort(
          (a, b) =>
            getLiquidity(b.curveAddress) - getLiquidity(a.curveAddress)
        );
      case "progress":
        return sorted.sort((a, b) => {
          const pa = curveStates[a.curveAddress]?.progress ?? 0;
          const pb = curveStates[b.curveAddress]?.progress ?? 0;
          return pb - pa;
        });
      case "newest":
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      default:
        return sorted;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launches, curveStates, poolReservesMap, statesLoaded, metric]);

  const metrics: { value: SortMetric; label: string }[] = [
    { value: "mcap", label: "Market Cap" },
    { value: "liquidity", label: "Liquidity" },
    { value: "progress", label: "Progress" },
    { value: "newest", label: "Newest" },
  ];

  return (
    <Container maxW="container.xl" py={6}>
      <Text fontSize="xl" fontWeight="700" color="var(--text-primary)" mb={1}>
        Leaderboard
      </Text>
      <Text fontSize="xs" color="var(--text-tertiary)" mb={6}>
        Top tokens ranked by performance metrics
      </Text>

      {/* Metric tabs */}
      <HStack spacing={1} bg="var(--bg-elevated)" p={1} rounded="lg" mb={6} w="fit-content">
        {metrics.map((m) => (
          <Button
            key={m.value}
            size="xs"
            px={4}
            rounded="md"
            bg={metric === m.value ? "var(--accent)" : "transparent"}
            color={metric === m.value ? "#0b0b0f" : "var(--text-secondary)"}
            fontWeight="600"
            _hover={{
              bg: metric === m.value ? "var(--accent-hover)" : "var(--bg-surface)",
            }}
            onClick={() => setMetric(m.value)}
          >
            {m.label}
          </Button>
        ))}
      </HStack>

      {loading || !statesLoaded ? (
        <VStack spacing={2}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Box key={i} className="skeleton-shimmer" h="52px" w="100%" rounded="lg" />
          ))}
        </VStack>
      ) : (
        <Box
          bg="var(--bg-surface)"
          border="1px solid"
          borderColor="var(--border)"
          rounded="xl"
          overflow="hidden"
        >
          {/* Header */}
          <Flex
            px={4}
            py={2.5}
            fontSize="10px"
            color="var(--text-tertiary)"
            textTransform="uppercase"
            borderBottom="1px solid"
            borderColor="var(--border)"
            bg="var(--bg-elevated)"
          >
            <Text w="50px" textAlign="center">#</Text>
            <Text flex={3}>Token</Text>
            <Text flex={2} textAlign="right">Price</Text>
            <Text flex={2} textAlign="right">Market Cap</Text>
            <Text flex={1.5} textAlign="right" display={{ base: "none", md: "block" }}>Liquidity</Text>
            <Text flex={1} textAlign="right" display={{ base: "none", md: "block" }}>Progress</Text>
            <Text flex={1.5} textAlign="right" display={{ base: "none", sm: "block" }}>Age</Text>
          </Flex>

          {ranked.slice(0, 100).map((l, i) => {
            const s = curveStates[l.curveAddress];
            const mcap = getMcap(l.curveAddress);
            const liq = getLiquidity(l.curveAddress);
            const pr = poolReservesMap[l.curveAddress];
            const priceQuai =
              s?.graduated && pr && parseFloat(pr.token) > 0
                ? parseFloat(pr.quai) / parseFloat(pr.token)
                : s
                ? parseFloat(s.currentPrice)
                : 0;
            const priceUsd = priceQuai * QUAI_USD_PRICE;
            const progress = s?.progress ?? 0;
            const graduated = s?.graduated ?? false;

            return (
              <Link
                key={l.curveAddress}
                as={NextLink}
                href={`/token/${l.curveAddress}`}
                _hover={{ textDecoration: "none" }}
              >
                <Flex
                  px={4}
                  py={3}
                  align="center"
                  fontSize="xs"
                  borderBottom="1px solid"
                  borderColor="var(--border)"
                  _hover={{ bg: "var(--bg-elevated)" }}
                  transition="background 0.1s"
                >
                  <Text
                    w="50px"
                    textAlign="center"
                    fontWeight="700"
                    fontFamily="mono"
                    color={i < 3 ? "var(--accent)" : "var(--text-tertiary)"}
                    fontSize={i < 3 ? "sm" : "xs"}
                  >
                    {i + 1}
                  </Text>
                  <Flex flex={3} align="center" gap={2} minW={0}>
                    {l.imageUrl ? (
                      <Box
                        w="28px"
                        h="28px"
                        rounded="full"
                        overflow="hidden"
                        flexShrink={0}
                        bg="var(--bg-elevated)"
                      >
                        <img
                          src={l.imageUrl}
                          alt={l.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </Box>
                    ) : (
                      <Flex
                        w="28px"
                        h="28px"
                        rounded="full"
                        bg={graduated ? "rgba(255,215,0,0.15)" : "var(--accent-glow)"}
                        align="center"
                        justify="center"
                        flexShrink={0}
                      >
                        <Text fontSize="9px" fontWeight="700" color={graduated ? "#ffd700" : "var(--accent)"}>
                          {l.symbol.slice(0, 2)}
                        </Text>
                      </Flex>
                    )}
                    <Box minW={0}>
                      <Text fontWeight="600" color="var(--text-primary)" isTruncated>
                        {l.name}
                      </Text>
                      <Flex gap={1} align="center">
                        <Text fontSize="10px" fontFamily="mono" color="var(--text-tertiary)">
                          ${l.symbol}
                        </Text>
                        {graduated && (
                          <Box bg="rgba(255,215,0,0.15)" color="#ffd700" px={1} rounded="sm" fontSize="8px" fontWeight="600">
                            GRAD
                          </Box>
                        )}
                      </Flex>
                    </Box>
                  </Flex>
                  <Text flex={2} textAlign="right" fontFamily="mono" color="var(--text-primary)">
                    ${priceUsd > 0 ? priceUsd.toExponential(2) : "0.00"}
                  </Text>
                  <Text flex={2} textAlign="right" fontFamily="mono" color="var(--text-secondary)">
                    ${mcap > 1 ? mcap.toFixed(2) : mcap.toFixed(4)}
                  </Text>
                  <Text flex={1.5} textAlign="right" fontFamily="mono" color="var(--text-tertiary)" display={{ base: "none", md: "block" }}>
                    {liq.toFixed(2)} QUAI
                  </Text>
                  <Text flex={1} textAlign="right" display={{ base: "none", md: "block" }}>
                    {graduated ? (
                      <Box as="span" color="#ffd700" fontWeight="600">100%</Box>
                    ) : (
                      <Box as="span" color="var(--text-secondary)">{(progress / 100).toFixed(1)}%</Box>
                    )}
                  </Text>
                  <Text flex={1.5} textAlign="right" color="var(--text-tertiary)" display={{ base: "none", sm: "block" }}>
                    {timeAgo(l.createdAt)}
                  </Text>
                </Flex>
              </Link>
            );
          })}
        </Box>
      )}
    </Container>
  );
}
