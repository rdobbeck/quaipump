"use client";

import { useCallback, useMemo } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  HStack,
  VStack,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Alert,
  AlertIcon,
  SimpleGrid,
} from "@chakra-ui/react";
import { MAX_TAX_BPS, BPS_DENOMINATOR } from "@/lib/constants";

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

function TaxSlider({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  max: number;
}) {
  const handleSlider = useCallback(
    (v: number) => onChange(v),
    [onChange]
  );

  const handleInput = useCallback(
    (_: string, v: number) => {
      if (!Number.isNaN(v)) {
        onChange(Math.min(v, max));
      }
    },
    [onChange, max]
  );

  return (
    <FormControl>
      <HStack justify="space-between" mb={2}>
        <FormLabel color="var(--text-secondary)" fontSize="sm" mb={0}>
          {label}
        </FormLabel>
        <Text fontSize="sm" color="var(--accent)" fontWeight="500">
          {(value / 100).toFixed(2)}%
        </Text>
      </HStack>
      <HStack spacing={4}>
        <Slider
          value={value}
          onChange={handleSlider}
          min={0}
          max={max}
          step={25}
          flex={1}
          focusThumbOnChange={false}
        >
          <SliderTrack bg="var(--bg-elevated)" h="6px" borderRadius="full">
            <SliderFilledTrack bg="var(--accent)" />
          </SliderTrack>
          <SliderThumb
            boxSize="16px"
            bg="var(--accent)"
            _focus={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
          />
        </Slider>
        <NumberInput
          value={value}
          onChange={handleInput}
          min={0}
          max={max}
          maxW="100px"
          size="sm"
        >
          <NumberInputField textAlign="right" />
        </NumberInput>
      </HStack>
    </FormControl>
  );
}

function ShareInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) {
  const handleChange = useCallback(
    (_: string, v: number) => {
      if (!Number.isNaN(v)) {
        onChange(Math.min(v, BPS_DENOMINATOR));
      }
    },
    [onChange]
  );

  return (
    <FormControl>
      <FormLabel color="var(--text-secondary)" fontSize="xs" mb={1}>
        {label}
      </FormLabel>
      <HStack>
        <NumberInput
          value={value}
          onChange={handleChange}
          min={0}
          max={BPS_DENOMINATOR}
          size="sm"
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper borderColor="var(--border)" color="var(--text-secondary)" />
            <NumberDecrementStepper borderColor="var(--border)" color="var(--text-secondary)" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="var(--text-secondary)" minW="50px">
          {(value / 100).toFixed(2)}%
        </Text>
      </HStack>
    </FormControl>
  );
}

export function TaxConfigStep({ state, updateState }: StepProps) {
  const hasTax = state.buyTaxBps > 0 || state.sellTaxBps > 0;

  const sharesSum = useMemo(
    () =>
      state.treasuryShareBps +
      state.autoLpShareBps +
      state.burnShareBps +
      state.reflectionShareBps,
    [
      state.treasuryShareBps,
      state.autoLpShareBps,
      state.burnShareBps,
      state.reflectionShareBps,
    ]
  );

  const sharesValid = !hasTax || sharesSum === BPS_DENOMINATOR;

  const handleBuyTax = useCallback(
    (val: number) => updateState({ buyTaxBps: val }),
    [updateState]
  );

  const handleSellTax = useCallback(
    (val: number) => updateState({ sellTaxBps: val }),
    [updateState]
  );

  const handleTreasuryShare = useCallback(
    (val: number) => updateState({ treasuryShareBps: val }),
    [updateState]
  );

  const handleAutoLpShare = useCallback(
    (val: number) => updateState({ autoLpShareBps: val }),
    [updateState]
  );

  const handleBurnShare = useCallback(
    (val: number) => updateState({ burnShareBps: val }),
    [updateState]
  );

  const handleReflectionShare = useCallback(
    (val: number) => updateState({ reflectionShareBps: val }),
    [updateState]
  );

  return (
    <VStack spacing={6} align="stretch">
      <TaxSlider
        label="Buy Tax"
        value={state.buyTaxBps}
        onChange={handleBuyTax}
        max={MAX_TAX_BPS}
      />

      <TaxSlider
        label="Sell Tax"
        value={state.sellTaxBps}
        onChange={handleSellTax}
        max={MAX_TAX_BPS}
      />

      {hasTax && (
        <Box
          bg="var(--bg-elevated)"
          border="1px solid"
          borderColor="var(--border)"
          borderRadius="lg"
          p={5}
        >
          <HStack justify="space-between" mb={4}>
            <Text fontSize="sm" fontWeight="600">
              Tax Distribution Shares
            </Text>
            <Text
              fontSize="sm"
              fontWeight="600"
              color={sharesValid ? "var(--accent)" : "var(--sell)"}
            >
              {sharesSum} / {BPS_DENOMINATOR}
            </Text>
          </HStack>

          <FormHelperText color="var(--text-tertiary)" fontSize="xs" mb={4} mt={0}>
            Shares must sum to {BPS_DENOMINATOR} (100%). These control how collected
            tax is distributed.
          </FormHelperText>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            <ShareInput
              label="Treasury"
              value={state.treasuryShareBps}
              onChange={handleTreasuryShare}
            />
            <ShareInput
              label="Auto LP"
              value={state.autoLpShareBps}
              onChange={handleAutoLpShare}
            />
            <ShareInput
              label="Burn"
              value={state.burnShareBps}
              onChange={handleBurnShare}
            />
            <ShareInput
              label="Reflection"
              value={state.reflectionShareBps}
              onChange={handleReflectionShare}
            />
          </SimpleGrid>

          {!sharesValid && (
            <Alert
              status="warning"
              bg="rgba(255, 152, 0, 0.1)"
              border="1px solid"
              borderColor="rgba(255, 152, 0, 0.3)"
              borderRadius="md"
              mt={4}
              fontSize="sm"
            >
              <AlertIcon />
              <Text fontSize="xs">
                Shares sum to {sharesSum} but must equal {BPS_DENOMINATOR}. Difference:{" "}
                {BPS_DENOMINATOR - sharesSum > 0 ? "+" : ""}
                {BPS_DENOMINATOR - sharesSum}
              </Text>
            </Alert>
          )}
        </Box>
      )}

      {!hasTax && (
        <Box
          bg="var(--bg-elevated)"
          border="1px solid"
          borderColor="var(--border)"
          borderRadius="lg"
          p={4}
        >
          <Text fontSize="sm" color="var(--text-secondary)">
            No tax configured. Set buy or sell tax above to configure distribution
            shares.
          </Text>
        </Box>
      )}
    </VStack>
  );
}
