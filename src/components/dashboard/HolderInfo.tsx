"use client";

import { useEffect, useState } from "react";
import { Box, VStack, HStack, Text, Divider, Skeleton } from "@chakra-ui/react";
import { useTokenomicsToken } from "@/hooks/useTokenomicsToken";
import { useAppState } from "@/app/store";
import { formatSupply, shortenAddress } from "@/lib/utils";

interface HolderInfoProps {
  tokenAddress: string;
}

export function HolderInfo({ tokenAddress }: HolderInfoProps) {
  const { account } = useAppState();
  const { balanceOf } = useTokenomicsToken();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const bal = await balanceOf(tokenAddress, account);
        if (!cancelled) setBalance(bal);
      } catch {
        if (!cancelled) setBalance(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account, tokenAddress, balanceOf]);

  return (
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
      >
        Your Wallet
      </Text>
      <Divider borderColor="var(--border)" my={3} />

      {!account ? (
        <Text fontSize="sm" color="var(--text-secondary)">
          Connect wallet to view balance
        </Text>
      ) : loading ? (
        <VStack spacing={2} align="stretch">
          <Skeleton height="20px" borderRadius="md" />
          <Skeleton height="16px" width="60%" borderRadius="md" />
        </VStack>
      ) : (
        <VStack spacing={1} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="var(--text-secondary)">
              Balance
            </Text>
            <Text fontSize="sm" fontWeight="500" fontFamily="mono">
              {balance !== null ? formatSupply(balance) : "--"}
            </Text>
          </HStack>
          <Text fontSize="xs" color="var(--text-tertiary)" fontFamily="mono">
            {shortenAddress(account)}
          </Text>
        </VStack>
      )}
    </Box>
  );
}
