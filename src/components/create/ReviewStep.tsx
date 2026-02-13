"use client";

import { useCallback } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  HStack,
  Text,
  Divider,
  Badge,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from "@chakra-ui/react";
import { formatBps, shortenAddress, supplyTypeLabel } from "@/lib/utils";
import { DEX_ROUTER_ADDRESS } from "@/lib/constants";

interface Allocation {
  recipient: string;
  bps: number;
  vested: boolean;
}

interface VestingSchedule {
  beneficiary: string;
  cliffDays: number;
  durationDays: number;
}

interface WizardState {
  name: string;
  symbol: string;
  decimals: number;
  supplyType: number;
  initialSupply: string;
  hardCap: string;
  burnOnTransfer: boolean;
  burnOnTransferBps: number;
  buyTaxBps: number;
  sellTaxBps: number;
  treasuryShareBps: number;
  autoLpShareBps: number;
  burnShareBps: number;
  reflectionShareBps: number;
  maxWalletAmount: string;
  maxTxAmount: string;
  allocations: Allocation[];
  vestingSchedules: VestingSchedule[];
  dexRouter: string;
  lpLockDuration: number;
  treasuryWallet: string;
}

interface StepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
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

function SummaryRow({
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

export function ReviewStep({ state, updateState }: StepProps) {
  const hasTax = state.buyTaxBps > 0 || state.sellTaxBps > 0;
  const hasLimits =
    (state.maxWalletAmount !== "" && state.maxWalletAmount !== "0") ||
    (state.maxTxAmount !== "" && state.maxTxAmount !== "0");
  const hasVesting = state.vestingSchedules.length > 0;

  const handleDexRouter = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ dexRouter: e.target.value });
    },
    [updateState]
  );

  const handleLpLockDuration = useCallback(
    (_: string, v: number) => {
      if (!Number.isNaN(v)) {
        updateState({ lpLockDuration: v });
      }
    },
    [updateState]
  );

  const handleTreasuryWallet = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ treasuryWallet: e.target.value });
    },
    [updateState]
  );

  return (
    <VStack spacing={6} align="stretch">
      {/* --- Token Config Summary --- */}
      <Box
        bg="var(--bg-elevated)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="lg"
        p={5}
      >
        <SectionHeading>Token Configuration</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={0} align="stretch">
          <SummaryRow label="Name" value={state.name || "--"} />
          <SummaryRow label="Symbol" value={state.symbol || "--"} />
          <SummaryRow label="Decimals" value={state.decimals} />
          <SummaryRow
            label="Supply Type"
            value={
              <Badge
                fontSize="xs"
                colorScheme={state.supplyType === 1 ? "green" : "gray"}
                variant="subtle"
              >
                {supplyTypeLabel(state.supplyType)}
              </Badge>
            }
          />
          <SummaryRow
            label="Initial Supply"
            value={state.initialSupply || "0"}
            mono
          />
          {state.supplyType === 1 && (
            <SummaryRow
              label="Hard Cap"
              value={state.hardCap || "0"}
              mono
            />
          )}
          <SummaryRow
            label="Burn on Transfer"
            value={
              state.burnOnTransfer
                ? formatBps(state.burnOnTransferBps)
                : "Disabled"
            }
          />
        </VStack>
      </Box>

      {/* --- Tax Config Summary --- */}
      <Box
        bg="var(--bg-elevated)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="lg"
        p={5}
      >
        <SectionHeading>Tax Configuration</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={0} align="stretch">
          <SummaryRow
            label="Buy Tax"
            value={formatBps(state.buyTaxBps)}
          />
          <SummaryRow
            label="Sell Tax"
            value={formatBps(state.sellTaxBps)}
          />
          {hasTax && (
            <>
              <Divider borderColor="var(--border)" my={2} />
              <Text fontSize="xs" color="var(--text-tertiary)" mb={1}>
                Distribution Shares
              </Text>
              <SimpleGrid columns={2} spacing={1}>
                <SummaryRow
                  label="Treasury"
                  value={formatBps(state.treasuryShareBps)}
                />
                <SummaryRow
                  label="Auto LP"
                  value={formatBps(state.autoLpShareBps)}
                />
                <SummaryRow
                  label="Burn"
                  value={formatBps(state.burnShareBps)}
                />
                <SummaryRow
                  label="Reflection"
                  value={formatBps(state.reflectionShareBps)}
                />
              </SimpleGrid>
            </>
          )}
        </VStack>
      </Box>

      {/* --- Limits Summary --- */}
      <Box
        bg="var(--bg-elevated)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="lg"
        p={5}
      >
        <SectionHeading>Limits</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={0} align="stretch">
          <SummaryRow
            label="Max Wallet"
            value={
              state.maxWalletAmount && state.maxWalletAmount !== "0"
                ? state.maxWalletAmount
                : "No limit"
            }
            mono={hasLimits}
          />
          <SummaryRow
            label="Max Transaction"
            value={
              state.maxTxAmount && state.maxTxAmount !== "0"
                ? state.maxTxAmount
                : "No limit"
            }
            mono={hasLimits}
          />
        </VStack>
      </Box>

      {/* --- Allocations Summary --- */}
      <Box
        bg="var(--bg-elevated)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="lg"
        p={5}
      >
        <SectionHeading>Allocations</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        {state.allocations.length > 0 ? (
          <TableContainer>
            <Table size="sm" variant="unstyled">
              <Thead>
                <Tr>
                  <Th
                    color="var(--text-tertiary)"
                    fontSize="xs"
                    borderColor="var(--border)"
                    px={2}
                  >
                    Recipient
                  </Th>
                  <Th
                    color="var(--text-tertiary)"
                    fontSize="xs"
                    borderColor="var(--border)"
                    px={2}
                    isNumeric
                  >
                    Share
                  </Th>
                  <Th
                    color="var(--text-tertiary)"
                    fontSize="xs"
                    borderColor="var(--border)"
                    px={2}
                  >
                    Vested
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {state.allocations.map((alloc, i) => (
                  <Tr key={i}>
                    <Td
                      fontFamily="mono"
                      fontSize="xs"
                      borderColor="var(--border)"
                      px={2}
                    >
                      {alloc.recipient
                        ? shortenAddress(alloc.recipient)
                        : "--"}
                    </Td>
                    <Td
                      fontSize="xs"
                      borderColor="var(--border)"
                      px={2}
                      isNumeric
                    >
                      {formatBps(alloc.bps)}
                    </Td>
                    <Td fontSize="xs" borderColor="var(--border)" px={2}>
                      {alloc.vested ? (
                        <Badge
                          fontSize="xx-small"
                          colorScheme="green"
                          variant="subtle"
                        >
                          Yes
                        </Badge>
                      ) : (
                        <Text color="var(--text-tertiary)">No</Text>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Text fontSize="sm" color="var(--text-secondary)">
            No allocations configured
          </Text>
        )}
      </Box>

      {/* --- Vesting Summary --- */}
      {hasVesting && (
        <Box
          bg="var(--bg-elevated)"
          border="1px solid"
          borderColor="var(--border)"
          borderRadius="lg"
          p={5}
        >
          <SectionHeading>Vesting Schedules</SectionHeading>
          <Divider borderColor="var(--border)" my={3} />
          <TableContainer>
            <Table size="sm" variant="unstyled">
              <Thead>
                <Tr>
                  <Th
                    color="var(--text-tertiary)"
                    fontSize="xs"
                    borderColor="var(--border)"
                    px={2}
                  >
                    Beneficiary
                  </Th>
                  <Th
                    color="var(--text-tertiary)"
                    fontSize="xs"
                    borderColor="var(--border)"
                    px={2}
                    isNumeric
                  >
                    Cliff
                  </Th>
                  <Th
                    color="var(--text-tertiary)"
                    fontSize="xs"
                    borderColor="var(--border)"
                    px={2}
                    isNumeric
                  >
                    Duration
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {state.vestingSchedules.map((vs, i) => (
                  <Tr key={i}>
                    <Td
                      fontFamily="mono"
                      fontSize="xs"
                      borderColor="var(--border)"
                      px={2}
                    >
                      {vs.beneficiary
                        ? shortenAddress(vs.beneficiary)
                        : "--"}
                    </Td>
                    <Td
                      fontSize="xs"
                      borderColor="var(--border)"
                      px={2}
                      isNumeric
                    >
                      {vs.cliffDays} days
                    </Td>
                    <Td
                      fontSize="xs"
                      borderColor="var(--border)"
                      px={2}
                      isNumeric
                    >
                      {vs.durationDays} days
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* --- Deploy Settings --- */}
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--accent)"
        borderRadius="lg"
        p={5}
      >
        <SectionHeading>Deploy Settings</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />

        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel color="var(--text-secondary)" fontSize="sm">
              DEX Router Address
            </FormLabel>
            <Input
              placeholder={DEX_ROUTER_ADDRESS || "0x..."}
              value={state.dexRouter}
              onChange={handleDexRouter}
              fontFamily="mono"
              fontSize="sm"
            />
            <FormHelperText color="var(--text-tertiary)" fontSize="xs">
              Router contract used for auto LP and trading
            </FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel color="var(--text-secondary)" fontSize="sm">
              LP Lock Duration (days)
            </FormLabel>
            <NumberInput
              value={state.lpLockDuration}
              onChange={handleLpLockDuration}
              min={0}
              maxW="200px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper
                  borderColor="var(--border)"
                  color="var(--text-secondary)"
                />
                <NumberDecrementStepper
                  borderColor="var(--border)"
                  color="var(--text-secondary)"
                />
              </NumberInputStepper>
            </NumberInput>
            <FormHelperText color="var(--text-tertiary)" fontSize="xs">
              How long LP tokens will be locked after deployment
            </FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel color="var(--text-secondary)" fontSize="sm">
              Treasury Wallet
            </FormLabel>
            <Input
              placeholder="0x..."
              value={state.treasuryWallet}
              onChange={handleTreasuryWallet}
              fontFamily="mono"
              fontSize="sm"
            />
            <FormHelperText color="var(--text-tertiary)" fontSize="xs">
              Wallet that receives treasury share of collected taxes
            </FormHelperText>
          </FormControl>
        </VStack>
      </Box>
    </VStack>
  );
}
