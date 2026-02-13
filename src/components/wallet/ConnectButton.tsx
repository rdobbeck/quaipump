"use client";

import { Button, useToast } from "@chakra-ui/react";
import { useGetAccounts } from "./useGetAccounts";
import { shortenAddress } from "@/lib/utils";

export function ConnectButton() {
  const { account, connectWallet, disconnectWallet } = useGetAccounts();
  const toast = useToast();

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      toast({
        title: "Connection Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not connect to Pelagus wallet.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (account) {
    return (
      <Button
        onClick={disconnectWallet}
        size="sm"
        bg="transparent"
        color="var(--accent)"
        border="1px solid"
        borderColor="var(--accent)"
        borderRadius="full"
        px={4}
        fontFamily="mono"
        fontSize="xs"
        _hover={{
          bg: "rgba(0,230,118,0.1)",
          boxShadow: "0 0 15px var(--accent-glow)",
        }}
      >
        {shortenAddress(account)}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      size="sm"
      variant="accent"
      borderRadius="full"
      px={5}
      fontSize="sm"
    >
      Connect Wallet
    </Button>
  );
}
