"use client";

import { useCallback, useMemo } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { BPS_DENOMINATOR } from "@/lib/constants";

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

export function AllocationStep({ state, updateState }: StepProps) {
  const allocations = state.allocations;

  const totalBps = useMemo(
    () => allocations.reduce((sum, a) => sum + a.bps, 0),
    [allocations]
  );

  const isValid = totalBps === BPS_DENOMINATOR;

  const updateRow = useCallback(
    (index: number, updates: Partial<Allocation>) => {
      const next = allocations.map((row, i) =>
        i === index ? { ...row, ...updates } : row
      );
      updateState({ allocations: next });
    },
    [allocations, updateState]
  );

  const addRow = useCallback(() => {
    updateState({
      allocations: [
        ...allocations,
        { recipient: "", bps: 0, vested: false },
      ],
    });
  }, [allocations, updateState]);

  const removeRow = useCallback(
    (index: number) => {
      if (allocations.length <= 1) return;
      const next = allocations.filter((_, i) => i !== index);
      updateState({ allocations: next });
    },
    [allocations, updateState]
  );

  return (
    <VStack spacing={5} align="stretch">
      <Box
        bg="var(--bg-elevated)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="lg"
        p={4}
      >
        <Text fontSize="sm" color="var(--text-secondary)">
          Distribute the initial supply across wallet addresses. All allocation
          shares must sum to exactly {BPS_DENOMINATOR} ({BPS_DENOMINATOR / 100}
          %). Mark allocations as vested to configure vesting schedules in the
          next step.
        </Text>
      </Box>

      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="600">
          Allocations
        </Text>
        <Text
          fontSize="sm"
          fontWeight="600"
          color={isValid ? "var(--accent)" : "var(--sell)"}
        >
          {totalBps} / {BPS_DENOMINATOR}
        </Text>
      </HStack>

      {allocations.map((row, index) => (
        <Box
          key={index}
          bg="var(--bg-elevated)"
          border="1px solid"
          borderColor="var(--border)"
          borderRadius="lg"
          p={4}
        >
          <HStack justify="space-between" mb={3}>
            <Text fontSize="xs" color="var(--text-tertiary)" fontWeight="500">
              Allocation #{index + 1}
            </Text>
            {allocations.length > 1 && (
              <IconButton
                aria-label={`Remove allocation ${index + 1}`}
                size="xs"
                variant="ghost"
                color="var(--sell)"
                _hover={{ bg: "rgba(255,82,82,0.1)" }}
                onClick={() => removeRow(index)}
                icon={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                }
              />
            )}
          </HStack>

          <VStack spacing={3} align="stretch">
            <FormControl>
              <FormLabel color="var(--text-secondary)" fontSize="xs" mb={1}>
                Recipient Address
              </FormLabel>
              <Input
                placeholder="0x..."
                value={row.recipient}
                onChange={(e) =>
                  updateRow(index, { recipient: e.target.value })
                }
                fontFamily="mono"
                fontSize="sm"
                size="sm"
              />
            </FormControl>

            <HStack spacing={4} align="end">
              <FormControl maxW="180px">
                <FormLabel color="var(--text-secondary)" fontSize="xs" mb={1}>
                  Share (BPS)
                </FormLabel>
                <HStack>
                  <NumberInput
                    value={row.bps}
                    onChange={(_, v) => {
                      if (!Number.isNaN(v)) {
                        updateRow(index, { bps: Math.min(v, BPS_DENOMINATOR) });
                      }
                    }}
                    min={0}
                    max={BPS_DENOMINATOR}
                    size="sm"
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
                  <Text fontSize="xs" color="var(--text-secondary)" minW="50px">
                    {(row.bps / 100).toFixed(2)}%
                  </Text>
                </HStack>
              </FormControl>

              <FormControl
                display="flex"
                alignItems="center"
                w="auto"
                pb={1}
              >
                <FormLabel
                  color="var(--text-secondary)"
                  fontSize="xs"
                  mb={0}
                  mr={2}
                >
                  Vested
                </FormLabel>
                <Switch
                  isChecked={row.vested}
                  onChange={(e) =>
                    updateRow(index, { vested: e.target.checked })
                  }
                  colorScheme="green"
                  size="sm"
                />
              </FormControl>
            </HStack>
          </VStack>
        </Box>
      ))}

      <Button size="sm" variant="outline" onClick={addRow} w="fit-content">
        + Add Allocation
      </Button>

      {!isValid && (
        <Alert
          status="warning"
          bg="rgba(255, 152, 0, 0.1)"
          border="1px solid"
          borderColor="rgba(255, 152, 0, 0.3)"
          borderRadius="md"
          fontSize="sm"
        >
          <AlertIcon />
          <Text fontSize="xs">
            Allocation shares sum to {totalBps} but must equal{" "}
            {BPS_DENOMINATOR}. Remaining: {BPS_DENOMINATOR - totalBps}
          </Text>
        </Alert>
      )}

      {isValid && (
        <HStack
          bg="rgba(0, 230, 118, 0.08)"
          border="1px solid"
          borderColor="rgba(0, 230, 118, 0.2)"
          borderRadius="md"
          p={3}
        >
          <Text fontSize="xs" color="var(--accent)">
            Allocations valid. Total: {BPS_DENOMINATOR / 100}%
          </Text>
        </HStack>
      )}
    </VStack>
  );
}
