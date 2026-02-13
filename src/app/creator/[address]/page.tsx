"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Container,
  VStack,
  HStack,
  Box,
  Flex,
  Text,
  Link,
  Skeleton,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  useBondingCurve,
  type LaunchInfo,
  type CurveState,
} from "@/hooks/useBondingCurve";
import { NETWORK, QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY } from "@/lib/constants";
import { shortenAddress, getExplorerAddressUrl } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface TokenWithState {
  launch: LaunchInfo;
  curveState: CurveState | null;
  priceUsd: number;
  mcapUsd: number;
}

export default function CreatorProfilePage() {
  const params = useParams<{ address: string }>();
  const address = params.address;

  const { getAllLaunches, getCurveState } = useBondingCurve();

  const [tokens, setTokens] = useState<TokenWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, graduated: 0 });

  const fetchCreator = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const launches = await getAllLaunches();
      const creatorLaunches = launches.filter(
        (l) => l.creator.toLowerCase() === address.toLowerCase()
      );

      if (creatorLaunches.length === 0) {
        setTokens([]);
        setStats({ total: 0, graduated: 0 });
        setLoading(false);
        return;
      }

      // Fetch curve states in parallel
      const stateResults = await Promise.allSettled(
        creatorLaunches.map((l) => getCurveState(l.curveAddress))
      );

      let graduatedCount = 0;
      const tokenList: TokenWithState[] = [];

      for (let i = 0; i < creatorLaunches.length; i++) {
        const launch = creatorLaunches[i];
        const stateResult = stateResults[i];
        let curveState: CurveState | null = null;
        let priceQuai = 0;

        if (stateResult.status === "fulfilled") {
          curveState = stateResult.value;
          if (curveState.graduated) graduatedCount++;

          if (curveState.graduated && curveState.pool) {
            try {
              const quais = await import("quais");
              const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
              const pool = new quais.Contract(curveState.pool, GraduatedPoolABI, provider);
              const [rQuai, rToken] = await Promise.all([
                pool.reserveQuai(),
                pool.reserveToken(),
              ]);
              const reserveQuai = parseFloat(quais.formatQuai(rQuai));
              const reserveToken = parseFloat(quais.formatUnits(rToken, 18));
              if (reserveToken > 0) {
                priceQuai = reserveQuai / reserveToken;
              }
            } catch {
              priceQuai = parseFloat(curveState.currentPrice);
            }
          } else {
            priceQuai = parseFloat(curveState.currentPrice);
          }
        }

        const priceUsd = priceQuai * QUAI_USD_PRICE;
        const mcapUsd = priceUsd * BONDING_TOTAL_SUPPLY;

        tokenList.push({ launch, curveState, priceUsd, mcapUsd });
      }

      // Sort by creation time descending (newest first)
      tokenList.sort((a, b) => b.launch.createdAt - a.launch.createdAt);
      setTokens(tokenList);
      setStats({ total: creatorLaunches.length, graduated: graduatedCount });
    } catch {
      // Fetch failed
    } finally {
      setLoading(false);
    }
  }, [address, getAllLaunches, getCurveState]);

  useEffect(() => {
    fetchCreator();
  }, [fetchCreator]);

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={4} align="stretch">
        {/* Creator header */}
        <Box
          bg="var(--bg-surface)"
          border="1px solid"
          borderColor="var(--border)"
          rounded="xl"
          px={5}
          py={4}
        >
          <Flex
            justify="space-between"
            align={{ base: "start", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap={3}
          >
            <HStack spacing={3}>
              <Flex
                w="44px"
                h="44px"
                rounded="full"
                bg="var(--accent-glow)"
                align="center"
                justify="center"
                flexShrink={0}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Flex>
              <Box>
                <Text fontSize="lg" fontWeight="700" color="var(--text-primary)">
                  Creator Profile
                </Text>
                <Link
                  href={getExplorerAddressUrl(address)}
                  isExternal
                  fontSize="xs"
                  fontFamily="mono"
                  color="var(--text-secondary)"
                  _hover={{ color: "var(--accent)" }}
                >
                  {address}
                </Link>
              </Box>
            </HStack>

            {!loading && (
              <HStack spacing={4}>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="700" fontFamily="mono" color="var(--text-primary)">
                    {stats.total}
                  </Text>
                  <Text fontSize="10px" color="var(--text-tertiary)">
                    Launched
                  </Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="700" fontFamily="mono" color="#ffd700">
                    {stats.graduated}
                  </Text>
                  <Text fontSize="10px" color="var(--text-tertiary)">
                    Graduated
                  </Text>
                </Box>
              </HStack>
            )}
          </Flex>
        </Box>

        {/* Tokens grid */}
        {loading ? (
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
            gap={4}
          >
            {[...Array(6)].map((_, i) => (
              <GridItem key={i}>
                <Skeleton
                  h="140px"
                  rounded="xl"
                  startColor="var(--bg-surface)"
                  endColor="var(--bg-elevated)"
                />
              </GridItem>
            ))}
          </Grid>
        ) : tokens.length === 0 ? (
          <Flex
            h="200px"
            align="center"
            justify="center"
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            rounded="xl"
          >
            <Text color="var(--text-tertiary)" fontSize="sm">
              No tokens launched by this creator
            </Text>
          </Flex>
        ) : (
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
            gap={4}
          >
            {tokens.map((t) => {
              const graduated = t.curveState?.graduated ?? false;
              const progress = t.curveState?.progress ?? 0;

              return (
                <GridItem key={t.launch.curveAddress}>
                  <Link
                    as={NextLink}
                    href={`/token/${t.launch.curveAddress}`}
                    _hover={{ textDecoration: "none" }}
                  >
                    <Box
                      bg="var(--bg-surface)"
                      border="1px solid"
                      borderColor="var(--border)"
                      rounded="xl"
                      p={4}
                      _hover={{
                        borderColor: "var(--border-hover)",
                        bg: "var(--bg-elevated)",
                      }}
                      transition="all 0.15s"
                      h="100%"
                    >
                      <Flex align="center" gap={3} mb={3}>
                        {t.launch.imageUrl ? (
                          <Box
                            w="36px"
                            h="36px"
                            rounded="full"
                            overflow="hidden"
                            flexShrink={0}
                            bg="var(--bg-elevated)"
                          >
                            <img
                              src={t.launch.imageUrl}
                              alt={t.launch.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
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
                              fontSize="11px"
                              fontWeight="700"
                              color={graduated ? "#ffd700" : "var(--accent)"}
                            >
                              {t.launch.symbol.slice(0, 2)}
                            </Text>
                          </Flex>
                        )}
                        <Box minW={0} flex={1}>
                          <Flex align="center" gap={2}>
                            <Text
                              fontSize="sm"
                              fontWeight="600"
                              color="var(--text-primary)"
                              isTruncated
                            >
                              {t.launch.name}
                            </Text>
                            {graduated && (
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
                          <Text
                            fontSize="10px"
                            color="var(--text-tertiary)"
                            fontFamily="mono"
                          >
                            ${t.launch.symbol}
                          </Text>
                        </Box>
                      </Flex>

                      <Flex justify="space-between" align="center" mb={2}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          fontFamily="mono"
                          color="var(--accent)"
                        >
                          ${t.priceUsd > 0 ? t.priceUsd.toExponential(2) : "0.00"}
                        </Text>
                        <Text fontSize="10px" color="var(--text-tertiary)">
                          MCap ${t.mcapUsd > 0 ? t.mcapUsd.toFixed(2) : "0.00"}
                        </Text>
                      </Flex>

                      {/* Progress bar (bonding curve only) */}
                      {!graduated && (
                        <Box>
                          <Flex justify="space-between" mb={1}>
                            <Text fontSize="9px" color="var(--text-tertiary)">
                              Progress
                            </Text>
                            <Text fontSize="9px" color="var(--text-tertiary)" fontFamily="mono">
                              {progress.toFixed(1)}%
                            </Text>
                          </Flex>
                          <Box
                            h="4px"
                            bg="var(--bg-elevated)"
                            rounded="full"
                            overflow="hidden"
                          >
                            <Box
                              h="100%"
                              w={`${Math.min(progress, 100)}%`}
                              bg="var(--accent)"
                              rounded="full"
                              transition="width 0.3s"
                            />
                          </Box>
                        </Box>
                      )}

                      <Text fontSize="10px" color="var(--text-tertiary)" mt={2}>
                        {timeAgo(t.launch.createdAt)}
                      </Text>
                    </Box>
                  </Link>
                </GridItem>
              );
            })}
          </Grid>
        )}
      </VStack>
    </Container>
  );
}
