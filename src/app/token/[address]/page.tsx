"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Container,
  Grid,
  GridItem,
  VStack,
  Box,
  Text,
  Link,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useTokenomicsToken, type TokenInfo } from "@/hooks/useTokenomicsToken";
import { useTokenomicsFactory, type TokenDeployment } from "@/hooks/useTokenomicsFactory";
import { TokenHeader } from "@/components/dashboard/TokenHeader";
import { TokenStats } from "@/components/dashboard/TokenStats";
import { HolderInfo } from "@/components/dashboard/HolderInfo";
import { OwnerPanel } from "@/components/owner/OwnerPanel";
import { SwapPanel } from "@/components/trade/SwapPanel";
import { TokenComments } from "@/components/bonding/TokenComments";

export default function TokenDashboardPage() {
  const params = useParams<{ address: string }>();
  const address = params.address;
  const { getTokenInfo } = useTokenomicsToken();
  const { getDeploymentCount, getDeployment } = useTokenomicsFactory();

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [deployment, setDeployment] = useState<TokenDeployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const info = await getTokenInfo(address);
        if (!cancelled) setTokenInfo(info);

        // Find this token's deployment to get vesting/locker addresses
        const count = await getDeploymentCount();
        for (let i = 0; i < count; i++) {
          const d = await getDeployment(i);
          if (d.token.toLowerCase() === address.toLowerCase()) {
            if (!cancelled) setDeployment(d);
            break;
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load token info"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, getTokenInfo, getDeploymentCount, getDeployment]);

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert
          status="error"
          bg="var(--bg-surface)"
          border="1px solid"
          borderColor="var(--sell)"
          borderRadius="xl"
        >
          <AlertIcon color="var(--sell)" />
          <AlertDescription fontSize="sm">{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (loading || !tokenInfo) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4} align="stretch">
          <Skeleton height="100px" borderRadius="xl" />
          <Grid
            templateColumns={{ base: "1fr", lg: "1fr 380px" }}
            gap={6}
          >
            <GridItem>
              <VStack spacing={4} align="stretch">
                <Skeleton height="200px" borderRadius="xl" />
                <Skeleton height="120px" borderRadius="xl" />
                <Skeleton height="140px" borderRadius="xl" />
                <Skeleton height="100px" borderRadius="xl" />
              </VStack>
            </GridItem>
            <GridItem>
              <VStack spacing={4} align="stretch">
                <Skeleton height="200px" borderRadius="xl" />
                <SkeletonText
                  noOfLines={3}
                  spacing="3"
                  skeletonHeight="14px"
                />
              </VStack>
            </GridItem>
          </Grid>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <TokenHeader
          name={tokenInfo.name}
          symbol={tokenInfo.symbol}
          address={tokenInfo.address}
          supplyType={tokenInfo.supplyType}
        />

        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 380px" }}
          gap={6}
        >
          {/* Left column: main content */}
          <GridItem>
            <VStack spacing={6} align="stretch">
              <TokenStats tokenInfo={tokenInfo} />

              <HolderInfo tokenAddress={tokenInfo.address} />

              <OwnerPanel
                tokenAddress={tokenInfo.address}
                tokenInfo={tokenInfo}
              />

              <TokenComments tokenAddress={tokenInfo.address} />
            </VStack>
          </GridItem>

          {/* Right column: swap + sidebar links */}
          <GridItem>
            <VStack spacing={4} align="stretch" position="sticky" top="80px">
              <SwapPanel
                tokenAddress={tokenInfo.address}
                dexRouter={tokenInfo.dexRouter}
                tokenSymbol={tokenInfo.symbol}
              />

              {/* Sidebar links */}
              <Box
                bg="var(--bg-surface)"
                border="1px solid"
                borderColor="var(--border)"
                borderRadius="xl"
                p={5}
              >
                <Text
                  fontSize="xs"
                  fontWeight="600"
                  color="var(--accent)"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                  mb={3}
                >
                  Related
                </Text>

                <VStack spacing={2} align="stretch">
                  {deployment?.vestingVault && (
                    <Link
                      as={NextLink}
                      href={`/vesting/${deployment.vestingVault}`}
                      px={3}
                      py={2}
                      rounded="lg"
                      fontSize="sm"
                      color="var(--text-secondary)"
                      bg="var(--bg-elevated)"
                      _hover={{
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-hover)",
                      }}
                      display="block"
                    >
                      Vesting Schedules
                    </Link>
                  )}

                  {deployment?.liquidityLocker && (
                    <Link
                      as={NextLink}
                      href={`/locker/${deployment.liquidityLocker}`}
                      px={3}
                      py={2}
                      rounded="lg"
                      fontSize="sm"
                      color="var(--text-secondary)"
                      bg="var(--bg-elevated)"
                      _hover={{
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-hover)",
                      }}
                      display="block"
                    >
                      Liquidity Locker
                    </Link>
                  )}
                </VStack>
              </Box>
            </VStack>
          </GridItem>
        </Grid>
      </VStack>
    </Container>
  );
}
