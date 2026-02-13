"use client";

import { useCallback, useRef, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Divider,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { useTokenomicsToken, type TokenInfo } from "@/hooks/useTokenomicsToken";
import { useAppState } from "@/app/store";
import { formatBps } from "@/lib/utils";

interface OwnerPanelProps {
  tokenAddress: string;
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

export function OwnerPanel({ tokenAddress, tokenInfo }: OwnerPanelProps) {
  const { account } = useAppState();
  const { reduceTax, removeLimits, mint, renounceOwnership } =
    useTokenomicsToken();
  const toast = useToast();

  // --- Reduce Tax ---
  const [newBuyBps, setNewBuyBps] = useState<number>(
    tokenInfo.taxConfig.buyTaxBps
  );
  const [newSellBps, setNewSellBps] = useState<number>(
    tokenInfo.taxConfig.sellTaxBps
  );
  const [taxLoading, setTaxLoading] = useState(false);

  const handleReduceTax = useCallback(async () => {
    if (newBuyBps > tokenInfo.taxConfig.buyTaxBps) {
      toast({
        title: "Invalid buy tax",
        description: `New buy tax must be <= current (${formatBps(tokenInfo.taxConfig.buyTaxBps)})`,
        status: "error",
        duration: 4000,
      });
      return;
    }
    if (newSellBps > tokenInfo.taxConfig.sellTaxBps) {
      toast({
        title: "Invalid sell tax",
        description: `New sell tax must be <= current (${formatBps(tokenInfo.taxConfig.sellTaxBps)})`,
        status: "error",
        duration: 4000,
      });
      return;
    }
    setTaxLoading(true);
    try {
      await reduceTax(tokenAddress, newBuyBps, newSellBps);
      toast({
        title: "Tax reduced",
        description: `Buy: ${formatBps(newBuyBps)}, Sell: ${formatBps(newSellBps)}`,
        status: "success",
        duration: 4000,
      });
    } catch (err) {
      toast({
        title: "Failed to reduce tax",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 4000,
      });
    } finally {
      setTaxLoading(false);
    }
  }, [
    newBuyBps,
    newSellBps,
    tokenAddress,
    tokenInfo.taxConfig.buyTaxBps,
    tokenInfo.taxConfig.sellTaxBps,
    reduceTax,
    toast,
  ]);

  // --- Mint ---
  const [mintAmount, setMintAmount] = useState("");
  const [mintRecipient, setMintRecipient] = useState("");
  const [mintLoading, setMintLoading] = useState(false);

  const handleMint = useCallback(async () => {
    if (!mintAmount || !mintRecipient) {
      toast({
        title: "Missing fields",
        description: "Enter both amount and recipient",
        status: "error",
        duration: 4000,
      });
      return;
    }
    setMintLoading(true);
    try {
      await mint(tokenAddress, mintRecipient, mintAmount);
      toast({
        title: "Tokens minted",
        description: `${mintAmount} tokens minted to ${mintRecipient}`,
        status: "success",
        duration: 4000,
      });
      setMintAmount("");
      setMintRecipient("");
    } catch (err) {
      toast({
        title: "Mint failed",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 4000,
      });
    } finally {
      setMintLoading(false);
    }
  }, [mintAmount, mintRecipient, tokenAddress, mint, toast]);

  // --- Remove Limits ---
  const [removeLimitsLoading, setRemoveLimitsLoading] = useState(false);

  const handleRemoveLimits = useCallback(async () => {
    setRemoveLimitsLoading(true);
    try {
      await removeLimits(tokenAddress);
      toast({
        title: "Limits removed",
        description: "Max wallet and max transaction limits have been removed",
        status: "success",
        duration: 4000,
      });
    } catch (err) {
      toast({
        title: "Failed to remove limits",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 4000,
      });
    } finally {
      setRemoveLimitsLoading(false);
    }
  }, [tokenAddress, removeLimits, toast]);

  // --- Renounce Ownership ---
  const {
    isOpen: renounceOpen,
    onOpen: onRenounceOpen,
    onClose: onRenounceClose,
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [renounceLoading, setRenounceLoading] = useState(false);

  const handleRenounce = useCallback(async () => {
    setRenounceLoading(true);
    try {
      await renounceOwnership(tokenAddress);
      toast({
        title: "Ownership renounced",
        description:
          "You have permanently given up ownership of this token",
        status: "success",
        duration: 5000,
      });
      onRenounceClose();
    } catch (err) {
      toast({
        title: "Failed to renounce",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 4000,
      });
    } finally {
      setRenounceLoading(false);
    }
  }, [tokenAddress, renounceOwnership, toast, onRenounceClose]);

  // Do not render if wallet is not the owner
  if (!account || account.toLowerCase() !== tokenInfo.owner.toLowerCase()) {
    return null;
  }

  return (
    <>
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--accent)"
        borderRadius="xl"
        p={5}
      >
        <Text fontSize="md" fontWeight="600" mb={4}>
          Owner Controls
        </Text>

        {/* ---- Reduce Tax ---- */}
        <SectionHeading>Reduce Tax</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={3} align="stretch" mb={6}>
          <HStack spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm" color="var(--text-secondary)">
                Buy Tax (BPS)
              </FormLabel>
              <NumberInput
                value={newBuyBps}
                onChange={(_, v) => {
                  if (!Number.isNaN(v)) setNewBuyBps(v);
                }}
                min={0}
                max={tokenInfo.taxConfig.buyTaxBps}
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
              <FormHelperText fontSize="xs" color="var(--text-tertiary)">
                Current: {formatBps(tokenInfo.taxConfig.buyTaxBps)}
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="var(--text-secondary)">
                Sell Tax (BPS)
              </FormLabel>
              <NumberInput
                value={newSellBps}
                onChange={(_, v) => {
                  if (!Number.isNaN(v)) setNewSellBps(v);
                }}
                min={0}
                max={tokenInfo.taxConfig.sellTaxBps}
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
              <FormHelperText fontSize="xs" color="var(--text-tertiary)">
                Current: {formatBps(tokenInfo.taxConfig.sellTaxBps)}
              </FormHelperText>
            </FormControl>
          </HStack>

          <Button
            variant="accent"
            size="sm"
            onClick={handleReduceTax}
            isLoading={taxLoading}
            isDisabled={
              newBuyBps === tokenInfo.taxConfig.buyTaxBps &&
              newSellBps === tokenInfo.taxConfig.sellTaxBps
            }
          >
            Reduce Tax
          </Button>
        </VStack>

        {/* ---- Mint (only if Mintable) ---- */}
        {tokenInfo.supplyType === 1 && (
          <>
            <SectionHeading>Mint Tokens</SectionHeading>
            <Divider borderColor="var(--border)" my={3} />
            <VStack spacing={3} align="stretch" mb={6}>
              <FormControl>
                <FormLabel fontSize="sm" color="var(--text-secondary)">
                  Recipient
                </FormLabel>
                <Input
                  placeholder="0x..."
                  value={mintRecipient}
                  onChange={(e) => setMintRecipient(e.target.value)}
                  fontFamily="mono"
                  fontSize="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" color="var(--text-secondary)">
                  Amount
                </FormLabel>
                <Input
                  placeholder="1000"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  fontFamily="mono"
                  fontSize="sm"
                />
                <FormHelperText fontSize="xs" color="var(--text-tertiary)">
                  Token amount (human-readable, not in wei)
                </FormHelperText>
              </FormControl>

              <Button
                variant="accent"
                size="sm"
                onClick={handleMint}
                isLoading={mintLoading}
                isDisabled={!mintAmount || !mintRecipient}
              >
                Mint
              </Button>
            </VStack>
          </>
        )}

        {/* ---- Remove Limits ---- */}
        <SectionHeading>Limits</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={3} align="stretch" mb={6}>
          <Text fontSize="sm" color="var(--text-secondary)">
            Remove max wallet and max transaction limits permanently.
          </Text>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveLimits}
            isLoading={removeLimitsLoading}
          >
            Remove Limits
          </Button>
        </VStack>

        {/* ---- Renounce Ownership ---- */}
        <SectionHeading>Ownership</SectionHeading>
        <Divider borderColor="var(--border)" my={3} />
        <VStack spacing={3} align="stretch">
          <Text fontSize="sm" color="var(--text-secondary)">
            Permanently renounce ownership. This action cannot be undone.
          </Text>
          <Button
            variant="sell"
            size="sm"
            onClick={onRenounceOpen}
          >
            Renounce Ownership
          </Button>
        </VStack>
      </Box>

      {/* Renounce Confirmation Dialog */}
      <AlertDialog
        isOpen={renounceOpen}
        leastDestructiveRef={cancelRef}
        onClose={onRenounceClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
          >
            <AlertDialogHeader fontSize="lg" fontWeight="600">
              Renounce Ownership
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text fontSize="sm" color="var(--text-secondary)">
                Are you sure? This will permanently transfer ownership to the
                zero address. You will lose all owner privileges including the
                ability to reduce taxes, mint tokens, and remove limits. This
                action is irreversible.
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                variant="ghost"
                onClick={onRenounceClose}
                mr={3}
              >
                Cancel
              </Button>
              <Button
                variant="sell"
                onClick={handleRenounce}
                isLoading={renounceLoading}
              >
                Renounce
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
