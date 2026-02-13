"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Container,
  VStack,
  Box,
  Flex,
  Text,
  Link,
  Skeleton,
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  useBondingCurve,
  type LaunchInfo,
  type CurveState,
} from "@/hooks/useBondingCurve";
import { useFavorites } from "@/hooks/useFavorites";
import { NETWORK, QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY } from "@/lib/constants";
import { timeAgo } from "@/lib/time";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface WatchlistItem {
  launch: LaunchInfo;
  priceUsd: number;
  mcapUsd: number;
  graduated: boolean;
  progress: number;
}

export default function WatchlistPage() {
  const { favoriteAddresses, toggleFavorite, isFavorite } = useFavorites();
  const { getAllLaunches, getCurveState } = useBondingCurve();

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    if (favoriteAddresses.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const launches = await getAllLaunches();
      const favSet = new Set(favoriteAddresses.map((a) => a.toLowerCase()));
      const favLaunches = launches.filter((l) =>
        favSet.has(l.curveAddress.toLowerCase())
      );

      if (favLaunches.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const stateResults = await Promise.allSettled(
        favLaunches.map((l) => getCurveState(l.curveAddress))
      );

      const list: WatchlistItem[] = [];

      for (let i = 0; i < favLaunches.length; i++) {
        const launch = favLaunches[i];
        const stateResult = stateResults[i];
        let priceQuai = 0;
        let graduated = false;
        let progress = 0;

        if (stateResult.status === "fulfilled") {
          const state: CurveState = stateResult.value;
          graduated = state.graduated;
          progress = state.progress;

          if (state.graduated && state.pool) {
            try {
              const quais = await import("quais");
              const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
              const pool = new quais.Contract(state.pool, GraduatedPoolABI, provider);
              const [rQuai, rToken] = await Promise.all([
                pool.reserveQuai(),
                pool.reserveToken(),
              ]);
              const rQ = parseFloat(quais.formatQuai(rQuai));
              const rT = parseFloat(quais.formatUnits(rToken, 18));
              if (rT > 0) priceQuai = rQ / rT;
            } catch {
              priceQuai = parseFloat(state.currentPrice);
            }
          } else {
            priceQuai = parseFloat(state.currentPrice);
          }
        }

        const priceUsd = priceQuai * QUAI_USD_PRICE;
        const mcapUsd = priceUsd * BONDING_TOTAL_SUPPLY;
        list.push({ launch, priceUsd, mcapUsd, graduated, progress });
      }

      list.sort((a, b) => b.mcapUsd - a.mcapUsd);
      setItems(list);
    } catch {
      // Fetch failed
    } finally {
      setLoading(false);
    }
  }, [favoriteAddresses, getAllLaunches, getCurveState]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={4} align="stretch">
        <Flex justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="700" color="var(--text-primary)">
            Watchlist
          </Text>
          <Text fontSize="xs" color="var(--text-tertiary)">
            {favoriteAddresses.length} tokens
          </Text>
        </Flex>

        {loading ? (
          <VStack spacing={2} align="stretch">
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                h="64px"
                rounded="xl"
                startColor="var(--bg-surface)"
                endColor="var(--bg-elevated)"
              />
            ))}
          </VStack>
        ) : items.length === 0 ? (
          <Flex
            h="200px"
            align="center"
            justify="center"
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            rounded="xl"
            direction="column"
            gap={2}
          >
            <Text color="var(--text-tertiary)" fontSize="sm">
              No favorites yet
            </Text>
            <Text color="var(--text-tertiary)" fontSize="xs">
              Click the star on any token to add it here
            </Text>
          </Flex>
        ) : (
          <Box
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            rounded="xl"
            overflow="hidden"
          >
            {/* Table header */}
            <Flex
              px={4}
              py={2.5}
              fontSize="9px"
              color="var(--text-tertiary)"
              textTransform="uppercase"
              letterSpacing="0.5px"
              borderBottom="1px solid"
              borderColor="var(--border)"
            >
              <Text flex="0 0 30px"></Text>
              <Text flex={1}>Token</Text>
              <Text flex="0 0 100px" textAlign="right">Price</Text>
              <Text flex="0 0 100px" textAlign="right">MCap</Text>
              <Text flex="0 0 80px" textAlign="right">Progress</Text>
              <Text flex="0 0 80px" textAlign="right">Age</Text>
            </Flex>

            {items.map((item) => (
              <Flex
                key={item.launch.curveAddress}
                align="center"
                borderBottom="1px solid"
                borderColor="var(--border)"
                _last={{ borderBottom: "none" }}
                _hover={{ bg: "var(--bg-elevated)" }}
                transition="background 0.1s"
              >
                {/* Star button */}
                <Box
                  flex="0 0 30px"
                  pl={3}
                  cursor="pointer"
                  onClick={() => toggleFavorite(item.launch.curveAddress)}
                >
                  <Text
                    fontSize="sm"
                    color={
                      isFavorite(item.launch.curveAddress)
                        ? "#ffd700"
                        : "var(--text-tertiary)"
                    }
                    _hover={{ color: "#ffd700" }}
                  >
                    {isFavorite(item.launch.curveAddress) ? "\u2605" : "\u2606"}
                  </Text>
                </Box>

                <Link
                  as={NextLink}
                  href={`/token/${item.launch.curveAddress}`}
                  _hover={{ textDecoration: "none" }}
                  display="flex"
                  flex={1}
                  alignItems="center"
                  px={4}
                  py={3}
                >
                  <Flex flex={1} align="center" gap={3} minW={0}>
                    {item.launch.imageUrl ? (
                      <Box
                        w="32px"
                        h="32px"
                        rounded="full"
                        overflow="hidden"
                        flexShrink={0}
                        bg="var(--bg-elevated)"
                      >
                        <img
                          src={item.launch.imageUrl}
                          alt={item.launch.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </Box>
                    ) : (
                      <Flex
                        w="32px"
                        h="32px"
                        rounded="full"
                        bg={item.graduated ? "rgba(255,215,0,0.15)" : "var(--accent-glow)"}
                        align="center"
                        justify="center"
                        flexShrink={0}
                      >
                        <Text
                          fontSize="10px"
                          fontWeight="700"
                          color={item.graduated ? "#ffd700" : "var(--accent)"}
                        >
                          {item.launch.symbol.slice(0, 2)}
                        </Text>
                      </Flex>
                    )}
                    <Box minW={0}>
                      <Flex align="center" gap={2}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="var(--text-primary)"
                          isTruncated
                        >
                          {item.launch.name}
                        </Text>
                        {item.graduated && (
                          <Box
                            bg="rgba(255,215,0,0.15)"
                            color="#ffd700"
                            px={1.5}
                            rounded="md"
                            fontSize="9px"
                            fontWeight="600"
                            flexShrink={0}
                          >
                            GRAD
                          </Box>
                        )}
                      </Flex>
                      <Text fontSize="10px" color="var(--text-tertiary)" fontFamily="mono">
                        ${item.launch.symbol}
                      </Text>
                    </Box>
                  </Flex>

                  <Text
                    flex="0 0 100px"
                    textAlign="right"
                    fontFamily="mono"
                    fontSize="sm"
                    color="var(--accent)"
                  >
                    ${item.priceUsd > 0 ? item.priceUsd.toExponential(2) : "0.00"}
                  </Text>

                  <Text
                    flex="0 0 100px"
                    textAlign="right"
                    fontFamily="mono"
                    fontSize="xs"
                    color="var(--text-secondary)"
                  >
                    ${item.mcapUsd > 0 ? item.mcapUsd.toFixed(2) : "0.00"}
                  </Text>

                  <Text
                    flex="0 0 80px"
                    textAlign="right"
                    fontFamily="mono"
                    fontSize="xs"
                    color={item.graduated ? "#ffd700" : "var(--text-secondary)"}
                  >
                    {item.graduated ? "100%" : `${item.progress.toFixed(1)}%`}
                  </Text>

                  <Text
                    flex="0 0 80px"
                    textAlign="right"
                    fontSize="xs"
                    color="var(--text-tertiary)"
                  >
                    {timeAgo(item.launch.createdAt)}
                  </Text>
                </Link>
              </Flex>
            ))}
          </Box>
        )}
      </VStack>
    </Container>
  );
}
