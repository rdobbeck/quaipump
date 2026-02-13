"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Link,
  Progress,
  Skeleton,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useAppState } from "@/app/store";
import { useVestingVault, type VestingPosition } from "@/hooks/useVestingVault";
import { useTokenomicsToken } from "@/hooks/useTokenomicsToken";
import {
  formatTimestamp,
  formatCountdown,
  shortenAddress,
  getExplorerAddressUrl,
} from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BeneficiaryRow {
  address: string;
  position: VestingPosition | null;
  releasableAmount: string;
  loading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VestingPage() {
  const params = useParams();
  const vaultAddress = params.address as string;
  const toast = useToast();

  const { account } = useAppState();
  const { getToken, getPosition, releasable, release, getBeneficiaries } =
    useVestingVault();
  const { getTokenInfo } = useTokenomicsToken();

  /* ---- State ---- */
  const [loading, setLoading] = useState(true);
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [, setTokenDecimals] = useState(18);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>([]);
  const [myPosition, setMyPosition] = useState<VestingPosition | null>(null);
  const [myReleasable, setMyReleasable] = useState("0");
  const [isReleasing, setIsReleasing] = useState(false);
  const [countdown, setCountdown] = useState("");

  /* ---- Load data ---- */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get the token address from the vault
      const token = await getToken(vaultAddress);
      setTokenAddress(token);

      // Get token info for decimals and symbol
      const info = await getTokenInfo(token);
      setTokenDecimals(info.decimals);
      setTokenSymbol(info.symbol);

      // Get all beneficiaries
      const addrs = await getBeneficiaries(vaultAddress);

      // Load position for each beneficiary
      const rows: BeneficiaryRow[] = addrs.map((addr) => ({
        address: addr,
        position: null,
        releasableAmount: "0",
        loading: true,
      }));
      setBeneficiaries(rows);

      // Fetch positions in parallel
      const updatedRows = await Promise.all(
        addrs.map(async (addr) => {
          try {
            const [pos, rel] = await Promise.all([
              getPosition(vaultAddress, addr, info.decimals),
              releasable(vaultAddress, addr, info.decimals),
            ]);
            return {
              address: addr,
              position: pos,
              releasableAmount: rel,
              loading: false,
            };
          } catch {
            return {
              address: addr,
              position: null,
              releasableAmount: "0",
              loading: false,
            };
          }
        })
      );
      setBeneficiaries(updatedRows);

      // Load connected user position
      if (account) {
        const isBeneficiary = addrs.some(
          (a) => a.toLowerCase() === account.toLowerCase()
        );
        if (isBeneficiary) {
          const [pos, rel] = await Promise.all([
            getPosition(vaultAddress, account, info.decimals),
            releasable(vaultAddress, account, info.decimals),
          ]);
          setMyPosition(pos);
          setMyReleasable(rel);
        }
      }
    } catch (err) {
      console.error("Failed to load vesting data:", err);
      toast({
        title: "Failed to load vesting data",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [
    vaultAddress,
    account,
    getToken,
    getTokenInfo,
    getBeneficiaries,
    getPosition,
    releasable,
    toast,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---- Countdown timer ---- */
  useEffect(() => {
    if (!myPosition || myPosition.cliffEnd === 0) return;

    const now = Math.floor(Date.now() / 1000);
    if (myPosition.cliffEnd <= now) {
      setCountdown("");
      return;
    }

    setCountdown(formatCountdown(myPosition.cliffEnd));

    const interval = setInterval(() => {
      const current = Math.floor(Date.now() / 1000);
      if (myPosition.cliffEnd <= current) {
        setCountdown("");
        clearInterval(interval);
      } else {
        setCountdown(formatCountdown(myPosition.cliffEnd));
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [myPosition]);

  /* ---- Release handler ---- */
  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      await release(vaultAddress);
      toast({
        title: "Tokens Released",
        description: "Your vested tokens have been released.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      // Reload data to reflect new state
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Release failed";
      toast({
        title: "Release Failed",
        description: message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsReleasing(false);
    }
  };

  /* ---- Computed values ---- */
  const now = Math.floor(Date.now() / 1000);
  const isCliffActive = myPosition ? myPosition.cliffEnd > now : false;
  const progressPercent =
    myPosition && parseFloat(myPosition.totalAmount) > 0
      ? (parseFloat(myPosition.released) / parseFloat(myPosition.totalAmount)) *
        100
      : 0;

  /* ---- Render ---- */
  return (
    <Container maxW="container.lg" py={8}>
      <Heading size="lg" mb={2}>
        Vesting Vault
      </Heading>
      <HStack mb={6} spacing={2}>
        <Text fontSize="sm" color="var(--text-secondary)" fontFamily="mono">
          {shortenAddress(vaultAddress)}
        </Text>
        <Link
          href={getExplorerAddressUrl(vaultAddress)}
          isExternal
          fontSize="xs"
          color="var(--accent)"
        >
          View on Explorer
        </Link>
      </HStack>

      {loading ? (
        <VStack spacing={4} align="stretch">
          <Skeleton height="200px" borderRadius="xl" />
          <Skeleton height="300px" borderRadius="xl" />
        </VStack>
      ) : (
        <VStack spacing={6} align="stretch">
          {/* Token info */}
          {tokenAddress && (
            <HStack
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="xl"
              p={4}
              spacing={3}
            >
              <Text fontSize="sm" color="var(--text-secondary)">
                Token:
              </Text>
              <Text fontSize="sm" fontWeight="500">
                {tokenSymbol}
              </Text>
              <Link
                href={getExplorerAddressUrl(tokenAddress)}
                isExternal
                fontSize="xs"
                color="var(--accent)"
                fontFamily="mono"
              >
                {shortenAddress(tokenAddress)}
              </Link>
            </HStack>
          )}

          {/* Connected user position */}
          {account && myPosition ? (
            <Box
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="xl"
              p={5}
            >
              <Text fontWeight="600" fontSize="md" mb={4}>
                Your Vesting Position
              </Text>

              {/* Stats grid */}
              <Flex
                gap={4}
                mb={5}
                direction={{ base: "column", md: "row" }}
              >
                <StatBox
                  label="Total Amount"
                  value={`${parseFloat(myPosition.totalAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tokenSymbol}`}
                />
                <StatBox
                  label="Released"
                  value={`${parseFloat(myPosition.released).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tokenSymbol}`}
                />
                <StatBox
                  label="Claimable"
                  value={`${parseFloat(myReleasable).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tokenSymbol}`}
                  accent
                />
              </Flex>

              {/* Dates */}
              <Flex
                gap={4}
                mb={5}
                direction={{ base: "column", md: "row" }}
              >
                <StatBox
                  label="Cliff End"
                  value={formatTimestamp(myPosition.cliffEnd)}
                />
                <StatBox
                  label="Vesting End"
                  value={formatTimestamp(myPosition.vestingEnd)}
                />
              </Flex>

              {/* Cliff countdown */}
              {isCliffActive && countdown && (
                <Box
                  bg="var(--bg-elevated)"
                  borderRadius="lg"
                  p={3}
                  mb={4}
                >
                  <Text fontSize="xs" color="var(--text-secondary)" mb={1}>
                    Cliff ends in
                  </Text>
                  <Text fontSize="lg" fontWeight="600" color="var(--accent)">
                    {countdown}
                  </Text>
                </Box>
              )}

              {/* Progress bar */}
              <Box mb={4}>
                <Flex justify="space-between" mb={1}>
                  <Text fontSize="xs" color="var(--text-secondary)">
                    Vesting Progress
                  </Text>
                  <Text fontSize="xs" color="var(--text-secondary)">
                    {progressPercent.toFixed(1)}%
                  </Text>
                </Flex>
                <Progress
                  value={progressPercent}
                  size="sm"
                  borderRadius="full"
                  bg="var(--progress-bg)"
                  sx={{
                    "& > div": {
                      background: "linear-gradient(90deg, #00c853, #00e676)",
                    },
                  }}
                />
              </Box>

              {/* Release button */}
              <Button
                variant="accent"
                w="100%"
                onClick={handleRelease}
                isDisabled={
                  isReleasing ||
                  parseFloat(myReleasable) <= 0
                }
                isLoading={isReleasing}
                loadingText="Releasing"
                spinner={<Spinner size="sm" />}
              >
                Release Tokens
              </Button>
            </Box>
          ) : account ? (
            <Box
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="xl"
              p={5}
              textAlign="center"
            >
              <Text color="var(--text-secondary)">
                Your wallet is not a beneficiary of this vault.
              </Text>
            </Box>
          ) : (
            <Box
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="xl"
              p={5}
              textAlign="center"
            >
              <Text color="var(--text-secondary)">
                Connect your wallet to view your vesting position.
              </Text>
            </Box>
          )}

          {/* Beneficiaries table */}
          <Box
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            borderRadius="xl"
            p={5}
            overflowX="auto"
          >
            <Text fontWeight="600" fontSize="md" mb={4}>
              All Beneficiaries
            </Text>

            {beneficiaries.length === 0 ? (
              <Text color="var(--text-secondary)" textAlign="center" py={4}>
                No beneficiaries found.
              </Text>
            ) : (
              <Table variant="unstyled" size="sm">
                <Thead>
                  <Tr borderBottom="1px solid" borderColor="var(--border)">
                    <Th
                      color="var(--text-secondary)"
                      fontSize="xs"
                      textTransform="none"
                      fontWeight="500"
                      px={2}
                    >
                      Beneficiary
                    </Th>
                    <Th
                      color="var(--text-secondary)"
                      fontSize="xs"
                      textTransform="none"
                      fontWeight="500"
                      px={2}
                      isNumeric
                    >
                      Total
                    </Th>
                    <Th
                      color="var(--text-secondary)"
                      fontSize="xs"
                      textTransform="none"
                      fontWeight="500"
                      px={2}
                      isNumeric
                    >
                      Released
                    </Th>
                    <Th
                      color="var(--text-secondary)"
                      fontSize="xs"
                      textTransform="none"
                      fontWeight="500"
                      px={2}
                      isNumeric
                    >
                      Claimable
                    </Th>
                    <Th
                      color="var(--text-secondary)"
                      fontSize="xs"
                      textTransform="none"
                      fontWeight="500"
                      px={2}
                    >
                      Cliff End
                    </Th>
                    <Th
                      color="var(--text-secondary)"
                      fontSize="xs"
                      textTransform="none"
                      fontWeight="500"
                      px={2}
                    >
                      Vesting End
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {beneficiaries.map((b) => (
                    <Tr
                      key={b.address}
                      borderBottom="1px solid"
                      borderColor="var(--border)"
                      _last={{ borderBottom: "none" }}
                    >
                      <Td px={2} py={3}>
                        {b.loading ? (
                          <Skeleton height="16px" width="100px" />
                        ) : (
                          <Link
                            href={getExplorerAddressUrl(b.address)}
                            isExternal
                            fontSize="xs"
                            fontFamily="mono"
                            color="var(--accent)"
                          >
                            {shortenAddress(b.address)}
                          </Link>
                        )}
                      </Td>
                      <Td px={2} py={3} isNumeric>
                        {b.loading ? (
                          <Skeleton height="16px" width="60px" ml="auto" />
                        ) : (
                          <Text fontSize="xs" fontFamily="mono">
                            {b.position
                              ? parseFloat(b.position.totalAmount).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 2 }
                                )
                              : "--"}
                          </Text>
                        )}
                      </Td>
                      <Td px={2} py={3} isNumeric>
                        {b.loading ? (
                          <Skeleton height="16px" width="60px" ml="auto" />
                        ) : (
                          <Text fontSize="xs" fontFamily="mono">
                            {b.position
                              ? parseFloat(b.position.released).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 2 }
                                )
                              : "--"}
                          </Text>
                        )}
                      </Td>
                      <Td px={2} py={3} isNumeric>
                        {b.loading ? (
                          <Skeleton height="16px" width="60px" ml="auto" />
                        ) : (
                          <Text
                            fontSize="xs"
                            fontFamily="mono"
                            color={
                              parseFloat(b.releasableAmount) > 0
                                ? "var(--accent)"
                                : "var(--text-primary)"
                            }
                          >
                            {parseFloat(b.releasableAmount).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 }
                            )}
                          </Text>
                        )}
                      </Td>
                      <Td px={2} py={3}>
                        {b.loading ? (
                          <Skeleton height="16px" width="80px" />
                        ) : (
                          <Text fontSize="xs" color="var(--text-secondary)">
                            {b.position
                              ? formatTimestamp(b.position.cliffEnd)
                              : "--"}
                          </Text>
                        )}
                      </Td>
                      <Td px={2} py={3}>
                        {b.loading ? (
                          <Skeleton height="16px" width="80px" />
                        ) : (
                          <Text fontSize="xs" color="var(--text-secondary)">
                            {b.position
                              ? formatTimestamp(b.position.vestingEnd)
                              : "--"}
                          </Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>
        </VStack>
      )}
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Box                                                           */
/* ------------------------------------------------------------------ */

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Box
      flex={1}
      bg="var(--bg-elevated)"
      borderRadius="lg"
      p={3}
    >
      <Text fontSize="xs" color="var(--text-secondary)" mb={1}>
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight="600"
        color={accent ? "var(--accent)" : "var(--text-primary)"}
        fontFamily="mono"
      >
        {value}
      </Text>
    </Box>
  );
}
