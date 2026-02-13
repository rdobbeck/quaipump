"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Skeleton,
} from "@chakra-ui/react";
import { NETWORK } from "@/lib/constants";
import BondingCurveTokenV2ABI from "@/lib/abi/BondingCurveTokenV2.json";

interface TaxConfig {
  buyTaxBps: number;
  sellTaxBps: number;
  treasuryShareBps: number;
  autoLpShareBps: number;
  burnShareBps: number;
  reflectionShareBps: number;
}

interface TokenomicsStatusProps {
  tokenAddress: string;
  graduated: boolean;
}

export function TokenomicsStatus({
  tokenAddress,
  graduated,
}: TokenomicsStatusProps) {
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [totalFees, setTotalFees] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  const fetchTokenomics = useCallback(async () => {
    try {
      const quais = await import("quais");
      const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
      const contract = new quais.Contract(
        tokenAddress,
        BondingCurveTokenV2ABI,
        provider
      );

      const [tax, fees, isGraduated] = await Promise.all([
        contract.getTaxConfig(),
        contract.totalFees(),
        contract.graduated(),
      ]);

      setTaxConfig({
        buyTaxBps: Number(tax.buyTaxBps),
        sellTaxBps: Number(tax.sellTaxBps),
        treasuryShareBps: Number(tax.treasuryShareBps),
        autoLpShareBps: Number(tax.autoLpShareBps),
        burnShareBps: Number(tax.burnShareBps),
        reflectionShareBps: Number(tax.reflectionShareBps),
      });
      setTotalFees(quais.formatUnits(fees, 18));
    } catch {
      // Token may not be V2
    } finally {
      setLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchTokenomics();
  }, [fetchTokenomics]);

  if (loading) {
    return (
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        rounded="xl"
        p={4}
      >
        <Skeleton h="80px" rounded="md" startColor="var(--bg-surface)" endColor="var(--bg-elevated)" />
      </Box>
    );
  }

  if (!taxConfig) return null;

  const hasTax = taxConfig.buyTaxBps > 0 || taxConfig.sellTaxBps > 0;
  if (!hasTax) return null;

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={4}
    >
      <HStack justify="space-between" mb={3}>
        <Text fontSize="sm" fontWeight="700" color="var(--text-primary)">
          Tokenomics
        </Text>
        <Box
          bg={graduated ? "rgba(0,230,118,0.12)" : "rgba(255,215,0,0.15)"}
          color={graduated ? "var(--accent)" : "#ffd700"}
          px={2}
          py={0.5}
          rounded="md"
          fontSize="10px"
          fontWeight="600"
        >
          {graduated ? "ACTIVE" : "PENDING"}
        </Box>
      </HStack>

      {!graduated && (
        <Text fontSize="xs" color="var(--text-tertiary)" mb={3}>
          Tokenomics will activate when the bonding curve graduates
        </Text>
      )}

      <VStack spacing={3} align="stretch">
        {/* Tax Rates */}
        <SimpleGrid columns={2} spacing={2}>
          <Box bg="var(--bg-elevated)" rounded="md" p={2}>
            <Text fontSize="10px" color="var(--text-tertiary)">
              Buy Tax
            </Text>
            <Text fontSize="sm" fontWeight="600" fontFamily="mono" color="var(--text-primary)">
              {(taxConfig.buyTaxBps / 100).toFixed(1)}%
            </Text>
          </Box>
          <Box bg="var(--bg-elevated)" rounded="md" p={2}>
            <Text fontSize="10px" color="var(--text-tertiary)">
              Sell Tax
            </Text>
            <Text fontSize="sm" fontWeight="600" fontFamily="mono" color="var(--text-primary)">
              {(taxConfig.sellTaxBps / 100).toFixed(1)}%
            </Text>
          </Box>
        </SimpleGrid>

        {/* Distribution */}
        <Box>
          <Text fontSize="10px" color="var(--text-tertiary)" mb={1}>
            Tax Split
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {taxConfig.treasuryShareBps > 0 && (
              <Box bg="var(--bg-elevated)" rounded="md" px={2} py={1}>
                <Text fontSize="10px" color="var(--text-secondary)">
                  Treasury {(taxConfig.treasuryShareBps / 100).toFixed(0)}%
                </Text>
              </Box>
            )}
            {taxConfig.reflectionShareBps > 0 && (
              <Box bg="var(--bg-elevated)" rounded="md" px={2} py={1}>
                <Text fontSize="10px" color="var(--text-secondary)">
                  Reflections {(taxConfig.reflectionShareBps / 100).toFixed(0)}%
                </Text>
              </Box>
            )}
            {taxConfig.autoLpShareBps > 0 && (
              <Box bg="var(--bg-elevated)" rounded="md" px={2} py={1}>
                <Text fontSize="10px" color="var(--text-secondary)">
                  Auto LP {(taxConfig.autoLpShareBps / 100).toFixed(0)}%
                </Text>
              </Box>
            )}
            {taxConfig.burnShareBps > 0 && (
              <Box bg="var(--bg-elevated)" rounded="md" px={2} py={1}>
                <Text fontSize="10px" color="var(--text-secondary)">
                  Burn {(taxConfig.burnShareBps / 100).toFixed(0)}%
                </Text>
              </Box>
            )}
          </HStack>
        </Box>

        {/* Live Stats (post-graduation) */}
        {graduated && parseFloat(totalFees) > 0 && (
          <Box bg="var(--bg-elevated)" rounded="md" p={2}>
            <Text fontSize="10px" color="var(--text-tertiary)">
              Total Reflections Distributed
            </Text>
            <Text fontSize="sm" fontWeight="600" fontFamily="mono" color="var(--accent)">
              {parseFloat(totalFees).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              tokens
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
