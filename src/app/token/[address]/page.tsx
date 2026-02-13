"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import {
  Container,
  Grid,
  GridItem,
  VStack,
  HStack,
  Box,
  Flex,
  Text,
  Link,
  Skeleton,
  useToast,
} from "@chakra-ui/react";
import {
  useBondingCurve,
  type LaunchInfo,
  type CurveState,
} from "@/hooks/useBondingCurve";
import { NETWORK, QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY } from "@/lib/constants";
import { shortenAddress, getExplorerAddressUrl } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";
import { PriceChart } from "@/components/bonding/PriceChart";
import { TradePanel } from "@/components/bonding/TradePanel";
import { CurveStats } from "@/components/bonding/CurveStats";
import { CurveProgress } from "@/components/bonding/CurveProgress";
import { TokenComments } from "@/components/bonding/TokenComments";
import { TokenTradeFeed } from "@/components/bonding/TokenTradeFeed";
import { TokenomicsStatus } from "@/components/bonding/TokenomicsStatus";
import { TokenHolders } from "@/components/bonding/TokenHolders";
import BondingCurveTokenV2ABI from "@/lib/abi/BondingCurveTokenV2.json";

export default function TokenDetailPage() {
  const params = useParams<{ address: string }>();
  const address = params.address;

  const toast = useToast();
  const { getAllLaunches, getCurveState } = useBondingCurve();

  const [launch, setLaunch] = useState<LaunchInfo | null>(null);
  const [curveState, setCurveState] = useState<CurveState | null>(null);
  const [poolReserves, setPoolReserves] = useState<{
    quai: string;
    token: string;
  } | null>(null);
  const [hasTokenomics, setHasTokenomics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const launchRef = useRef<LaunchInfo | null>(null);

  const REFRESH_INTERVAL = 15_000;

  // Lightweight refresh: only curve state + pool reserves
  const refreshState = useCallback(async () => {
    const current = launchRef.current;
    if (!current) return;
    try {
      const state = await getCurveState(current.curveAddress);
      setCurveState(state);

      if (state.graduated && state.pool) {
        try {
          const quais = await import("quais");
          const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
          const poolContract = new quais.Contract(
            state.pool,
            GraduatedPoolABI,
            provider
          );
          const [rQuai, rToken] = await Promise.all([
            poolContract.reserveQuai(),
            poolContract.reserveToken(),
          ]);
          setPoolReserves({
            quai: quais.formatQuai(rQuai),
            token: quais.formatUnits(rToken, 18),
          });
        } catch {
          // Pool reserves unavailable
        }
      }
    } catch {
      // Refresh failed silently
    }
  }, [getCurveState]);

  // Initial full fetch
  const fetchData = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const launches = await getAllLaunches();
      const found = launches.find(
        (l) => l.curveAddress.toLowerCase() === address.toLowerCase()
      );

      if (!found) {
        setNotFound(true);
        return;
      }

      setLaunch(found);
      launchRef.current = found;

      // Fetch curve state
      const state = await getCurveState(found.curveAddress);
      setCurveState(state);

      // Detect V2 token (has tokenomics)
      try {
        const quais = await import("quais");
        const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
        const tokenContract = new quais.Contract(
          found.tokenAddress,
          BondingCurveTokenV2ABI,
          provider
        );
        const tax = await tokenContract.getTaxConfig();
        const hasTax =
          Number(tax.buyTaxBps) > 0 || Number(tax.sellTaxBps) > 0;
        setHasTokenomics(hasTax);
      } catch {
        setHasTokenomics(false);
      }

      // Fetch pool reserves if graduated
      if (state.graduated && state.pool) {
        try {
          const quais = await import("quais");
          const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
          const poolContract = new quais.Contract(
            state.pool,
            GraduatedPoolABI,
            provider
          );
          const [rQuai, rToken] = await Promise.all([
            poolContract.reserveQuai(),
            poolContract.reserveToken(),
          ]);
          setPoolReserves({
            quai: quais.formatQuai(rQuai),
            token: quais.formatUnits(rToken, 18),
          });
        } catch {
          // Pool reserves unavailable
        }
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [address, getAllLaunches, getCurveState]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh polling
  useEffect(() => {
    if (loading || notFound || !launchRef.current) return;
    const interval = setInterval(refreshState, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loading, notFound, refreshState]);

  if (notFound) {
    return (
      <Container maxW="container.xl" py={8}>
        <Flex
          h="300px"
          align="center"
          justify="center"
          bg="var(--bg-surface)"
          border="1px solid"
          borderColor="var(--border)"
          rounded="xl"
        >
          <Text color="var(--text-tertiary)" fontSize="sm">
            Token not found
          </Text>
        </Flex>
      </Container>
    );
  }

  if (loading || !launch) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4} align="stretch">
          <Skeleton
            h="80px"
            rounded="xl"
            startColor="var(--bg-surface)"
            endColor="var(--bg-elevated)"
          />
          <Grid
            templateColumns={{ base: "1fr", lg: "1fr 360px" }}
            gap={4}
          >
            <GridItem>
              <VStack spacing={4} align="stretch">
                <Skeleton
                  h="260px"
                  rounded="xl"
                  startColor="var(--bg-surface)"
                  endColor="var(--bg-elevated)"
                />
                <Skeleton
                  h="100px"
                  rounded="xl"
                  startColor="var(--bg-surface)"
                  endColor="var(--bg-elevated)"
                />
              </VStack>
            </GridItem>
            <GridItem>
              <Skeleton
                h="400px"
                rounded="xl"
                startColor="var(--bg-surface)"
                endColor="var(--bg-elevated)"
              />
            </GridItem>
          </Grid>
        </VStack>
      </Container>
    );
  }

  const graduated = curveState?.graduated ?? false;
  const priceQuai =
    graduated && poolReserves && parseFloat(poolReserves.token) > 0
      ? parseFloat(poolReserves.quai) / parseFloat(poolReserves.token)
      : curveState
      ? parseFloat(curveState.currentPrice)
      : 0;
  const priceUsd = priceQuai * QUAI_USD_PRICE;
  const mcapUsd = priceUsd * BONDING_TOTAL_SUPPLY;

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
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
            {/* Left: icon + name + symbol + badges */}
            <HStack spacing={3}>
              {launch.imageUrl ? (
                <Box
                  w="44px"
                  h="44px"
                  rounded="full"
                  overflow="hidden"
                  flexShrink={0}
                  bg="var(--bg-elevated)"
                >
                  <img
                    src={launch.imageUrl}
                    alt={launch.name}
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
                  w="44px"
                  h="44px"
                  rounded="full"
                  bg={
                    graduated
                      ? "rgba(255,215,0,0.15)"
                      : "var(--accent-glow)"
                  }
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Text
                    fontSize="md"
                    fontWeight="700"
                    color={graduated ? "#ffd700" : "var(--accent)"}
                  >
                    {launch.symbol.slice(0, 2)}
                  </Text>
                </Flex>
              )}
              <Box>
                <HStack spacing={2}>
                  <Text
                    fontSize="lg"
                    fontWeight="700"
                    color="var(--text-primary)"
                  >
                    {launch.name}
                  </Text>
                  <Box
                    bg={
                      graduated
                        ? "rgba(255,215,0,0.15)"
                        : "rgba(0,230,118,0.12)"
                    }
                    color={graduated ? "#ffd700" : "var(--accent)"}
                    px={2}
                    py={0.5}
                    rounded="md"
                    fontSize="11px"
                    fontWeight="600"
                  >
                    ${launch.symbol}
                  </Box>
                  {graduated && (
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
                  )}
                  {parseFloat(launch.stakedAmount || "0") > 0 && (
                    <Box
                      bg="rgba(0,230,118,0.12)"
                      color="var(--accent)"
                      px={2}
                      py={0.5}
                      rounded="md"
                      fontSize="10px"
                      fontWeight="600"
                    >
                      STAKED
                    </Box>
                  )}
                </HStack>
                <HStack spacing={3} mt={1}>
                  <Text fontSize="sm" fontWeight="600" fontFamily="mono" color="var(--accent)">
                    ${priceUsd > 0 ? priceUsd.toExponential(2) : "0.00"}
                  </Text>
                  <Text fontSize="xs" color="var(--text-tertiary)">
                    MCap ${mcapUsd > 0 ? mcapUsd.toFixed(2) : "0.00"}
                  </Text>
                  <Text fontSize="xs" color="var(--text-tertiary)">
                    {timeAgo(launch.createdAt)}
                  </Text>
                </HStack>
              </Box>
            </HStack>

            {/* Right: creator + links */}
            <HStack spacing={3}>
              <HStack spacing={1}>
                <Text fontSize="10px" color="var(--text-tertiary)">
                  by
                </Text>
                <Link
                  as={NextLink}
                  href={`/creator/${launch.creator}`}
                  fontSize="xs"
                  fontFamily="mono"
                  color="var(--text-secondary)"
                  _hover={{ color: "var(--accent)", textDecoration: "none" }}
                >
                  {shortenAddress(launch.creator)}
                </Link>
              </HStack>
              {launch.website && (
                <Link
                  href={launch.website}
                  isExternal
                  fontSize="10px"
                  color="var(--text-secondary)"
                  bg="var(--bg-elevated)"
                  px={2}
                  py={1}
                  rounded="md"
                  _hover={{
                    color: "var(--accent)",
                    borderColor: "var(--border-hover)",
                  }}
                >
                  Website
                </Link>
              )}
              {launch.twitter && (
                <Link
                  href={launch.twitter}
                  isExternal
                  fontSize="10px"
                  color="var(--text-secondary)"
                  bg="var(--bg-elevated)"
                  px={2}
                  py={1}
                  rounded="md"
                  _hover={{ color: "var(--accent)" }}
                >
                  Twitter
                </Link>
              )}
              {launch.telegram && (
                <Link
                  href={launch.telegram}
                  isExternal
                  fontSize="10px"
                  color="var(--text-secondary)"
                  bg="var(--bg-elevated)"
                  px={2}
                  py={1}
                  rounded="md"
                  _hover={{ color: "var(--accent)" }}
                >
                  Telegram
                </Link>
              )}
              <Link
                href={getExplorerAddressUrl(launch.curveAddress)}
                isExternal
                fontSize="10px"
                color="var(--text-secondary)"
                bg="var(--bg-elevated)"
                px={2}
                py={1}
                rounded="md"
                _hover={{ color: "var(--accent)" }}
              >
                Explorer
              </Link>
              <Box
                as="button"
                fontSize="10px"
                color="var(--text-secondary)"
                bg="var(--bg-elevated)"
                px={2}
                py={1}
                rounded="md"
                cursor="pointer"
                _hover={{ color: "var(--accent)" }}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({
                    title: "Link copied",
                    status: "success",
                    duration: 2000,
                    position: "bottom-right",
                  });
                }}
              >
                Copy Link
              </Box>
              <Link
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                  `Check out $${launch.symbol} on QuaiPump!`
                )}&url=${encodeURIComponent(
                  typeof window !== "undefined" ? window.location.href : ""
                )}`}
                isExternal
                fontSize="10px"
                color="var(--text-secondary)"
                bg="var(--bg-elevated)"
                px={2}
                py={1}
                rounded="md"
                _hover={{ color: "var(--accent)", textDecoration: "none" }}
              >
                Share
              </Link>
            </HStack>
          </Flex>

          {/* Description */}
          {launch.description && (
            <Text
              fontSize="xs"
              color="var(--text-secondary)"
              mt={3}
              lineHeight="1.6"
            >
              {launch.description}
            </Text>
          )}
        </Box>

        {/* Main terminal layout */}
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 360px" }}
          gap={4}
        >
          {/* Left column: Chart + Stats */}
          <GridItem>
            <VStack spacing={4} align="stretch">
              <PriceChart
                curveAddress={launch.curveAddress}
                graduated={graduated}
                poolAddress={curveState?.pool}
                currentPrice={priceQuai}
              />

              <CurveStats
                curveState={curveState}
                poolReserves={poolReserves}
                loading={false}
              />

              <TokenTradeFeed
                curveAddress={launch.curveAddress}
                tokenSymbol={launch.symbol}
                graduated={graduated}
                poolAddress={curveState?.pool}
              />

              <TokenHolders
                tokenAddress={launch.tokenAddress}
                curveAddress={launch.curveAddress}
                poolAddress={curveState?.pool}
                tokenSymbol={launch.symbol}
              />

              <TokenComments tokenAddress={launch.curveAddress} />
            </VStack>
          </GridItem>

          {/* Right column: Trade + Progress */}
          <GridItem>
            <VStack
              spacing={4}
              align="stretch"
              position="sticky"
              top="80px"
            >
              <TradePanel
                curveAddress={launch.curveAddress}
                tokenAddress={launch.tokenAddress}
                tokenSymbol={launch.symbol}
                graduated={graduated}
                poolAddress={curveState?.pool}
                onTrade={refreshState}
              />

              {hasTokenomics && (
                <TokenomicsStatus
                  tokenAddress={launch.tokenAddress}
                  graduated={graduated}
                />
              )}

              <CurveProgress curveState={curveState} loading={false} />
            </VStack>
          </GridItem>
        </Grid>
      </VStack>
    </Container>
  );
}
