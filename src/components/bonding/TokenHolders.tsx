"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Flex, Text, VStack, Link } from "@chakra-ui/react";
import { NETWORK, BONDING_TOTAL_SUPPLY } from "@/lib/constants";
import { shortenAddress, getExplorerAddressUrl } from "@/lib/utils";
import BondingCurveTokenABI from "@/lib/abi/BondingCurveToken.json";

interface Holder {
  address: string;
  balance: number;
  percentage: number;
}

interface TokenHoldersProps {
  tokenAddress: string;
  curveAddress: string;
  poolAddress?: string;
  tokenSymbol: string;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_HOLDERS = 20;

export function TokenHolders({
  tokenAddress,
  curveAddress,
  poolAddress,
  tokenSymbol,
}: TokenHoldersProps) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHolders, setTotalHolders] = useState(0);

  const fetchHolders = useCallback(async () => {
    try {
      const quais = await import("quais");
      const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
      const tokenContract = new quais.Contract(tokenAddress, BondingCurveTokenABI, provider);

      // Query Transfer events to find unique addresses
      const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
      const fromBlock = Math.max(0, currentBlock - 50000);
      const events = await tokenContract.queryFilter("Transfer", fromBlock, currentBlock);

      const addressSet = new Set<string>();
      for (const ev of events) {
        const log = ev as unknown as { args: [string, string, bigint] };
        const from = log.args[0];
        const to = log.args[1];
        if (from && from !== ZERO_ADDRESS) addressSet.add(from);
        if (to && to !== ZERO_ADDRESS) addressSet.add(to);
      }

      // Filter out contract addresses (curve, pool)
      const excludeSet = new Set(
        [curveAddress, poolAddress, tokenAddress]
          .filter(Boolean)
          .map((a) => a!.toLowerCase())
      );

      const uniqueAddresses = Array.from(addressSet).filter(
        (a) => !excludeSet.has(a.toLowerCase())
      );

      if (uniqueAddresses.length === 0) {
        setHolders([]);
        setTotalHolders(0);
        setLoading(false);
        return;
      }

      // Batch balance checks
      const balanceResults = await Promise.allSettled(
        uniqueAddresses.map((addr) => tokenContract.balanceOf(addr))
      );

      const holderList: Holder[] = [];
      for (let i = 0; i < uniqueAddresses.length; i++) {
        const result = balanceResults[i];
        if (result.status === "fulfilled") {
          const balance = parseFloat(quais.formatUnits(result.value, 18));
          if (balance > 0.01) {
            holderList.push({
              address: uniqueAddresses[i],
              balance,
              percentage: (balance / BONDING_TOTAL_SUPPLY) * 100,
            });
          }
        }
      }

      holderList.sort((a, b) => b.balance - a.balance);
      setTotalHolders(holderList.length);
      setHolders(holderList.slice(0, MAX_HOLDERS));
    } catch {
      // Holder fetch failed
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, curveAddress, poolAddress]);

  useEffect(() => {
    fetchHolders();
  }, [fetchHolders]);

  const formatBalance = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    if (n < 1) return n.toFixed(4);
    return n.toFixed(2);
  };

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={4}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontSize="xs" fontWeight="600" color="var(--text-primary)">
          Top Holders
        </Text>
        <Text fontSize="10px" color="var(--text-tertiary)">
          {totalHolders} holders
        </Text>
      </Flex>

      {loading ? (
        <VStack spacing={2} align="stretch">
          {[...Array(5)].map((_, i) => (
            <Box key={i} className="skeleton-shimmer" h="32px" rounded="lg" />
          ))}
        </VStack>
      ) : holders.length === 0 ? (
        <Flex
          h="80px"
          align="center"
          justify="center"
          bg="var(--bg-elevated)"
          rounded="lg"
        >
          <Text fontSize="xs" color="var(--text-tertiary)">
            No holders found
          </Text>
        </Flex>
      ) : (
        <Box maxH="360px" overflowY="auto" className="featured-scroll">
          {/* Header */}
          <Flex
            px={2}
            py={1.5}
            fontSize="9px"
            color="var(--text-tertiary)"
            textTransform="uppercase"
            letterSpacing="0.5px"
            position="sticky"
            top={0}
            bg="var(--bg-surface)"
            zIndex={1}
          >
            <Text flex="0 0 30px">#</Text>
            <Text flex={1}>Address</Text>
            <Text flex="0 0 100px" textAlign="right">{tokenSymbol}</Text>
            <Text flex="0 0 60px" textAlign="right" display={{ base: "none", sm: "block" }}>%</Text>
          </Flex>

          <VStack spacing={0} align="stretch">
            {holders.map((holder, i) => (
              <Flex
                key={holder.address}
                px={2}
                py={2}
                align="center"
                fontSize="xs"
                borderTop="1px solid"
                borderColor="var(--border)"
                _hover={{ bg: "var(--bg-elevated)" }}
                transition="background 0.1s"
              >
                <Text
                  flex="0 0 30px"
                  fontWeight="600"
                  color="var(--text-tertiary)"
                  fontSize="10px"
                >
                  {i + 1}
                </Text>

                <Link
                  flex={1}
                  href={getExplorerAddressUrl(holder.address)}
                  isExternal
                  fontFamily="mono"
                  fontSize="11px"
                  color="var(--text-secondary)"
                  _hover={{ color: "var(--accent)", textDecoration: "none" }}
                >
                  {shortenAddress(holder.address)}
                </Link>

                <Text
                  flex="0 0 100px"
                  textAlign="right"
                  fontFamily="mono"
                  fontSize="11px"
                  color="var(--text-primary)"
                >
                  {formatBalance(holder.balance)}
                </Text>

                <Flex flex="0 0 60px" justify="flex-end" align="center" gap={1.5} display={{ base: "none", sm: "flex" }}>
                  <Text
                    fontFamily="mono"
                    fontSize="11px"
                    color="var(--text-tertiary)"
                  >
                    {holder.percentage.toFixed(2)}%
                  </Text>
                </Flex>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
