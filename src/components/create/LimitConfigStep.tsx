"use client";

import { useCallback, useMemo } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  VStack,
  HStack,
  Text,
  Button,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";

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

const PERCENTAGE_PRESETS = [1, 2, 5] as const;

export function LimitConfigStep({ state, updateState }: StepProps) {
  const supply = useMemo(
    () => parseFloat(state.initialSupply) || 0,
    [state.initialSupply]
  );

  const handleMaxWalletChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ maxWalletAmount: e.target.value });
    },
    [updateState]
  );

  const handleMaxTxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ maxTxAmount: e.target.value });
    },
    [updateState]
  );

  const setWalletPercent = useCallback(
    (pct: number) => {
      if (supply > 0) {
        const amount = Math.floor(supply * (pct / 100));
        updateState({ maxWalletAmount: amount.toString() });
      }
    },
    [supply, updateState]
  );

  const setTxPercent = useCallback(
    (pct: number) => {
      if (supply > 0) {
        const amount = Math.floor(supply * (pct / 100));
        updateState({ maxTxAmount: amount.toString() });
      }
    },
    [supply, updateState]
  );

  return (
    <VStack spacing={6} align="stretch">
      <Box
        bg="var(--bg-elevated)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="lg"
        p={4}
      >
        <Text fontSize="sm" color="var(--text-secondary)">
          Wallet and transaction limits help prevent large holders from
          manipulating the token price. Set to 0 to disable a limit.
        </Text>
      </Box>

      <FormControl>
        <FormLabel color="var(--text-secondary)" fontSize="sm">
          Max Wallet Amount
        </FormLabel>
        <Input
          type="number"
          placeholder="0"
          value={state.maxWalletAmount}
          onChange={handleMaxWalletChange}
          min={0}
        />
        <FormHelperText color="var(--text-tertiary)" fontSize="xs">
          Maximum tokens a single wallet can hold. Set to 0 to disable limit.
        </FormHelperText>
        {supply > 0 && (
          <Wrap mt={2} spacing={2}>
            {PERCENTAGE_PRESETS.map((pct) => (
              <WrapItem key={`wallet-${pct}`}>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setWalletPercent(pct)}
                >
                  {pct}% of supply
                </Button>
              </WrapItem>
            ))}
            <WrapItem>
              <Button
                size="xs"
                variant="outline"
                onClick={() => updateState({ maxWalletAmount: "0" })}
              >
                No limit
              </Button>
            </WrapItem>
          </Wrap>
        )}
        {state.maxWalletAmount !== "" &&
          state.maxWalletAmount !== "0" &&
          supply > 0 && (
            <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
              {((parseFloat(state.maxWalletAmount) / supply) * 100).toFixed(2)}%
              of initial supply
            </Text>
          )}
      </FormControl>

      <FormControl>
        <FormLabel color="var(--text-secondary)" fontSize="sm">
          Max Transaction Amount
        </FormLabel>
        <Input
          type="number"
          placeholder="0"
          value={state.maxTxAmount}
          onChange={handleMaxTxChange}
          min={0}
        />
        <FormHelperText color="var(--text-tertiary)" fontSize="xs">
          Maximum tokens per single transaction. Set to 0 to disable limit.
        </FormHelperText>
        {supply > 0 && (
          <Wrap mt={2} spacing={2}>
            {PERCENTAGE_PRESETS.map((pct) => (
              <WrapItem key={`tx-${pct}`}>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setTxPercent(pct)}
                >
                  {pct}% of supply
                </Button>
              </WrapItem>
            ))}
            <WrapItem>
              <Button
                size="xs"
                variant="outline"
                onClick={() => updateState({ maxTxAmount: "0" })}
              >
                No limit
              </Button>
            </WrapItem>
          </Wrap>
        )}
        {state.maxTxAmount !== "" &&
          state.maxTxAmount !== "0" &&
          supply > 0 && (
            <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
              {((parseFloat(state.maxTxAmount) / supply) * 100).toFixed(2)}% of
              initial supply
            </Text>
          )}
      </FormControl>

      {supply === 0 && (
        <HStack
          bg="rgba(255, 152, 0, 0.1)"
          border="1px solid"
          borderColor="rgba(255, 152, 0, 0.3)"
          borderRadius="md"
          p={3}
        >
          <Text fontSize="xs" color="orange.300">
            Set an initial supply in the Token Config step to use percentage
            preset buttons.
          </Text>
        </HStack>
      )}
    </VStack>
  );
}
