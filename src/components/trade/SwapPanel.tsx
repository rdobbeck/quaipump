"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useAppState } from "@/app/store";
import { useTokenomicsToken } from "@/hooks/useTokenomicsToken";
import { NETWORK, DEFAULT_SLIPPAGE_BPS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Router ABI (Uniswap V2 compatible)                                 */
/* ------------------------------------------------------------------ */

const ROUTER_ABI = [
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function WETH() external view returns (address)",
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEADLINE_SECONDS = 1200; // 20 minutes

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface SwapPanelProps {
  tokenAddress: string;
  dexRouter: string;
  tokenSymbol: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SwapPanel({
  tokenAddress,
  dexRouter,
  tokenSymbol,
}: SwapPanelProps) {
  const toast = useToast();
  const { account, web3Provider, rpcProvider } = useAppState();
  const { approve, allowance } = useTokenomicsToken();

  /* ---- State ---- */
  const [buyAmount, setBuyAmount] = useState("");
  const [buyEstimate, setBuyEstimate] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [sellEstimate, setSellEstimate] = useState("");
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS);
  const [slippageInput, setSlippageInput] = useState(
    String(DEFAULT_SLIPPAGE_BPS / 100)
  );
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);

  /* ---- Helpers ---- */
  const routerNotConfigured =
    !dexRouter || dexRouter === ZERO_ADDRESS;

  const getProvider = useCallback(async () => {
    const quais = await import("quais");
    return (
      (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
      new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false })
    );
  }, [rpcProvider]);

  const getRouterRead = useCallback(async () => {
    const quais = await import("quais");
    const provider = await getProvider();
    return new quais.Contract(dexRouter, ROUTER_ABI, provider);
  }, [dexRouter, getProvider]);

  const getRouterWrite = useCallback(async () => {
    if (!web3Provider) throw new Error("Wallet not connected");
    const quais = await import("quais");
    const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
    const signer = await provider.getSigner();
    return new quais.Contract(dexRouter, ROUTER_ABI, signer);
  }, [web3Provider, dexRouter]);

  /* ---- Slippage handler ---- */
  const handleSlippageChange = (value: string) => {
    setSlippageInput(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
      setSlippageBps(Math.round(parsed * 100));
    }
  };

  /* ---- Buy estimate ---- */
  useEffect(() => {
    if (routerNotConfigured || !buyAmount || parseFloat(buyAmount) <= 0) {
      setBuyEstimate("");
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsEstimating(true);
      try {
        const quais = await import("quais");
        const router = await getRouterRead();
        const weth: string = await router.WETH();
        const amountIn = quais.parseUnits(buyAmount, 18);
        const amounts: bigint[] = await router.getAmountsOut(amountIn, [
          weth,
          tokenAddress,
        ]);
        if (!cancelled) {
          setBuyEstimate(quais.formatUnits(amounts[1], 18));
        }
      } catch {
        if (!cancelled) setBuyEstimate("");
      } finally {
        if (!cancelled) setIsEstimating(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [buyAmount, tokenAddress, routerNotConfigured, getRouterRead]);

  /* ---- Sell estimate ---- */
  useEffect(() => {
    if (routerNotConfigured || !sellAmount || parseFloat(sellAmount) <= 0) {
      setSellEstimate("");
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsEstimating(true);
      try {
        const quais = await import("quais");
        const router = await getRouterRead();
        const weth: string = await router.WETH();
        const amountIn = quais.parseUnits(sellAmount, 18);
        const amounts: bigint[] = await router.getAmountsOut(amountIn, [
          tokenAddress,
          weth,
        ]);
        if (!cancelled) {
          setSellEstimate(quais.formatUnits(amounts[1], 18));
        }
      } catch {
        if (!cancelled) setSellEstimate("");
      } finally {
        if (!cancelled) setIsEstimating(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [sellAmount, tokenAddress, routerNotConfigured, getRouterRead]);

  /* ---- Buy handler ---- */
  const handleBuy = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsBuying(true);
    try {
      const quais = await import("quais");
      const router = await getRouterWrite();
      const weth: string = await router.WETH();
      const amountIn = quais.parseUnits(buyAmount, 18);

      // Get estimated output
      const routerRead = await getRouterRead();
      const amounts: bigint[] = await routerRead.getAmountsOut(amountIn, [
        weth,
        tokenAddress,
      ]);
      const expectedOut = amounts[1];
      const amountOutMin =
        expectedOut - (expectedOut * BigInt(slippageBps)) / BigInt(10000);

      const deadline = Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;

      const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        amountOutMin,
        [weth, tokenAddress],
        account,
        deadline,
        { value: amountIn }
      );
      await tx.wait();

      toast({
        title: "Swap Successful",
        description: `Bought ${tokenSymbol} for ${buyAmount} QUAI`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setBuyAmount("");
      setBuyEstimate("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Swap failed";
      toast({
        title: "Buy Failed",
        description: message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsBuying(false);
    }
  };

  /* ---- Sell handler ---- */
  const handleSell = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsSelling(true);
    try {
      const quais = await import("quais");
      const amountIn = quais.parseUnits(sellAmount, 18);

      // Check allowance and approve if needed
      const currentAllowance = await allowance(tokenAddress, account, dexRouter);
      if (currentAllowance < amountIn) {
        toast({
          title: "Approving token",
          description: "Please confirm the approval transaction",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        await approve(tokenAddress, dexRouter, amountIn);
      }

      const router = await getRouterWrite();
      const weth: string = await router.WETH();

      // Get estimated output
      const routerRead = await getRouterRead();
      const amounts: bigint[] = await routerRead.getAmountsOut(amountIn, [
        tokenAddress,
        weth,
      ]);
      const expectedOut = amounts[1];
      const amountOutMin =
        expectedOut - (expectedOut * BigInt(slippageBps)) / BigInt(10000);

      const deadline = Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;

      const tx =
        await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
          amountIn,
          amountOutMin,
          [tokenAddress, weth],
          account,
          deadline
        );
      await tx.wait();

      toast({
        title: "Swap Successful",
        description: `Sold ${sellAmount} ${tokenSymbol} for QUAI`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setSellAmount("");
      setSellEstimate("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Swap failed";
      toast({
        title: "Sell Failed",
        description: message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsSelling(false);
    }
  };

  /* ---- Render ---- */
  if (routerNotConfigured) {
    return (
      <Box
        bg="var(--bg-surface)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="xl"
        p={5}
        textAlign="center"
      >
        <Text color="var(--text-secondary)">
          DEX router not configured
        </Text>
      </Box>
    );
  }

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      borderRadius="xl"
      p={5}
    >
      <Text fontWeight="600" fontSize="md" mb={4}>
        Swap
      </Text>

      {/* Slippage setting */}
      <Flex align="center" mb={4} gap={2}>
        <Text fontSize="xs" color="var(--text-secondary)" whiteSpace="nowrap">
          Slippage:
        </Text>
        <InputGroup size="sm" maxW="90px">
          <Input
            value={slippageInput}
            onChange={(e) => handleSlippageChange(e.target.value)}
            type="number"
            min={0.1}
            max={50}
            step={0.5}
            fontSize="xs"
            textAlign="right"
            pr="28px"
          />
          <InputRightElement
            pointerEvents="none"
            fontSize="xs"
            color="var(--text-secondary)"
            w="24px"
          >
            %
          </InputRightElement>
        </InputGroup>
      </Flex>

      <Tabs variant="soft-rounded" size="sm">
        <TabList mb={4}>
          <Tab flex={1}>Buy</Tab>
          <Tab flex={1}>Sell</Tab>
        </TabList>

        <TabPanels>
          {/* ---- Buy Tab ---- */}
          <TabPanel px={0}>
            <Box mb={3}>
              <Text
                fontSize="xs"
                color="var(--text-secondary)"
                mb={1}
              >
                You pay (QUAI)
              </Text>
              <Input
                placeholder="0.0"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                type="number"
                min={0}
                step="any"
              />
            </Box>

            <Box
              mb={4}
              bg="var(--bg-elevated)"
              borderRadius="lg"
              p={3}
            >
              <Text fontSize="xs" color="var(--text-secondary)" mb={1}>
                You receive (est.)
              </Text>
              <HStack>
                {isEstimating ? (
                  <Spinner size="xs" color="var(--accent)" />
                ) : (
                  <Text fontSize="sm" fontWeight="500" fontFamily="mono">
                    {buyEstimate
                      ? `${parseFloat(buyEstimate).toLocaleString(undefined, { maximumFractionDigits: 6 })}`
                      : "--"}
                  </Text>
                )}
                <Text
                  fontSize="xs"
                  color="var(--text-secondary)"
                  ml="auto"
                >
                  {tokenSymbol}
                </Text>
              </HStack>
            </Box>

            <Button
              variant="accent"
              w="100%"
              onClick={handleBuy}
              isDisabled={
                isBuying ||
                !account ||
                !buyAmount ||
                parseFloat(buyAmount) <= 0
              }
              isLoading={isBuying}
              loadingText="Swapping"
              spinner={<Spinner size="sm" />}
            >
              {!account ? "Connect Wallet" : "Buy"}
            </Button>
          </TabPanel>

          {/* ---- Sell Tab ---- */}
          <TabPanel px={0}>
            <Box mb={3}>
              <Text
                fontSize="xs"
                color="var(--text-secondary)"
                mb={1}
              >
                You sell ({tokenSymbol})
              </Text>
              <Input
                placeholder="0.0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                type="number"
                min={0}
                step="any"
              />
            </Box>

            <Box
              mb={4}
              bg="var(--bg-elevated)"
              borderRadius="lg"
              p={3}
            >
              <Text fontSize="xs" color="var(--text-secondary)" mb={1}>
                You receive (est.)
              </Text>
              <HStack>
                {isEstimating ? (
                  <Spinner size="xs" color="var(--accent)" />
                ) : (
                  <Text fontSize="sm" fontWeight="500" fontFamily="mono">
                    {sellEstimate
                      ? `${parseFloat(sellEstimate).toLocaleString(undefined, { maximumFractionDigits: 6 })}`
                      : "--"}
                  </Text>
                )}
                <Text
                  fontSize="xs"
                  color="var(--text-secondary)"
                  ml="auto"
                >
                  QUAI
                </Text>
              </HStack>
            </Box>

            <Button
              variant="sell"
              w="100%"
              onClick={handleSell}
              isDisabled={
                isSelling ||
                !account ||
                !sellAmount ||
                parseFloat(sellAmount) <= 0
              }
              isLoading={isSelling}
              loadingText="Swapping"
              spinner={<Spinner size="sm" />}
            >
              {!account ? "Connect Wallet" : "Sell"}
            </Button>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
