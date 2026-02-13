"use client";

import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Input,
  Collapse,
  FormControl,
  FormLabel,
  SimpleGrid,
} from "@chakra-ui/react";
import { BPS_DENOMINATOR, MAX_TAX_BPS } from "@/lib/constants";

export interface TokenomicsFormData {
  enabled: boolean;
  buyTaxBps: number;
  sellTaxBps: number;
  treasuryShareBps: number;
  autoLpShareBps: number;
  burnShareBps: number;
  reflectionShareBps: number;
  maxWalletPercent: string;
  maxTxPercent: string;
  burnOnTransfer: boolean;
  burnOnTransferBps: number;
  treasuryWallet: string;
}

const DEFAULT_DATA: TokenomicsFormData = {
  enabled: false,
  buyTaxBps: 500,
  sellTaxBps: 500,
  treasuryShareBps: 5000,
  autoLpShareBps: 0,
  burnShareBps: 0,
  reflectionShareBps: 5000,
  maxWalletPercent: "5",
  maxTxPercent: "1",
  burnOnTransfer: false,
  burnOnTransferBps: 0,
  treasuryWallet: "",
};

interface TokenomicsToggleProps {
  value: TokenomicsFormData;
  onChange: (data: TokenomicsFormData) => void;
}

export function TokenomicsToggle({ value, onChange }: TokenomicsToggleProps) {
  const data = value;
  const set = (partial: Partial<TokenomicsFormData>) =>
    onChange({ ...data, ...partial });

  const sharesSum =
    data.treasuryShareBps +
    data.autoLpShareBps +
    data.burnShareBps +
    data.reflectionShareBps;
  const sharesValid = sharesSum === BPS_DENOMINATOR;

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={4}
    >
      <HStack justify="space-between" mb={data.enabled ? 4 : 0}>
        <VStack align="start" spacing={0}>
          <Text fontSize="sm" fontWeight="600" color="var(--text-primary)">
            Post-Graduation Tokenomics
          </Text>
          <Text fontSize="xs" color="var(--text-tertiary)">
            Taxes, reflections &amp; limits activate when curve graduates
          </Text>
        </VStack>
        <Switch
          isChecked={data.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          colorScheme="green"
          size="md"
        />
      </HStack>

      <Collapse in={data.enabled} animateOpacity>
        <VStack spacing={4} align="stretch">
          {/* Tax Rates */}
          <SimpleGrid columns={2} spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" color="var(--text-secondary)">
                Buy Tax (%)
              </FormLabel>
              <Input
                size="sm"
                type="number"
                value={(data.buyTaxBps / 100).toString()}
                onChange={(e) =>
                  set({
                    buyTaxBps: Math.min(
                      Math.round(parseFloat(e.target.value || "0") * 100),
                      MAX_TAX_BPS
                    ),
                  })
                }
                bg="var(--bg-elevated)"
                borderColor="var(--border)"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" color="var(--text-secondary)">
                Sell Tax (%)
              </FormLabel>
              <Input
                size="sm"
                type="number"
                value={(data.sellTaxBps / 100).toString()}
                onChange={(e) =>
                  set({
                    sellTaxBps: Math.min(
                      Math.round(parseFloat(e.target.value || "0") * 100),
                      MAX_TAX_BPS
                    ),
                  })
                }
                bg="var(--bg-elevated)"
                borderColor="var(--border)"
              />
            </FormControl>
          </SimpleGrid>

          {/* Distribution Shares */}
          <Box>
            <Text fontSize="xs" fontWeight="600" color="var(--text-secondary)" mb={2}>
              Tax Distribution{" "}
              <Text
                as="span"
                color={sharesValid ? "var(--accent)" : "red.400"}
              >
                ({(sharesSum / 100).toFixed(1)}% / 100%)
              </Text>
            </Text>
            <SimpleGrid columns={2} spacing={3}>
              <FormControl>
                <FormLabel fontSize="xs" color="var(--text-tertiary)">
                  Treasury (%)
                </FormLabel>
                <Input
                  size="sm"
                  type="number"
                  value={(data.treasuryShareBps / 100).toString()}
                  onChange={(e) =>
                    set({
                      treasuryShareBps: Math.round(
                        parseFloat(e.target.value || "0") * 100
                      ),
                    })
                  }
                  bg="var(--bg-elevated)"
                  borderColor="var(--border)"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="var(--text-tertiary)">
                  Reflections (%)
                </FormLabel>
                <Input
                  size="sm"
                  type="number"
                  value={(data.reflectionShareBps / 100).toString()}
                  onChange={(e) =>
                    set({
                      reflectionShareBps: Math.round(
                        parseFloat(e.target.value || "0") * 100
                      ),
                    })
                  }
                  bg="var(--bg-elevated)"
                  borderColor="var(--border)"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="var(--text-tertiary)">
                  Auto LP (%)
                </FormLabel>
                <Input
                  size="sm"
                  type="number"
                  value={(data.autoLpShareBps / 100).toString()}
                  onChange={(e) =>
                    set({
                      autoLpShareBps: Math.round(
                        parseFloat(e.target.value || "0") * 100
                      ),
                    })
                  }
                  bg="var(--bg-elevated)"
                  borderColor="var(--border)"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="var(--text-tertiary)">
                  Burn (%)
                </FormLabel>
                <Input
                  size="sm"
                  type="number"
                  value={(data.burnShareBps / 100).toString()}
                  onChange={(e) =>
                    set({
                      burnShareBps: Math.round(
                        parseFloat(e.target.value || "0") * 100
                      ),
                    })
                  }
                  bg="var(--bg-elevated)"
                  borderColor="var(--border)"
                />
              </FormControl>
            </SimpleGrid>
          </Box>

          {/* Limits */}
          <SimpleGrid columns={2} spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs" color="var(--text-secondary)">
                Max Wallet (% of supply)
              </FormLabel>
              <Input
                size="sm"
                type="number"
                value={data.maxWalletPercent}
                onChange={(e) =>
                  set({ maxWalletPercent: e.target.value })
                }
                bg="var(--bg-elevated)"
                borderColor="var(--border)"
                placeholder="0 = no limit"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" color="var(--text-secondary)">
                Max Tx (% of supply)
              </FormLabel>
              <Input
                size="sm"
                type="number"
                value={data.maxTxPercent}
                onChange={(e) =>
                  set({ maxTxPercent: e.target.value })
                }
                bg="var(--bg-elevated)"
                borderColor="var(--border)"
                placeholder="0 = no limit"
              />
            </FormControl>
          </SimpleGrid>

          {/* Treasury Wallet */}
          <FormControl>
            <FormLabel fontSize="xs" color="var(--text-secondary)">
              Treasury Wallet Address
            </FormLabel>
            <Input
              size="sm"
              value={data.treasuryWallet}
              onChange={(e) => set({ treasuryWallet: e.target.value })}
              bg="var(--bg-elevated)"
              borderColor="var(--border)"
              placeholder="0x..."
              fontFamily="mono"
              fontSize="xs"
            />
          </FormControl>
        </VStack>
      </Collapse>
    </Box>
  );
}

export { DEFAULT_DATA as DEFAULT_TOKENOMICS_DATA };
