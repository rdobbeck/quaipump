"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Divider,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import type { TokenInfo } from "@/hooks/useTokenomicsToken";
import { formatBps, formatSupply, supplyTypeLabel } from "@/lib/utils";

interface TokenStatsProps {
  tokenInfo: TokenInfo;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="xs"
      fontWeight="600"
      color="var(--accent)"
      textTransform="uppercase"
      letterSpacing="0.05em"
    >
      {children}
    </Text>
  );
}

function StatRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <HStack justify="space-between" py={1}>
      <Text fontSize="sm" color="var(--text-secondary)">
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight="500"
        fontFamily={mono ? "mono" : undefined}
        textAlign="right"
        maxW="60%"
        noOfLines={1}
      >
        {value}
      </Text>
    </HStack>
  );
}

export function TokenStats({ tokenInfo }: TokenStatsProps) {
  const { taxConfig, limitConfig } = tokenInfo;
  const hasTax = taxConfig.buyTaxBps > 0 || taxConfig.sellTaxBps > 0;
  const hasMaxWallet =
    limitConfig.maxWalletAmount !== "0" &&
    limitConfig.maxWalletAmount !== "0.0";
  const hasMaxTx =
    limitConfig.maxTxAmount !== "0" && limitConfig.maxTxAmount !== "0.0";

  return (
    <VStack spacing={4} align="stretch">
      {/* Supply Info */}
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="xl"
        p={5}
      >
        <SectionHeading>Supply</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={0} align="stretch">
          <StatRow
            label="Total Supply"
            value={`${formatSupply(tokenInfo.totalSupply)} ${tokenInfo.symbol}`}
            mono
          />
          <StatRow
            label="Supply Type"
            value={
              <Badge
                fontSize="xs"
                colorScheme={tokenInfo.supplyType === 1 ? "green" : "gray"}
                variant="subtle"
              >
                {supplyTypeLabel(tokenInfo.supplyType)}
              </Badge>
            }
          />
          {tokenInfo.supplyType === 1 && (
            <StatRow
              label="Hard Cap"
              value={`${formatSupply(tokenInfo.hardCap)} ${tokenInfo.symbol}`}
              mono
            />
          )}
        </VStack>
      </Box>

      {/* Fee Info */}
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="xl"
        p={5}
      >
        <SectionHeading>Fees</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={0} align="stretch">
          <StatRow
            label="Total Fees Collected"
            value={`${formatSupply(tokenInfo.totalFees)} ${tokenInfo.symbol}`}
            mono
          />
        </VStack>
      </Box>

      {/* Tax Config */}
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="xl"
        p={5}
      >
        <SectionHeading>Tax Configuration</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={0} align="stretch">
          <StatRow label="Buy Tax" value={formatBps(taxConfig.buyTaxBps)} />
          <StatRow label="Sell Tax" value={formatBps(taxConfig.sellTaxBps)} />
          {hasTax && (
            <>
              <Divider borderColor="var(--border)" my={2} />
              <Text fontSize="xs" color="var(--text-tertiary)" mb={1}>
                Share Distribution
              </Text>
              <SimpleGrid columns={2} spacing={1}>
                <StatRow
                  label="Treasury"
                  value={formatBps(taxConfig.treasuryShareBps)}
                />
                <StatRow
                  label="Auto LP"
                  value={formatBps(taxConfig.autoLpShareBps)}
                />
                <StatRow
                  label="Burn"
                  value={formatBps(taxConfig.burnShareBps)}
                />
                <StatRow
                  label="Reflection"
                  value={formatBps(taxConfig.reflectionShareBps)}
                />
              </SimpleGrid>
            </>
          )}
        </VStack>
      </Box>

      {/* Limit Config */}
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="xl"
        p={5}
      >
        <SectionHeading>Limits</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={0} align="stretch">
          <StatRow
            label="Max Wallet"
            value={
              hasMaxWallet
                ? `${formatSupply(limitConfig.maxWalletAmount)} ${tokenInfo.symbol}`
                : "No limit"
            }
            mono={hasMaxWallet}
          />
          <StatRow
            label="Max Transaction"
            value={
              hasMaxTx
                ? `${formatSupply(limitConfig.maxTxAmount)} ${tokenInfo.symbol}`
                : "No limit"
            }
            mono={hasMaxTx}
          />
        </VStack>
      </Box>
    </VStack>
  );
}
