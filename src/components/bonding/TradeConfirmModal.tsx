"use client";

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  Flex,
  Text,
  Button,
  VStack,
} from "@chakra-ui/react";
import { QUAI_USD_PRICE } from "@/lib/constants";

interface TradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: "buy" | "sell";
  amount: string;
  quote: string;
  tokenSymbol: string;
  slippage: number;
  graduated: boolean;
  isLoading: boolean;
}

export function TradeConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
  amount,
  quote,
  tokenSymbol,
  slippage,
  graduated,
  isLoading,
}: TradeConfirmModalProps) {
  const amtNum = parseFloat(amount) || 0;
  const quoteNum = parseFloat(quote) || 0;

  const inputLabel = mode === "buy" ? "QUAI" : tokenSymbol;
  const outputLabel = mode === "buy" ? tokenSymbol : "QUAI";
  const inputUsd = mode === "buy" ? amtNum * QUAI_USD_PRICE : 0;
  const outputUsd = mode === "sell" ? quoteNum * QUAI_USD_PRICE : 0;

  // Price impact estimate
  const pricePerToken =
    mode === "buy" && quoteNum > 0
      ? amtNum / quoteNum
      : mode === "sell" && amtNum > 0
      ? quoteNum / amtNum
      : 0;

  const minReceived =
    quoteNum > 0 ? quoteNum * (1 - slippage / 100) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
      <ModalOverlay bg="rgba(0,0,0,0.6)" backdropFilter="blur(4px)" />
      <ModalContent
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        rounded="xl"
        mx={4}
      >
        <ModalHeader
          fontSize="md"
          fontWeight="700"
          color="var(--text-primary)"
          pb={2}
        >
          Confirm {mode === "buy" ? "Buy" : "Sell"}
        </ModalHeader>
        <ModalCloseButton color="var(--text-tertiary)" />

        <ModalBody pb={4}>
          <VStack spacing={3} align="stretch">
            {/* You pay */}
            <Box
              bg="var(--bg-elevated)"
              rounded="lg"
              p={3}
              border="1px solid"
              borderColor="var(--border)"
            >
              <Text fontSize="10px" color="var(--text-tertiary)" textTransform="uppercase" mb={1}>
                You pay
              </Text>
              <Flex justify="space-between" align="baseline">
                <Text fontSize="lg" fontWeight="700" fontFamily="mono" color="var(--text-primary)">
                  {amtNum.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </Text>
                <Text fontSize="sm" fontWeight="600" color="var(--text-secondary)">
                  {inputLabel}
                </Text>
              </Flex>
              {inputUsd > 0 && (
                <Text fontSize="10px" color="var(--text-tertiary)" mt={0.5}>
                  ~${inputUsd.toFixed(4)}
                </Text>
              )}
            </Box>

            {/* Arrow */}
            <Flex justify="center">
              <Box
                w="28px"
                h="28px"
                rounded="full"
                bg="var(--bg-elevated)"
                border="1px solid"
                borderColor="var(--border)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                </svg>
              </Box>
            </Flex>

            {/* You receive */}
            <Box
              bg="var(--bg-elevated)"
              rounded="lg"
              p={3}
              border="1px solid"
              borderColor={mode === "buy" ? "var(--accent)" : "var(--sell)"}
            >
              <Text fontSize="10px" color="var(--text-tertiary)" textTransform="uppercase" mb={1}>
                You receive
              </Text>
              <Flex justify="space-between" align="baseline">
                <Text
                  fontSize="lg"
                  fontWeight="700"
                  fontFamily="mono"
                  color={mode === "buy" ? "var(--accent)" : "var(--sell)"}
                >
                  {quoteNum.toLocaleString(undefined, { maximumFractionDigits: mode === "buy" ? 2 : 6 })}
                </Text>
                <Text fontSize="sm" fontWeight="600" color="var(--text-secondary)">
                  {outputLabel}
                </Text>
              </Flex>
              {outputUsd > 0 && (
                <Text fontSize="10px" color="var(--text-tertiary)" mt={0.5}>
                  ~${outputUsd.toFixed(4)}
                </Text>
              )}
            </Box>

            {/* Trade details */}
            <Box fontSize="11px">
              <Flex justify="space-between" py={1.5} borderBottom="1px solid" borderColor="var(--border)">
                <Text color="var(--text-tertiary)">Price per token</Text>
                <Text fontFamily="mono" color="var(--text-secondary)">
                  {pricePerToken > 0 ? `${pricePerToken.toFixed(8)} QUAI` : "—"}
                </Text>
              </Flex>
              <Flex justify="space-between" py={1.5} borderBottom="1px solid" borderColor="var(--border)">
                <Text color="var(--text-tertiary)">Slippage tolerance</Text>
                <Text fontFamily="mono" color="var(--text-secondary)">{slippage}%</Text>
              </Flex>
              <Flex justify="space-between" py={1.5} borderBottom="1px solid" borderColor="var(--border)">
                <Text color="var(--text-tertiary)">Min received</Text>
                <Text fontFamily="mono" color="var(--text-secondary)">
                  {minReceived > 0
                    ? `${minReceived.toLocaleString(undefined, { maximumFractionDigits: mode === "buy" ? 2 : 6 })} ${outputLabel}`
                    : "—"}
                </Text>
              </Flex>
              <Flex justify="space-between" py={1.5}>
                <Text color="var(--text-tertiary)">Venue</Text>
                <Text fontFamily="mono" color="var(--text-secondary)">
                  {graduated ? "Graduated Pool" : "Bonding Curve"}
                </Text>
              </Flex>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter pt={0} pb={4} px={6}>
          <Button
            w="100%"
            bg={mode === "buy" ? "var(--accent)" : "var(--sell)"}
            color={mode === "buy" ? "#0b0b0f" : "white"}
            fontWeight="700"
            fontSize="md"
            py={5}
            _hover={{
              bg: mode === "buy" ? "var(--accent-hover)" : "#e04848",
              boxShadow: mode === "buy"
                ? "0 0 20px var(--accent-glow)"
                : "0 0 20px rgba(255,82,82,0.15)",
            }}
            isLoading={isLoading}
            loadingText={mode === "buy" ? "Buying..." : "Selling..."}
            onClick={onConfirm}
          >
            Confirm {mode === "buy" ? "Buy" : "Sell"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
