"use client";

import { useEffect, useState } from "react";
import { Box, Text, HStack, Badge, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import { useTokenomicsToken } from "@/hooks/useTokenomicsToken";
import { shortenAddress, formatTimestamp, getExplorerAddressUrl } from "@/lib/utils";

interface Deployment {
  token: string;
  vestingVault: string;
  liquidityLocker: string;
  owner: string;
  createdAt: number;
}

export function TokenCard({
  deployment,
  index,
}: {
  deployment: Deployment;
  index: number;
}) {
  const { getTokenInfo } = useTokenomicsToken();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supplyType, setSupplyType] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await getTokenInfo(deployment.token);
        if (!cancelled) {
          setName(info.name);
          setSymbol(info.symbol);
          setSupplyType(info.supplyType);
        }
      } catch {
        // token info may fail for some contracts
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deployment.token, getTokenInfo]);

  return (
    <Link
      as={NextLink}
      href={`/token/${deployment.token}`}
      _hover={{ textDecoration: "none" }}
    >
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="xl"
        p={5}
        className="card-hover"
        cursor="pointer"
      >
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="600" fontSize="md" noOfLines={1}>
            {name || `Token #${index}`}
          </Text>
          <Badge
            bg="var(--bg-elevated)"
            color="var(--accent)"
            fontSize="xs"
            px={2}
            borderRadius="md"
          >
            {symbol || "..."}
          </Badge>
        </HStack>

        <Text fontSize="xs" color="var(--text-secondary)" fontFamily="mono" mb={2}>
          {shortenAddress(deployment.token)}
        </Text>

        <HStack justify="space-between" mt={2}>
          <Text fontSize="xs" color="var(--text-tertiary)">
            Owner: {shortenAddress(deployment.owner)}
          </Text>
          <Badge
            fontSize="xx-small"
            colorScheme={supplyType === 1 ? "green" : "gray"}
            variant="subtle"
          >
            {supplyType === 1 ? "Mintable" : "Fixed"}
          </Badge>
        </HStack>

        <Text fontSize="xs" color="var(--text-tertiary)" mt={1}>
          {deployment.createdAt > 0 ? formatTimestamp(deployment.createdAt) : ""}
        </Text>

        <Link
          href={getExplorerAddressUrl(deployment.token)}
          isExternal
          fontSize="xs"
          color="var(--accent)"
          mt={2}
          display="inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          View on Explorer
        </Link>
      </Box>
    </Link>
  );
}
