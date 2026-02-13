"use client";

import { useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Link,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  shortenAddress,
  getExplorerAddressUrl,
  supplyTypeLabel,
} from "@/lib/utils";

interface TokenHeaderProps {
  name: string;
  symbol: string;
  address: string;
  supplyType: number;
}

export function TokenHeader({
  name,
  symbol,
  address,
  supplyType,
}: TokenHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may not be available
    }
  };

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      borderRadius="xl"
      p={6}
    >
      <VStack align="start" spacing={3}>
        <HStack spacing={3} align="baseline" flexWrap="wrap">
          <Text fontSize="2xl" fontWeight="700">
            {name}
          </Text>
          <Badge
            bg="var(--bg-elevated)"
            color="var(--accent)"
            fontSize="sm"
            px={2.5}
            py={0.5}
            borderRadius="md"
          >
            {symbol}
          </Badge>
          <Badge
            fontSize="xs"
            colorScheme={supplyType === 1 ? "green" : "gray"}
            variant="subtle"
          >
            {supplyTypeLabel(supplyType)}
          </Badge>
        </HStack>

        <HStack spacing={2}>
          <Text
            fontSize="sm"
            color="var(--text-secondary)"
            fontFamily="mono"
          >
            {shortenAddress(address)}
          </Text>

          <Tooltip label={copied ? "Copied!" : "Copy address"} hasArrow>
            <IconButton
              aria-label="Copy token address"
              variant="ghost"
              size="xs"
              color="var(--text-secondary)"
              _hover={{ color: "var(--text-primary)", bg: "var(--bg-elevated)" }}
              onClick={handleCopy}
              icon={
                copied ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )
              }
            />
          </Tooltip>

          <Link
            href={getExplorerAddressUrl(address)}
            isExternal
            fontSize="sm"
            color="var(--accent)"
            _hover={{ textDecoration: "underline" }}
          >
            View on Explorer
          </Link>
        </HStack>
      </VStack>
    </Box>
  );
}
