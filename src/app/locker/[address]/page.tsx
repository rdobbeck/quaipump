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
  Input,
  Link,
  Skeleton,
  Spinner,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useAppState } from "@/app/store";
import { useLiquidityLocker, type LockerInfo } from "@/hooks/useLiquidityLocker";
import {
  formatTimestamp,
  formatCountdown,
  shortenAddress,
  getExplorerAddressUrl,
} from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LockerPage() {
  const params = useParams();
  const lockerAddress = params.address as string;
  const toast = useToast();

  const { account } = useAppState();
  const { getLockerInfo, withdraw, extendLock } = useLiquidityLocker();

  /* ---- State ---- */
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<LockerInfo | null>(null);
  const [countdown, setCountdown] = useState("");
  const [newUnlockTime, setNewUnlockTime] = useState("");
  const [isExtending, setIsExtending] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  /* ---- Load data ---- */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const lockerInfo = await getLockerInfo(lockerAddress);
      setInfo(lockerInfo);
    } catch (err) {
      console.error("Failed to load locker info:", err);
      toast({
        title: "Failed to load locker info",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [lockerAddress, getLockerInfo, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---- Countdown timer ---- */
  useEffect(() => {
    if (!info || info.unlockTime === 0) return;

    const now = Math.floor(Date.now() / 1000);
    if (info.unlockTime <= now) {
      setCountdown("Unlocked");
      return;
    }

    setCountdown(formatCountdown(info.unlockTime));

    const interval = setInterval(() => {
      const current = Math.floor(Date.now() / 1000);
      if (info.unlockTime <= current) {
        setCountdown("Unlocked");
        clearInterval(interval);
      } else {
        setCountdown(formatCountdown(info.unlockTime));
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [info]);

  /* ---- Computed ---- */
  const isOwner =
    account && info
      ? account.toLowerCase() === info.owner.toLowerCase()
      : false;
  const now = Math.floor(Date.now() / 1000);
  const isUnlocked = info ? info.unlockTime <= now : false;

  /* ---- Extend lock handler ---- */
  const handleExtendLock = async () => {
    if (!info) return;

    // Parse the input: support both Unix timestamp and date string
    let parsedTimestamp: number;
    const asNumber = Number(newUnlockTime);
    if (!isNaN(asNumber) && asNumber > 1_000_000_000) {
      parsedTimestamp = asNumber;
    } else {
      const asDate = new Date(newUnlockTime);
      if (isNaN(asDate.getTime())) {
        toast({
          title: "Invalid date",
          description:
            "Enter a Unix timestamp or a date (e.g. 2025-12-31T00:00:00).",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      parsedTimestamp = Math.floor(asDate.getTime() / 1000);
    }

    if (parsedTimestamp <= info.unlockTime) {
      toast({
        title: "Invalid unlock time",
        description: "New unlock time must be after the current unlock time.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsExtending(true);
    try {
      await extendLock(lockerAddress, parsedTimestamp);
      toast({
        title: "Lock Extended",
        description: `New unlock time: ${formatTimestamp(parsedTimestamp)}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setNewUnlockTime("");
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to extend lock";
      toast({
        title: "Extend Lock Failed",
        description: message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsExtending(false);
    }
  };

  /* ---- Withdraw handler ---- */
  const handleWithdraw = async () => {
    if (!account) return;

    setIsWithdrawing(true);
    try {
      await withdraw(lockerAddress, account);
      toast({
        title: "Withdrawal Successful",
        description: "LP tokens have been withdrawn to your wallet.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Withdrawal failed";
      toast({
        title: "Withdraw Failed",
        description: message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  /* ---- Render ---- */
  return (
    <Container maxW="container.md" py={8}>
      <Heading size="lg" mb={2}>
        LP Locker
      </Heading>
      <HStack mb={6} spacing={2}>
        <Text fontSize="sm" color="var(--text-secondary)" fontFamily="mono">
          {shortenAddress(lockerAddress)}
        </Text>
        <Link
          href={getExplorerAddressUrl(lockerAddress)}
          isExternal
          fontSize="xs"
          color="var(--accent)"
        >
          View on Explorer
        </Link>
      </HStack>

      {loading ? (
        <VStack spacing={4} align="stretch">
          <Skeleton height="240px" borderRadius="xl" />
          <Skeleton height="200px" borderRadius="xl" />
        </VStack>
      ) : info ? (
        <VStack spacing={6} align="stretch">
          {/* Locker Info */}
          <Box
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            borderRadius="xl"
            p={5}
          >
            <Text fontWeight="600" fontSize="md" mb={4}>
              Lock Details
            </Text>

            <VStack spacing={3} align="stretch">
              <InfoRow
                label="LP Token"
                value={
                  <Link
                    href={getExplorerAddressUrl(info.lpToken)}
                    isExternal
                    fontSize="sm"
                    fontFamily="mono"
                    color="var(--accent)"
                  >
                    {shortenAddress(info.lpToken)}
                  </Link>
                }
              />
              <InfoRow
                label="Locked Balance"
                value={
                  <Text fontSize="sm" fontWeight="500" fontFamily="mono">
                    {parseFloat(info.lockedBalance).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                  </Text>
                }
              />
              <InfoRow
                label="Unlock Time"
                value={
                  <VStack align="flex-end" spacing={0}>
                    <Text fontSize="sm" fontWeight="500">
                      {formatTimestamp(info.unlockTime)}
                    </Text>
                    <Text
                      fontSize="xs"
                      color={isUnlocked ? "var(--accent)" : "var(--text-secondary)"}
                      fontWeight={isUnlocked ? "600" : "400"}
                    >
                      {countdown}
                    </Text>
                  </VStack>
                }
              />
              <InfoRow
                label="Owner"
                value={
                  <Link
                    href={getExplorerAddressUrl(info.owner)}
                    isExternal
                    fontSize="sm"
                    fontFamily="mono"
                    color="var(--accent)"
                  >
                    {shortenAddress(info.owner)}
                  </Link>
                }
              />
            </VStack>
          </Box>

          {/* Owner-only actions */}
          {isOwner && (
            <Box
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="xl"
              p={5}
            >
              <Text fontWeight="600" fontSize="md" mb={4}>
                Owner Actions
              </Text>

              {/* Extend Lock */}
              <Box mb={5}>
                <Text fontSize="sm" color="var(--text-secondary)" mb={2}>
                  Extend Lock
                </Text>
                <Text fontSize="xs" color="var(--text-tertiary)" mb={2}>
                  Enter a new unlock time as a Unix timestamp or date
                  (e.g. 2026-06-30T00:00:00). Must be later than the current
                  unlock time.
                </Text>
                <Flex gap={3} direction={{ base: "column", sm: "row" }}>
                  <Input
                    placeholder="e.g. 2026-06-30T00:00:00 or 1782950400"
                    value={newUnlockTime}
                    onChange={(e) => setNewUnlockTime(e.target.value)}
                    flex={1}
                  />
                  <Button
                    variant="accent"
                    onClick={handleExtendLock}
                    isDisabled={isExtending || !newUnlockTime}
                    isLoading={isExtending}
                    loadingText="Extending"
                    spinner={<Spinner size="sm" />}
                    minW="120px"
                  >
                    Extend
                  </Button>
                </Flex>
              </Box>

              {/* Withdraw */}
              <Box>
                <Text fontSize="sm" color="var(--text-secondary)" mb={2}>
                  Withdraw LP Tokens
                </Text>
                {!isUnlocked && (
                  <Text fontSize="xs" color="var(--text-tertiary)" mb={2}>
                    Withdrawal is available after the unlock time ({countdown}).
                  </Text>
                )}
                <Button
                  variant="sell"
                  w="100%"
                  onClick={handleWithdraw}
                  isDisabled={isWithdrawing || !isUnlocked}
                  isLoading={isWithdrawing}
                  loadingText="Withdrawing"
                  spinner={<Spinner size="sm" />}
                >
                  {isUnlocked ? "Withdraw" : "Locked"}
                </Button>
              </Box>
            </Box>
          )}

          {/* Non-owner notice */}
          {!isOwner && account && (
            <Box
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="xl"
              p={5}
              textAlign="center"
            >
              <Text color="var(--text-secondary)" fontSize="sm">
                Only the locker owner can manage this lock.
              </Text>
            </Box>
          )}

          {/* Not connected notice */}
          {!account && (
            <Box
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="xl"
              p={5}
              textAlign="center"
            >
              <Text color="var(--text-secondary)" fontSize="sm">
                Connect your wallet to manage this lock.
              </Text>
            </Box>
          )}
        </VStack>
      ) : (
        <Box
          bg="var(--bg-surface)"
          border="1px solid"
          borderColor="var(--border)"
          borderRadius="xl"
          p={8}
          textAlign="center"
        >
          <Text color="var(--text-secondary)">
            Failed to load locker information.
          </Text>
        </Box>
      )}
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/*  Info Row                                                           */
/* ------------------------------------------------------------------ */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Flex
      justify="space-between"
      align="center"
      py={2}
      borderBottom="1px solid"
      borderColor="var(--border)"
      _last={{ borderBottom: "none" }}
    >
      <Text fontSize="sm" color="var(--text-secondary)">
        {label}
      </Text>
      {value}
    </Flex>
  );
}
