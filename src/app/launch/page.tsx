"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Container,
  Flex,
  VStack,
  Text,
  Input,
  Textarea,
  Button,
  Link,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/app/store";
import { useBondingCurve } from "@/hooks/useBondingCurve";
import { getExplorerTxUrl } from "@/lib/utils";
import {
  TokenomicsToggle,
  DEFAULT_TOKENOMICS_DATA,
  type TokenomicsFormData,
} from "@/components/bonding/TokenomicsToggle";
import { BONDING_FACTORY_V2_ADDRESS } from "@/lib/constants";

const TOTAL_SUPPLY = 1_000_000_000;

export default function LaunchPage() {
  const router = useRouter();
  const { account } = useAppState();
  const { launchToken, launchTokenWithTokenomics, isLaunching } =
    useBondingCurve();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [tokenomics, setTokenomics] = useState<TokenomicsFormData>(
    DEFAULT_TOKENOMICS_DATA
  );
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleLaunch = useCallback(async () => {
    if (!name.trim() || !symbol.trim()) {
      setError("Name and symbol are required");
      return;
    }
    setError("");
    try {
      let result;

      if (tokenomics.enabled && BONDING_FACTORY_V2_ADDRESS) {
        // Validate shares sum to 100%
        const sharesSum =
          tokenomics.treasuryShareBps +
          tokenomics.autoLpShareBps +
          tokenomics.burnShareBps +
          tokenomics.reflectionShareBps;
        if (sharesSum !== 10000) {
          setError("Tax distribution must sum to 100%");
          return;
        }
        if (!account) {
          setError("Wallet not connected");
          return;
        }

        const maxWalletAmount =
          parseFloat(tokenomics.maxWalletPercent || "0") > 0
            ? String(
                (parseFloat(tokenomics.maxWalletPercent) / 100) * TOTAL_SUPPLY
              )
            : "0";
        const maxTxAmount =
          parseFloat(tokenomics.maxTxPercent || "0") > 0
            ? String(
                (parseFloat(tokenomics.maxTxPercent) / 100) * TOTAL_SUPPLY
              )
            : "0";

        result = await launchTokenWithTokenomics(
          name.trim(),
          symbol.trim().toUpperCase(),
          {
            buyTaxBps: tokenomics.buyTaxBps,
            sellTaxBps: tokenomics.sellTaxBps,
            treasuryShareBps: tokenomics.treasuryShareBps,
            autoLpShareBps: tokenomics.autoLpShareBps,
            burnShareBps: tokenomics.burnShareBps,
            reflectionShareBps: tokenomics.reflectionShareBps,
            maxWalletAmount,
            maxTxAmount,
            burnOnTransfer: tokenomics.burnOnTransfer,
            burnOnTransferBps: tokenomics.burnOnTransferBps,
            treasuryWallet: tokenomics.treasuryWallet || account,
          }
        );
      } else {
        result = await launchToken(
          name.trim(),
          symbol.trim().toUpperCase(),
          description.trim(),
          imageUrl.trim(),
          website.trim(),
          twitter.trim(),
          telegram.trim()
        );
      }

      setTxHash(result.txHash);
      if (result.curveAddress) {
        setTimeout(() => {
          router.push(`/token/${result.curveAddress}`);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
    }
  }, [
    name,
    symbol,
    description,
    imageUrl,
    website,
    twitter,
    telegram,
    tokenomics,
    account,
    launchToken,
    launchTokenWithTokenomics,
    router,
  ]);

  return (
    <Container maxW="480px" py={10}>
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        rounded="xl"
        p={6}
      >
        <Text
          fontSize="xl"
          fontWeight="700"
          color="var(--text-primary)"
          mb={1}
        >
          Launch Token
        </Text>
        <Text fontSize="xs" color="var(--text-tertiary)" mb={6}>
          Deploy a bonding curve token. 1B supply, auto-graduation to DEX.
        </Text>

        <VStack spacing={4} align="stretch">
          {/* Name */}
          <Box>
            <Text
              fontSize="10px"
              color="var(--text-tertiary)"
              textTransform="uppercase"
              mb={1}
            >
              Token Name *
            </Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Token"
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              color="var(--text-primary)"
              fontSize="sm"
              _hover={{ borderColor: "var(--border-hover)" }}
              _focus={{
                borderColor: "var(--accent)",
                boxShadow: "none",
              }}
              _placeholder={{ color: "var(--text-tertiary)" }}
            />
          </Box>

          {/* Symbol */}
          <Box>
            <Text
              fontSize="10px"
              color="var(--text-tertiary)"
              textTransform="uppercase"
              mb={1}
            >
              Symbol *
            </Text>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="TKN"
              maxLength={10}
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              color="var(--text-primary)"
              fontSize="sm"
              fontFamily="mono"
              _hover={{ borderColor: "var(--border-hover)" }}
              _focus={{
                borderColor: "var(--accent)",
                boxShadow: "none",
              }}
              _placeholder={{ color: "var(--text-tertiary)" }}
            />
          </Box>

          {/* Description */}
          <Box>
            <Text
              fontSize="10px"
              color="var(--text-tertiary)"
              textTransform="uppercase"
              mb={1}
            >
              Description
            </Text>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this token about?"
              rows={2}
              resize="none"
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              color="var(--text-primary)"
              fontSize="sm"
              _hover={{ borderColor: "var(--border-hover)" }}
              _focus={{
                borderColor: "var(--accent)",
                boxShadow: "none",
              }}
              _placeholder={{ color: "var(--text-tertiary)" }}
            />
          </Box>

          {/* Image URL */}
          <Box>
            <Text
              fontSize="10px"
              color="var(--text-tertiary)"
              textTransform="uppercase"
              mb={1}
            >
              Image URL
            </Text>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              color="var(--text-primary)"
              fontSize="sm"
              _hover={{ borderColor: "var(--border-hover)" }}
              _focus={{
                borderColor: "var(--accent)",
                boxShadow: "none",
              }}
              _placeholder={{ color: "var(--text-tertiary)" }}
            />
          </Box>

          {/* Social Links */}
          <Flex gap={3}>
            <Box flex={1}>
              <Text
                fontSize="10px"
                color="var(--text-tertiary)"
                textTransform="uppercase"
                mb={1}
              >
                Website
              </Text>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                bg="var(--bg-elevated)"
                border="1px solid"
                borderColor="var(--border)"
                color="var(--text-primary)"
                fontSize="xs"
                _hover={{ borderColor: "var(--border-hover)" }}
                _focus={{
                  borderColor: "var(--accent)",
                  boxShadow: "none",
                }}
                _placeholder={{ color: "var(--text-tertiary)" }}
              />
            </Box>
            <Box flex={1}>
              <Text
                fontSize="10px"
                color="var(--text-tertiary)"
                textTransform="uppercase"
                mb={1}
              >
                Twitter
              </Text>
              <Input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/..."
                bg="var(--bg-elevated)"
                border="1px solid"
                borderColor="var(--border)"
                color="var(--text-primary)"
                fontSize="xs"
                _hover={{ borderColor: "var(--border-hover)" }}
                _focus={{
                  borderColor: "var(--accent)",
                  boxShadow: "none",
                }}
                _placeholder={{ color: "var(--text-tertiary)" }}
              />
            </Box>
          </Flex>

          <Box>
            <Text
              fontSize="10px"
              color="var(--text-tertiary)"
              textTransform="uppercase"
              mb={1}
            >
              Telegram
            </Text>
            <Input
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="https://t.me/..."
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              color="var(--text-primary)"
              fontSize="sm"
              _hover={{ borderColor: "var(--border-hover)" }}
              _focus={{
                borderColor: "var(--accent)",
                boxShadow: "none",
              }}
              _placeholder={{ color: "var(--text-tertiary)" }}
            />
          </Box>

          {/* Tokenomics Toggle */}
          {BONDING_FACTORY_V2_ADDRESS && (
            <TokenomicsToggle value={tokenomics} onChange={setTokenomics} />
          )}

          {/* Fixed params info */}
          <Box
            bg="var(--bg-elevated)"
            rounded="lg"
            p={3}
            border="1px solid"
            borderColor="var(--border)"
          >
            <Text
              fontSize="10px"
              color="var(--text-tertiary)"
              textTransform="uppercase"
              mb={2}
            >
              Fixed Parameters
            </Text>
            <Flex justify="space-between" fontSize="xs" mb={1}>
              <Text color="var(--text-secondary)">Total Supply</Text>
              <Text fontFamily="mono" color="var(--text-primary)">
                1,000,000,000
              </Text>
            </Flex>
            <Flex justify="space-between" fontSize="xs" mb={1}>
              <Text color="var(--text-secondary)">Graduation</Text>
              <Text fontFamily="mono" color="var(--text-primary)">
                Auto → DEX Pool
              </Text>
            </Flex>
            <Flex justify="space-between" fontSize="xs">
              <Text color="var(--text-secondary)">Curve Type</Text>
              <Text fontFamily="mono" color="var(--text-primary)">
                Bonding Curve (xy=k)
              </Text>
            </Flex>
          </Box>

          {/* Error */}
          {error && (
            <Text fontSize="xs" color="var(--sell)">
              {error}
            </Text>
          )}

          {/* Success */}
          {txHash && (
            <Box
              bg="rgba(0,230,118,0.08)"
              border="1px solid"
              borderColor="rgba(0,230,118,0.2)"
              rounded="lg"
              p={3}
            >
              <Text fontSize="xs" color="var(--accent)" mb={1}>
                Token launched successfully!
              </Text>
              <Link
                href={getExplorerTxUrl(txHash)}
                isExternal
                fontSize="xs"
                color="var(--text-secondary)"
                _hover={{ color: "var(--accent)" }}
              >
                View transaction
              </Link>
            </Box>
          )}

          {/* Launch Button */}
          {!account ? (
            <Button
              w="100%"
              bg="var(--bg-elevated)"
              color="var(--text-secondary)"
              border="1px solid"
              borderColor="var(--border)"
              _hover={{ borderColor: "var(--border-hover)" }}
              isDisabled
            >
              Connect Wallet
            </Button>
          ) : (
            <Button
              w="100%"
              bg="var(--accent)"
              color="#0b0b0f"
              fontWeight="700"
              fontSize="md"
              py={6}
              _hover={{
                bg: "var(--accent-hover)",
                boxShadow: "0 0 20px var(--accent-glow)",
              }}
              isLoading={isLaunching}
              loadingText="Launching..."
              isDisabled={!name.trim() || !symbol.trim()}
              onClick={handleLaunch}
            >
              Launch Token
            </Button>
          )}
        </VStack>
      </Box>
    </Container>
  );
}
