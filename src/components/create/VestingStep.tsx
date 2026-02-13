"use client";

import { useCallback, useEffect, useMemo } from "react";
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
  SimpleGrid,
} from "@chakra-ui/react";
import { shortenAddress } from "@/lib/utils";

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

export function VestingStep({ state, updateState }: StepProps) {
  const vestedAllocations = useMemo(
    () => state.allocations.filter((a) => a.vested),
    [state.allocations]
  );

  // Sync vestingSchedules array when vested allocations change
  useEffect(() => {
    const vestedRecipients = vestedAllocations.map((a) => a.recipient);

    // Build new schedules: keep existing data for matching beneficiaries,
    // add defaults for new ones, remove stale ones.
    const existingByBeneficiary = new Map(
      state.vestingSchedules.map((vs) => [vs.beneficiary, vs])
    );

    const synced: VestingSchedule[] = vestedRecipients.map((recipient) => {
      const existing = existingByBeneficiary.get(recipient);
      if (existing) return existing;
      return { beneficiary: recipient, cliffDays: 0, durationDays: 0 };
    });

    // Only update if the array actually changed to avoid infinite loops
    const changed =
      synced.length !== state.vestingSchedules.length ||
      synced.some(
        (s, i) =>
          s.beneficiary !== state.vestingSchedules[i]?.beneficiary
      );

    if (changed) {
      updateState({ vestingSchedules: synced });
    }
  }, [vestedAllocations, state.vestingSchedules, updateState]);

  const updateSchedule = useCallback(
    (index: number, updates: Partial<VestingSchedule>) => {
      const next = state.vestingSchedules.map((s, i) =>
        i === index ? { ...s, ...updates } : s
      );
      updateState({ vestingSchedules: next });
    },
    [state.vestingSchedules, updateState]
  );

  if (vestedAllocations.length === 0) {
    return (
      <VStack spacing={4} align="stretch">
        <Box
          bg="var(--bg-elevated)"
          border="1px solid"
          borderColor="var(--border)"
          borderRadius="lg"
          p={6}
          textAlign="center"
        >
          <Text fontSize="sm" color="var(--text-secondary)" mb={2}>
            No vested allocations found.
          </Text>
          <Text fontSize="xs" color="var(--text-tertiary)">
            Go back to the Allocations step and mark one or more allocations as
            vested to configure vesting schedules.
          </Text>
        </Box>
      </VStack>
    );
  }

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
          Configure cliff and vesting duration for each vested allocation. Cliff
          is the initial lock period before any tokens are released. Duration is
          the total vesting period (including cliff). Values are in days and will
          be converted to seconds on deploy.
        </Text>
      </Box>

      {state.vestingSchedules.map((schedule, index) => {
        const matchingAllocation = vestedAllocations.find(
          (a) => a.recipient === schedule.beneficiary
        );
        const allocationBps = matchingAllocation?.bps ?? 0;

        return (
          <Box
            key={schedule.beneficiary || index}
            bg="var(--bg-elevated)"
            border="1px solid"
            borderColor="var(--border)"
            borderRadius="lg"
            p={4}
          >
            <HStack justify="space-between" mb={4}>
              <Text fontSize="xs" color="var(--text-tertiary)" fontWeight="500">
                Vesting Schedule #{index + 1}
              </Text>
              <Text fontSize="xs" color="var(--accent)">
                {(allocationBps / 100).toFixed(2)}% of supply
              </Text>
            </HStack>

            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel color="var(--text-secondary)" fontSize="xs" mb={1}>
                  Beneficiary
                </FormLabel>
                <Input
                  value={schedule.beneficiary}
                  isReadOnly
                  fontFamily="mono"
                  fontSize="sm"
                  size="sm"
                  bg="var(--bg-primary)"
                  cursor="default"
                  _focus={{ borderColor: "var(--border)" }}
                />
                {schedule.beneficiary && (
                  <FormHelperText
                    color="var(--text-tertiary)"
                    fontSize="xs"
                    fontFamily="mono"
                  >
                    {shortenAddress(schedule.beneficiary)}
                  </FormHelperText>
                )}
              </FormControl>

              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                <FormControl>
                  <FormLabel color="var(--text-secondary)" fontSize="xs" mb={1}>
                    Cliff (days)
                  </FormLabel>
                  <NumberInput
                    value={schedule.cliffDays}
                    onChange={(_, v) => {
                      if (!Number.isNaN(v)) {
                        updateSchedule(index, { cliffDays: Math.max(0, v) });
                      }
                    }}
                    min={0}
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
                  <FormHelperText color="var(--text-tertiary)" fontSize="xs">
                    Lock period before tokens start releasing
                  </FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel color="var(--text-secondary)" fontSize="xs" mb={1}>
                    Duration (days)
                  </FormLabel>
                  <NumberInput
                    value={schedule.durationDays}
                    onChange={(_, v) => {
                      if (!Number.isNaN(v)) {
                        updateSchedule(index, {
                          durationDays: Math.max(0, v),
                        });
                      }
                    }}
                    min={0}
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
                  <FormHelperText color="var(--text-tertiary)" fontSize="xs">
                    Total vesting period including cliff
                  </FormHelperText>
                </FormControl>
              </SimpleGrid>

              {schedule.cliffDays > 0 &&
                schedule.durationDays > 0 &&
                schedule.cliffDays > schedule.durationDays && (
                  <Text fontSize="xs" color="var(--sell)">
                    Cliff cannot exceed total duration
                  </Text>
                )}
            </VStack>
          </Box>
        );
      })}
    </VStack>
  );
}
