"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Text,
  VStack,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/app/store";
import {
  useTokenomicsFactory,
  type CreateTokenParams,
} from "@/hooks/useTokenomicsFactory";
import { DEX_ROUTER_ADDRESS } from "@/lib/constants";
import { TokenConfigStep } from "./TokenConfigStep";
import { TaxConfigStep } from "./TaxConfigStep";
import { LimitConfigStep } from "./LimitConfigStep";
import { AllocationStep } from "./AllocationStep";
import { VestingStep } from "./VestingStep";
import { ReviewStep } from "./ReviewStep";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WizardState {
  // Step 1: Token Config
  name: string;
  symbol: string;
  decimals: number;
  supplyType: number; // 0=Fixed, 1=Mintable
  initialSupply: string;
  hardCap: string;
  burnOnTransfer: boolean;
  burnOnTransferBps: number;
  // Step 2: Tax Config
  buyTaxBps: number;
  sellTaxBps: number;
  treasuryShareBps: number;
  autoLpShareBps: number;
  burnShareBps: number;
  reflectionShareBps: number;
  // Step 3: Limits
  maxWalletAmount: string;
  maxTxAmount: string;
  // Step 4: Allocations
  allocations: { recipient: string; bps: number; vested: boolean }[];
  // Step 5: Vesting
  vestingSchedules: {
    beneficiary: string;
    cliffDays: number;
    durationDays: number;
  }[];
  // Step 6: Review & Deploy
  dexRouter: string;
  lpLockDuration: number; // in days
  treasuryWallet: string;
}

const INITIAL_STATE: WizardState = {
  name: "",
  symbol: "",
  decimals: 18,
  supplyType: 0,
  initialSupply: "",
  hardCap: "",
  burnOnTransfer: false,
  burnOnTransferBps: 0,
  buyTaxBps: 0,
  sellTaxBps: 0,
  treasuryShareBps: 10000,
  autoLpShareBps: 0,
  burnShareBps: 0,
  reflectionShareBps: 0,
  maxWalletAmount: "",
  maxTxAmount: "",
  allocations: [],
  vestingSchedules: [],
  dexRouter: DEX_ROUTER_ADDRESS,
  lpLockDuration: 180,
  treasuryWallet: "",
};

/* ------------------------------------------------------------------ */
/*  Step metadata                                                      */
/* ------------------------------------------------------------------ */

interface StepMeta {
  label: string;
  shortLabel: string;
}

const STEPS: StepMeta[] = [
  { label: "Token Config", shortLabel: "Token" },
  { label: "Tax Config", shortLabel: "Tax" },
  { label: "Limits", shortLabel: "Limits" },
  { label: "Allocations", shortLabel: "Alloc" },
  { label: "Vesting", shortLabel: "Vest" },
  { label: "Review & Deploy", shortLabel: "Deploy" },
];

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: StepMeta[];
  currentStep: number;
}) {
  return (
    <HStack spacing={0} w="100%" justify="center" mb={6}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;

        return (
          <Flex key={idx} align="center">
            {/* Connector line (before circle, skip for first) */}
            {idx > 0 && (
              <Box
                h="2px"
                w={{ base: "16px", md: "40px" }}
                bg={
                  isCompleted || isActive
                    ? "var(--accent)"
                    : "var(--border)"
                }
              />
            )}

            <VStack spacing={1}>
              {/* Numbered circle */}
              <Flex
                w="32px"
                h="32px"
                borderRadius="full"
                align="center"
                justify="center"
                fontSize="xs"
                fontWeight="600"
                flexShrink={0}
                bg={
                  isActive
                    ? "var(--accent)"
                    : isCompleted
                    ? "var(--accent)"
                    : "var(--bg-elevated)"
                }
                color={
                  isActive || isCompleted
                    ? "var(--bg-primary)"
                    : "var(--text-secondary)"
                }
                border="2px solid"
                borderColor={
                  isActive
                    ? "var(--accent)"
                    : isCompleted
                    ? "var(--accent)"
                    : "var(--border)"
                }
              >
                {isCompleted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </Flex>

              {/* Label (hidden on small screens) */}
              <Text
                fontSize="xx-small"
                color={
                  isActive
                    ? "var(--accent)"
                    : isCompleted
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)"
                }
                textAlign="center"
                display={{ base: "none", md: "block" }}
                whiteSpace="nowrap"
              >
                {step.label}
              </Text>
              <Text
                fontSize="xx-small"
                color={
                  isActive
                    ? "var(--accent)"
                    : isCompleted
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)"
                }
                textAlign="center"
                display={{ base: "block", md: "none" }}
                whiteSpace="nowrap"
              >
                {step.shortLabel}
              </Text>
            </VStack>
          </Flex>
        );
      })}
    </HStack>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Wizard Component                                              */
/* ------------------------------------------------------------------ */

export function CreateWizard() {
  const router = useRouter();
  const toast = useToast();
  const { account } = useAppState();
  const { createToken, isDeploying } = useTokenomicsFactory();

  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [currentStep, setCurrentStep] = useState(0);

  /* Determine the effective step list -- skip vesting if no vested allocs */
  const hasVestedAllocations = state.allocations.some((a) => a.vested);

  /** Map visual step index to logical step number (0-5) */
  function getLogicalStep(visibleStep: number): number {
    if (hasVestedAllocations) return visibleStep;
    // When vesting is skipped, visual steps 0-3 map to logical 0-3,
    // and visual step 4 maps to logical 5 (Review)
    if (visibleStep <= 3) return visibleStep;
    return visibleStep + 1; // skip logical step 4 (vesting)
  }

  const visibleSteps = hasVestedAllocations
    ? STEPS
    : STEPS.filter((_, i) => i !== 4);

  const totalVisibleSteps = visibleSteps.length;
  const logicalStep = getLogicalStep(currentStep);
  const isLastStep = currentStep === totalVisibleSteps - 1;

  /* ---- State updater ---- */
  const updateState = useCallback(
    (patch: Partial<WizardState>) => {
      setState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  /* ---- Navigation ---- */
  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep((s) => Math.min(s + 1, totalVisibleSteps - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  /* ---- Deploy ---- */
  const handleDeploy = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet before deploying.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const quais = await import("quais");

      const initialSupplyParsed = quais.parseUnits(
        state.initialSupply || "0",
        state.decimals
      );
      const hardCapParsed =
        state.supplyType === 1 && state.hardCap
          ? quais.parseUnits(state.hardCap, state.decimals)
          : BigInt(0);
      const maxWalletParsed = state.maxWalletAmount
        ? quais.parseUnits(state.maxWalletAmount, state.decimals)
        : BigInt(0);
      const maxTxParsed = state.maxTxAmount
        ? quais.parseUnits(state.maxTxAmount, state.decimals)
        : BigInt(0);

      /* Build vesting schedules with totalAmount derived from allocation bps */
      const vestingSchedules = state.vestingSchedules.map((vs) => {
        const matchedAlloc = state.allocations.find(
          (a) =>
            a.vested &&
            a.recipient.toLowerCase() === vs.beneficiary.toLowerCase()
        );
        const bps = matchedAlloc ? matchedAlloc.bps : 0;
        const totalAmount =
          (initialSupplyParsed * BigInt(bps)) / BigInt(10000);

        return {
          beneficiary: vs.beneficiary,
          totalAmount,
          cliffDuration: BigInt(vs.cliffDays * 86400),
          vestingDuration: BigInt(vs.durationDays * 86400),
          startTime: BigInt(0), // use block.timestamp
        };
      });

      const params: CreateTokenParams = {
        tokenConfig: {
          name: state.name,
          symbol: state.symbol,
          decimals: state.decimals,
          supplyType: state.supplyType,
          initialSupply: initialSupplyParsed,
          hardCap: hardCapParsed,
          burnOnTransfer: state.burnOnTransfer,
          burnOnTransferBps: state.burnOnTransferBps,
        },
        taxConfig: {
          buyTaxBps: state.buyTaxBps,
          sellTaxBps: state.sellTaxBps,
          treasuryShareBps: state.treasuryShareBps,
          autoLpShareBps: state.autoLpShareBps,
          burnShareBps: state.burnShareBps,
          reflectionShareBps: state.reflectionShareBps,
        },
        limitConfig: {
          maxWalletAmount: maxWalletParsed,
          maxTxAmount: maxTxParsed,
        },
        allocations: state.allocations.map((a) => ({
          recipient: a.recipient,
          bps: a.bps,
          vested: a.vested,
        })),
        vestingSchedules,
        dexRouter: state.dexRouter,
        lpLockDuration: BigInt(state.lpLockDuration * 86400),
        owner: account,
        treasuryWallet: state.treasuryWallet || account,
      };

      const salt = quais.hexlify(quais.randomBytes(32));

      const result = await createToken(params, salt);

      toast({
        title: "Token Deployed",
        description: `Token created at ${result.tokenAddress}`,
        status: "success",
        duration: 8000,
        isClosable: true,
      });

      if (result.tokenAddress) {
        router.push(`/token/${result.tokenAddress}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Deployment failed. Please try again.";
      toast({
        title: "Deployment Failed",
        description: message,
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    }
  };

  /* ---- Render current step ---- */
  function renderStep() {
    const stepProps = { state, updateState };

    switch (logicalStep) {
      case 0:
        return <TokenConfigStep {...stepProps} />;
      case 1:
        return <TaxConfigStep {...stepProps} />;
      case 2:
        return <LimitConfigStep {...stepProps} />;
      case 3:
        return <AllocationStep {...stepProps} />;
      case 4:
        return <VestingStep {...stepProps} />;
      case 5:
        return <ReviewStep {...stepProps} />;
      default:
        return null;
    }
  }

  /* ---- Render ---- */
  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      borderRadius="xl"
      p={{ base: 4, md: 6 }}
    >
      {/* Step indicator */}
      <StepIndicator steps={visibleSteps} currentStep={currentStep} />

      {/* Step content */}
      <Box minH="320px">{renderStep()}</Box>

      {/* Navigation buttons */}
      <Flex
        mt={6}
        pt={4}
        borderTop="1px solid"
        borderColor="var(--border)"
        justify="space-between"
        align="center"
        gap={3}
      >
        <Button
          variant="outline"
          onClick={handlePrevious}
          isDisabled={currentStep === 0 || isDeploying}
          size="md"
          minW="100px"
        >
          Previous
        </Button>

        {isLastStep ? (
          <Button
            variant="accent"
            onClick={handleDeploy}
            isDisabled={isDeploying || !account}
            isLoading={isDeploying}
            loadingText="Deploying"
            spinner={<Spinner size="sm" />}
            size="md"
            minW="140px"
          >
            Deploy Token
          </Button>
        ) : (
          <Button
            variant="accent"
            onClick={handleNext}
            size="md"
            minW="100px"
          >
            Next
          </Button>
        )}
      </Flex>
    </Box>
  );
}
