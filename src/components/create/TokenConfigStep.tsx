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
  Switch,
  HStack,
  VStack,
  Text,
  Tab,
  TabList,
  Tabs,
} from "@chakra-ui/react";
import { DEFAULT_DECIMALS } from "@/lib/constants";

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

export function TokenConfigStep({ state, updateState }: StepProps) {
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ name: e.target.value });
    },
    [updateState]
  );

  const handleSymbolChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ symbol: e.target.value.toUpperCase() });
    },
    [updateState]
  );

  const handleDecimalsChange = useCallback(
    (_: string, valueAsNumber: number) => {
      if (!Number.isNaN(valueAsNumber)) {
        updateState({ decimals: valueAsNumber });
      }
    },
    [updateState]
  );

  const handleSupplyTypeChange = useCallback(
    (index: number) => {
      updateState({ supplyType: index });
    },
    [updateState]
  );

  const handleInitialSupplyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ initialSupply: e.target.value });
    },
    [updateState]
  );

  const handleHardCapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ hardCap: e.target.value });
    },
    [updateState]
  );

  const handleBurnToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({
        burnOnTransfer: e.target.checked,
        burnOnTransferBps: e.target.checked ? state.burnOnTransferBps : 0,
      });
    },
    [updateState, state.burnOnTransferBps]
  );

  const handleBurnBpsChange = useCallback(
    (_: string, valueAsNumber: number) => {
      if (!Number.isNaN(valueAsNumber)) {
        updateState({ burnOnTransferBps: valueAsNumber });
      }
    },
    [updateState]
  );

  const hardCapTooLow =
    state.supplyType === 1 &&
    state.hardCap !== "" &&
    state.initialSupply !== "" &&
    parseFloat(state.hardCap) < parseFloat(state.initialSupply);

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={4} align="start">
        <FormControl isRequired>
          <FormLabel color="var(--text-secondary)" fontSize="sm">
            Token Name
          </FormLabel>
          <Input
            placeholder="My Token"
            value={state.name}
            onChange={handleNameChange}
          />
        </FormControl>

        <FormControl isRequired maxW="180px">
          <FormLabel color="var(--text-secondary)" fontSize="sm">
            Symbol
          </FormLabel>
          <Input
            placeholder="TKN"
            value={state.symbol}
            onChange={handleSymbolChange}
            maxLength={11}
          />
        </FormControl>
      </HStack>

      <FormControl maxW="180px">
        <FormLabel color="var(--text-secondary)" fontSize="sm">
          Decimals
        </FormLabel>
        <NumberInput
          value={state.decimals}
          onChange={handleDecimalsChange}
          min={0}
          max={18}
          defaultValue={DEFAULT_DECIMALS}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper borderColor="var(--border)" color="var(--text-secondary)" />
            <NumberDecrementStepper borderColor="var(--border)" color="var(--text-secondary)" />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <FormLabel color="var(--text-secondary)" fontSize="sm">
          Supply Type
        </FormLabel>
        <Tabs
          variant="soft-rounded"
          index={state.supplyType}
          onChange={handleSupplyTypeChange}
          size="sm"
        >
          <TabList
            bg="var(--bg-elevated)"
            p={1}
            borderRadius="lg"
            w="fit-content"
          >
            <Tab>Fixed</Tab>
            <Tab>Mintable</Tab>
          </TabList>
        </Tabs>
      </FormControl>

      <FormControl isRequired>
        <FormLabel color="var(--text-secondary)" fontSize="sm">
          Initial Supply
        </FormLabel>
        <Input
          type="number"
          placeholder="1000000"
          value={state.initialSupply}
          onChange={handleInitialSupplyChange}
          min={0}
        />
        <FormHelperText color="var(--text-tertiary)" fontSize="xs">
          Total tokens minted at deployment
        </FormHelperText>
      </FormControl>

      {state.supplyType === 1 && (
        <FormControl isRequired isInvalid={hardCapTooLow}>
          <FormLabel color="var(--text-secondary)" fontSize="sm">
            Hard Cap
          </FormLabel>
          <Input
            type="number"
            placeholder="10000000"
            value={state.hardCap}
            onChange={handleHardCapChange}
            min={0}
          />
          {hardCapTooLow ? (
            <Text color="var(--sell)" fontSize="xs" mt={1}>
              Hard cap must be greater than or equal to initial supply
            </Text>
          ) : (
            <FormHelperText color="var(--text-tertiary)" fontSize="xs">
              Maximum supply that can ever be minted
            </FormHelperText>
          )}
        </FormControl>
      )}

      <Box
        bg="var(--bg-elevated)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="lg"
        p={4}
      >
        <HStack justify="space-between" mb={state.burnOnTransfer ? 4 : 0}>
          <Box>
            <Text fontSize="sm" fontWeight="500">
              Burn on Transfer
            </Text>
            <Text fontSize="xs" color="var(--text-secondary)">
              Automatically burn a percentage of every transfer
            </Text>
          </Box>
          <Switch
            isChecked={state.burnOnTransfer}
            onChange={handleBurnToggle}
            colorScheme="green"
            size="md"
          />
        </HStack>

        {state.burnOnTransfer && (
          <FormControl>
            <FormLabel color="var(--text-secondary)" fontSize="sm">
              Burn Rate (BPS)
            </FormLabel>
            <HStack>
              <NumberInput
                value={state.burnOnTransferBps}
                onChange={handleBurnBpsChange}
                min={0}
                max={10000}
                maxW="160px"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper borderColor="var(--border)" color="var(--text-secondary)" />
                  <NumberDecrementStepper borderColor="var(--border)" color="var(--text-secondary)" />
                </NumberInputStepper>
              </NumberInput>
              <Text fontSize="sm" color="var(--text-secondary)" minW="60px">
                {(state.burnOnTransferBps / 100).toFixed(2)}%
              </Text>
            </HStack>
          </FormControl>
        )}
      </Box>
    </VStack>
  );
}
