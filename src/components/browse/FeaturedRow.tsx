"use client";

import { Box, HStack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface FeaturedRowProps {
  title: string;
  titleColor: string;
  children: ReactNode;
}

export function FeaturedRow({ title, titleColor, children }: FeaturedRowProps) {
  return (
    <Box mb={6}>
      <HStack spacing={2} mb={3}>
        <Box w="8px" h="8px" rounded="full" bg={titleColor} />
        <Text fontSize="sm" fontWeight="600" color="var(--text-primary)">
          {title}
        </Text>
      </HStack>
      <Box
        className="featured-scroll"
        display="flex"
        gap={4}
        overflowX="auto"
        pb={2}
      >
        {children}
      </Box>
    </Box>
  );
}
