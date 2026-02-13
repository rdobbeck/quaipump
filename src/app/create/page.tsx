"use client";

import { Container, Heading, Text } from "@chakra-ui/react";
import { CreateWizard } from "@/components/create/CreateWizard";

export default function CreatePage() {
  return (
    <Container maxW="container.md" py={8}>
      <Heading size="lg" mb={2}>
        Create Token
      </Heading>
      <Text color="var(--text-secondary)" mb={6}>
        Configure and deploy a new token with full tokenomics
      </Text>
      <CreateWizard />
    </Container>
  );
}
