"use client";

import { Box, Container, Text, HStack, Link } from "@chakra-ui/react";
import { NETWORK } from "@/lib/constants";

export function Footer() {
  return (
    <Box py={4} borderTop="1px solid" borderColor="var(--border)">
      <Container maxW="container.xl">
        <HStack justify="center" spacing={4} flexWrap="wrap">
          <Link
            href={NETWORK.explorerUrl}
            isExternal
            fontSize="xs"
            color="var(--text-tertiary)"
            _hover={{ color: "var(--text-secondary)" }}
          >
            Quaiscan
          </Link>
          <Text fontSize="xs" color="var(--text-tertiary)">
            {NETWORK.name}
          </Text>
        </HStack>
      </Container>
    </Box>
  );
}
