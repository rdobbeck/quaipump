"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  useToast,
} from "@chakra-ui/react";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";

interface PriceAlertButtonProps {
  curveAddress: string;
  tokenSymbol: string;
  currentPriceUsd: number;
}

export function PriceAlertButton({
  curveAddress,
  tokenSymbol,
  currentPriceUsd,
}: PriceAlertButtonProps) {
  const toast = useToast();
  const { activeAlerts, addAlert, removeAlert } = usePriceAlerts();
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [priceInput, setPriceInput] = useState("");

  const tokenAlerts = activeAlerts.filter(
    (a) => a.curveAddress.toLowerCase() === curveAddress.toLowerCase()
  );

  const handleAdd = () => {
    const price = parseFloat(priceInput);
    if (!price || price <= 0) return;
    addAlert(curveAddress, tokenSymbol, condition, price);
    setPriceInput("");
    toast({
      title: "Alert set",
      description: `${tokenSymbol} ${condition} $${price.toExponential(2)}`,
      status: "success",
      duration: 3000,
      position: "bottom-right",
    });
  };

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Box
          as="button"
          fontSize="10px"
          color="var(--text-secondary)"
          bg="var(--bg-elevated)"
          px={2}
          py={1}
          rounded="md"
          cursor="pointer"
          _hover={{ color: "var(--accent)" }}
          position="relative"
        >
          Alert
          {tokenAlerts.length > 0 && (
            <Box
              position="absolute"
              top="-2px"
              right="-2px"
              w="12px"
              h="12px"
              rounded="full"
              bg="var(--accent)"
              fontSize="8px"
              fontWeight="700"
              color="#0b0b0f"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {tokenAlerts.length}
            </Box>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        rounded="xl"
        w="260px"
        _focus={{ boxShadow: "none" }}
      >
        <PopoverBody p={3}>
          <Text fontSize="xs" fontWeight="600" color="var(--accent)" mb={2}>
            Price Alerts
          </Text>

          <Text fontSize="10px" color="var(--text-tertiary)" mb={2}>
            Current: ${currentPriceUsd > 0 ? currentPriceUsd.toExponential(2) : "0.00"}
          </Text>

          {/* Add alert */}
          <VStack spacing={2} mb={3}>
            <HStack spacing={1} w="100%">
              <Button
                size="xs"
                flex={1}
                rounded="md"
                bg={condition === "above" ? "var(--accent)" : "var(--bg-elevated)"}
                color={condition === "above" ? "#0b0b0f" : "var(--text-tertiary)"}
                onClick={() => setCondition("above")}
                fontSize="10px"
              >
                Above
              </Button>
              <Button
                size="xs"
                flex={1}
                rounded="md"
                bg={condition === "below" ? "var(--sell)" : "var(--bg-elevated)"}
                color={condition === "below" ? "white" : "var(--text-tertiary)"}
                onClick={() => setCondition("below")}
                fontSize="10px"
              >
                Below
              </Button>
            </HStack>
            <Flex gap={2} w="100%">
              <Input
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="Price USD"
                type="number"
                size="xs"
                bg="var(--bg-elevated)"
                border="1px solid"
                borderColor="var(--border)"
                color="var(--text-primary)"
                fontFamily="mono"
                rounded="md"
                _placeholder={{ color: "var(--text-tertiary)" }}
                _focus={{ borderColor: "var(--accent)", boxShadow: "none" }}
              />
              <Button
                size="xs"
                px={3}
                bg="var(--accent)"
                color="#0b0b0f"
                fontWeight="600"
                rounded="md"
                _hover={{ bg: "var(--accent-hover)" }}
                onClick={handleAdd}
                isDisabled={!priceInput || parseFloat(priceInput) <= 0}
              >
                Set
              </Button>
            </Flex>
          </VStack>

          {/* Active alerts */}
          {tokenAlerts.length > 0 && (
            <VStack spacing={1} align="stretch">
              <Text fontSize="10px" color="var(--text-tertiary)" textTransform="uppercase">
                Active
              </Text>
              {tokenAlerts.map((a) => (
                <Flex
                  key={a.id}
                  justify="space-between"
                  align="center"
                  bg="var(--bg-elevated)"
                  rounded="md"
                  px={2}
                  py={1.5}
                >
                  <Text fontSize="10px" color="var(--text-secondary)">
                    {a.condition === "above" ? ">" : "<"} ${a.priceUsd.toExponential(2)}
                  </Text>
                  <Box
                    as="button"
                    fontSize="10px"
                    color="var(--text-tertiary)"
                    _hover={{ color: "var(--sell)" }}
                    onClick={() => removeAlert(a.id)}
                  >
                    Remove
                  </Box>
                </Flex>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
