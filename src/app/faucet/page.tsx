"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Input,
  Spinner,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertDescription,
  Link,
} from "@chakra-ui/react";
import { useAppState } from "@/app/store";
import { useWqi, type FaucetInfo } from "@/hooks/useWqi";
import { useWqiRate } from "@/hooks/useWqiRate";
import { WQI_ENABLED, WQI_FAUCET_ENABLED, WQI_ADDRESS } from "@/lib/constants";
import { shortenAddress, getExplorerTxUrl } from "@/lib/utils";

export default function FaucetPage() {
  const { account } = useAppState();
  const {
    getWqiBalance,
    getSwapQuote,
    swapQuaiForWqi,
    getFaucetInfo,
    requestDrip,
    isSwapping,
    isDripping,
  } = useWqi();
  const { rate, loading: rateLoading } = useWqiRate();

  // Balance
  const [wqiBalance, setWqiBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Faucet
  const [faucetInfo, setFaucetInfo] = useState<FaucetInfo | null>(null);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [cooldownDisplay, setCooldownDisplay] = useState("");
  const [dripSuccess, setDripSuccess] = useState<string | null>(null);
  const [dripError, setDripError] = useState<string | null>(null);

  // Swap
  const [quaiAmount, setQuaiAmount] = useState("");
  const [swapQuote, setSwapQuote] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const quoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch balance
  const loadBalance = useCallback(async () => {
    if (!account || !WQI_ENABLED) return;
    setBalanceLoading(true);
    try {
      const bal = await getWqiBalance(account);
      setWqiBalance(bal);
    } catch {
      setWqiBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [account, getWqiBalance]);

  // Fetch faucet info
  const loadFaucetInfo = useCallback(async () => {
    if (!account || !WQI_FAUCET_ENABLED) return;
    setFaucetLoading(true);
    try {
      const info = await getFaucetInfo(account);
      setFaucetInfo(info);
    } catch {
      setFaucetInfo(null);
    } finally {
      setFaucetLoading(false);
    }
  }, [account, getFaucetInfo]);

  useEffect(() => {
    loadBalance();
    loadFaucetInfo();
  }, [loadBalance, loadFaucetInfo]);

  // Cooldown timer
  useEffect(() => {
    if (!faucetInfo || faucetInfo.canDrip) {
      setCooldownDisplay("");
      return;
    }
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(
        0,
        faucetInfo.lastDripTimestamp + faucetInfo.cooldownSeconds - now
      );
      if (remaining === 0) {
        setCooldownDisplay("");
        loadFaucetInfo();
      } else {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        setCooldownDisplay(`${m}m ${s}s`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [faucetInfo, loadFaucetInfo]);

  // Debounced quote
  useEffect(() => {
    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    if (!quaiAmount || parseFloat(quaiAmount) <= 0) {
      setSwapQuote("");
      return;
    }
    setQuoteLoading(true);
    quoteTimeoutRef.current = setTimeout(async () => {
      try {
        const q = await getSwapQuote(quaiAmount);
        setSwapQuote(q);
      } catch {
        setSwapQuote("");
      } finally {
        setQuoteLoading(false);
      }
    }, 300);
    return () => {
      if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    };
  }, [quaiAmount, getSwapQuote]);

  // Handlers
  const handleDrip = async () => {
    setDripSuccess(null);
    setDripError(null);
    try {
      const txHash = await requestDrip();
      setDripSuccess(txHash);
      loadBalance();
      loadFaucetInfo();
    } catch (err) {
      setDripError(err instanceof Error ? err.message : "Drip failed");
    }
  };

  const handleSwap = async () => {
    setSwapSuccess(null);
    setSwapError(null);
    if (!swapQuote || !quaiAmount) return;
    try {
      // 1% slippage
      const minOut = (parseFloat(swapQuote) * 0.99).toFixed(18);
      const txHash = await swapQuaiForWqi(quaiAmount, minOut);
      setSwapSuccess(txHash);
      setQuaiAmount("");
      setSwapQuote("");
      loadBalance();
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Swap failed");
    }
  };

  const presetAmounts = [0.1, 0.5, 1, 5];

  // Compute QUAI equivalent of balance
  const balanceQuaiEquiv =
    wqiBalance && rate ? (parseFloat(wqiBalance) * rate.quaiPerWqi).toFixed(4) : null;

  return (
    <Container maxW="container.sm" py={8}>
      <Heading size="lg" mb={2}>
        wQI Faucet & Swap
      </Heading>
      <Text color="var(--text-secondary)" mb={6}>
        Get testnet wQI tokens or swap QUAI for wQI
      </Text>

      {/* wQI not configured */}
      {!WQI_ENABLED && (
        <Box
          p={8}
          textAlign="center"
          bg="var(--bg-surface)"
          borderRadius="xl"
          border="1px solid"
          borderColor="var(--border)"
        >
          <Text color="var(--text-secondary)">
            wQI integration is not configured for this deployment.
          </Text>
        </Box>
      )}

      {/* Wallet not connected */}
      {WQI_ENABLED && !account && (
        <Box
          p={6}
          bg="var(--bg-surface)"
          borderRadius="xl"
          border="1px solid"
          borderColor="var(--warning, #f6ad55)"
          textAlign="center"
        >
          <Text color="var(--text-secondary)" fontSize="sm">
            Connect your wallet to use the wQI faucet and swap.
          </Text>
        </Box>
      )}

      {/* Main content */}
      {WQI_ENABLED && account && (
        <VStack spacing={6} align="stretch">
          {/* Balance Card */}
          <Box
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            borderRadius="xl"
            p={5}
          >
            <Text
              fontSize="xs"
              fontWeight="600"
              color="var(--accent)"
              textTransform="uppercase"
              letterSpacing="0.05em"
              mb={3}
            >
              Your wQI Balance
            </Text>
            {balanceLoading ? (
              <Spinner size="sm" color="var(--accent)" />
            ) : (
              <>
                <Text fontSize="2xl" fontWeight="700" fontFamily="mono">
                  {wqiBalance
                    ? parseFloat(wqiBalance).toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })
                    : "0"}{" "}
                  <Text as="span" fontSize="md" color="var(--text-secondary)">
                    wQI
                  </Text>
                </Text>
                {balanceQuaiEquiv && (
                  <Text fontSize="sm" color="var(--text-secondary)">
                    ~{balanceQuaiEquiv} QUAI
                  </Text>
                )}
              </>
            )}
          </Box>

          {/* Faucet Section */}
          {WQI_FAUCET_ENABLED && (
            <Box
              bg="var(--bg-surface)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="xl"
              p={5}
            >
              <Text fontWeight="600" fontSize="md" mb={4}>
                Testnet Faucet
              </Text>

              {faucetLoading ? (
                <Spinner size="sm" color="var(--accent)" />
              ) : faucetInfo ? (
                <VStack spacing={3} align="stretch">
                  <Box bg="var(--bg-elevated)" borderRadius="lg" p={3}>
                    <Flex justify="space-between" fontSize="sm">
                      <Text color="var(--text-secondary)">Drip amount</Text>
                      <Text fontFamily="mono">
                        {parseFloat(faucetInfo.dripAmount).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}{" "}
                        wQI
                      </Text>
                    </Flex>
                    <Flex justify="space-between" fontSize="sm" mt={1}>
                      <Text color="var(--text-secondary)">Cooldown</Text>
                      <Text fontFamily="mono">
                        {Math.floor(faucetInfo.cooldownSeconds / 60)}m
                      </Text>
                    </Flex>
                  </Box>

                  {cooldownDisplay && (
                    <Text fontSize="sm" color="var(--text-secondary)" textAlign="center">
                      Cooldown: {cooldownDisplay}
                    </Text>
                  )}

                  <Button
                    variant="accent"
                    w="100%"
                    onClick={handleDrip}
                    isDisabled={isDripping || !faucetInfo.canDrip}
                    isLoading={isDripping}
                    loadingText="Requesting"
                    spinner={<Spinner size="sm" />}
                  >
                    Request wQI
                  </Button>

                  {dripSuccess && (
                    <Alert
                      status="success"
                      bg="var(--bg-elevated)"
                      borderRadius="lg"
                      fontSize="sm"
                    >
                      <AlertIcon />
                      <AlertDescription>
                        Drip successful!{" "}
                        <Link
                          href={getExplorerTxUrl(dripSuccess)}
                          isExternal
                          color="var(--accent)"
                        >
                          View tx
                        </Link>
                      </AlertDescription>
                    </Alert>
                  )}

                  {dripError && (
                    <Alert
                      status="error"
                      bg="var(--bg-elevated)"
                      borderRadius="lg"
                      fontSize="sm"
                    >
                      <AlertIcon />
                      <AlertDescription>{dripError}</AlertDescription>
                    </Alert>
                  )}
                </VStack>
              ) : (
                <Text color="var(--text-secondary)" fontSize="sm">
                  Unable to load faucet info.
                </Text>
              )}
            </Box>
          )}

          {/* Swap Section */}
          <Box
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            borderRadius="xl"
            p={5}
          >
            <Text fontWeight="600" fontSize="md" mb={4}>
              Swap QUAI → wQI
            </Text>

            {/* Rate + Liquidity Info */}
            <Box bg="var(--bg-elevated)" borderRadius="lg" p={3} mb={4}>
              <Flex justify="space-between" fontSize="sm">
                <Text color="var(--text-secondary)">Rate</Text>
                {rateLoading ? (
                  <Spinner size="xs" color="var(--accent)" />
                ) : rate ? (
                  <Text fontFamily="mono">
                    1 QUAI = {rate.wqiPerQuai.toFixed(4)} wQI
                  </Text>
                ) : (
                  <Text color="var(--text-secondary)">--</Text>
                )}
              </Flex>
              {rate && (
                <Flex justify="space-between" fontSize="sm" mt={1}>
                  <Text color="var(--text-secondary)">Pool liquidity</Text>
                  <Text fontFamily="mono">
                    {parseFloat(rate.reserveQuai).toFixed(2)} QUAI /{" "}
                    {parseFloat(rate.reserveWqi).toFixed(2)} wQI
                  </Text>
                </Flex>
              )}
            </Box>

            {/* Amount Input */}
            <Box mb={3}>
              <Text fontSize="xs" color="var(--text-secondary)" mb={1}>
                You pay (QUAI)
              </Text>
              <Input
                placeholder="0.0"
                value={quaiAmount}
                onChange={(e) => setQuaiAmount(e.target.value)}
                type="number"
                min={0}
                step="any"
              />
            </Box>

            {/* Preset Buttons */}
            <HStack spacing={2} mb={4}>
              {presetAmounts.map((amt) => (
                <Button
                  key={amt}
                  size="xs"
                  variant="outline"
                  borderColor="var(--border)"
                  color="var(--text-secondary)"
                  _hover={{
                    borderColor: "var(--accent)",
                    color: "var(--accent)",
                  }}
                  onClick={() => setQuaiAmount(String(amt))}
                >
                  {amt}
                </Button>
              ))}
            </HStack>

            {/* Quote Display */}
            <Box bg="var(--bg-elevated)" borderRadius="lg" p={3} mb={4}>
              <Text fontSize="xs" color="var(--text-secondary)" mb={1}>
                You receive (est.)
              </Text>
              <HStack>
                {quoteLoading ? (
                  <Spinner size="xs" color="var(--accent)" />
                ) : (
                  <Text fontSize="sm" fontWeight="500" fontFamily="mono">
                    {swapQuote
                      ? parseFloat(swapQuote).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })
                      : "--"}
                  </Text>
                )}
                <Text fontSize="xs" color="var(--text-secondary)" ml="auto">
                  wQI
                </Text>
              </HStack>
              {swapQuote && (
                <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                  Min. received (1% slippage):{" "}
                  {(parseFloat(swapQuote) * 0.99).toFixed(4)} wQI
                </Text>
              )}
            </Box>

            {/* Swap Button */}
            <Button
              variant="accent"
              w="100%"
              onClick={handleSwap}
              isDisabled={
                isSwapping ||
                !quaiAmount ||
                parseFloat(quaiAmount) <= 0 ||
                !swapQuote
              }
              isLoading={isSwapping}
              loadingText="Swapping"
              spinner={<Spinner size="sm" />}
            >
              Swap
            </Button>

            {swapSuccess && (
              <Alert
                status="success"
                bg="var(--bg-elevated)"
                borderRadius="lg"
                fontSize="sm"
                mt={3}
              >
                <AlertIcon />
                <AlertDescription>
                  Swap successful!{" "}
                  <Link
                    href={getExplorerTxUrl(swapSuccess)}
                    isExternal
                    color="var(--accent)"
                  >
                    View tx
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {swapError && (
              <Alert
                status="error"
                bg="var(--bg-elevated)"
                borderRadius="lg"
                fontSize="sm"
                mt={3}
              >
                <AlertIcon />
                <AlertDescription>{swapError}</AlertDescription>
              </Alert>
            )}
          </Box>

          {/* Footer explainer */}
          <Box
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            borderRadius="xl"
            p={5}
          >
            <Text fontSize="xs" color="var(--text-secondary)" lineHeight="tall">
              <Text as="span" fontWeight="600" color="var(--text-primary)">
                What is wQI?
              </Text>{" "}
              wQI (wrapped Qi) is the EVM-compatible version of Quai Network&apos;s
              stable energy dollar. It provides a stable reference for earnings and
              payments within the ecosystem.
            </Text>
            <Text fontSize="xs" color="var(--text-secondary)" mt={2}>
              Contract: {shortenAddress(WQI_ADDRESS)}
            </Text>
          </Box>
        </VStack>
      )}
    </Container>
  );
}
