"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Flex, Text, Input, Button, useToast } from "@chakra-ui/react";
import { useBondingCurve } from "@/hooks/useBondingCurve";
import { useAppState } from "@/app/store";
import { NETWORK, QUAI_USD_PRICE } from "@/lib/constants";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";
import BondingCurveTokenABI from "@/lib/abi/BondingCurveToken.json";
import { playSuccess, playError } from "@/lib/sounds";

interface TradePanelProps {
  curveAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  graduated: boolean;
  poolAddress?: string;
  onTrade?: () => void;
}

const BUY_PRESETS = ["0.1", "0.5", "1", "5"];
const SELL_PRESETS = [25, 50, 75, 100];
const SLIPPAGE_OPTIONS = [0.5, 1, 3, 5];

export function TradePanel({
  curveAddress,
  tokenAddress,
  tokenSymbol,
  graduated,
  poolAddress,
  onTrade,
}: TradePanelProps) {
  const toast = useToast();
  const { account, web3Provider } = useAppState();
  const {
    buyTokensChunked,
    sellTokens,
    getBuyQuote,
    getSellQuote,
    getTokenBalance,
    isBuying,
    isSelling,
  } = useBondingCurve();

  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [balance, setBalance] = useState("0");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [poolSwapping, setPoolSwapping] = useState(false);
  const [approving, setApproving] = useState(false);
  const [customSlippage, setCustomSlippage] = useState("");
  const [chunkProgress, setChunkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Fetch token balance
  useEffect(() => {
    if (!account || !tokenAddress) return;
    let cancelled = false;
    getTokenBalance(tokenAddress, account)
      .then((bal) => {
        if (!cancelled) setBalance(bal);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [account, tokenAddress, getTokenBalance]);

  // Debounced quote fetching
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote("");
      return;
    }
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        if (graduated && poolAddress) {
          // Use pool's getAmountOut
          const quais = await import("quais");
          const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
          const pool = new quais.Contract(poolAddress, GraduatedPoolABI, provider);
          const amountIn = mode === "buy"
            ? quais.parseQuai(amount)
            : quais.parseUnits(amount, 18);
          const out: bigint = await pool.getAmountOut(amountIn, mode === "buy");
          setQuote(
            mode === "buy"
              ? quais.formatUnits(out, 18)
              : quais.formatQuai(out)
          );
        } else {
          if (mode === "buy") {
            const q = await getBuyQuote(curveAddress, amount);
            setQuote(q);
          } else {
            const q = await getSellQuote(curveAddress, amount);
            setQuote(q);
          }
        }
      } catch {
        setQuote("");
      } finally {
        setQuoteLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [amount, mode, curveAddress, graduated, poolAddress, getBuyQuote, getSellQuote]);

  // Bonding curve buy (with chunking)
  const handleBuy = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const buyAmount = amount;
    try {
      const slippageFraction = slippage / 100;
      setChunkProgress(null);
      await buyTokensChunked(
        curveAddress,
        buyAmount,
        slippageFraction,
        (current, total) => {
          setChunkProgress({ current, total });
        }
      );
      setAmount("");
      setQuote("");
      setChunkProgress(null);
      if (account) {
        const bal = await getTokenBalance(tokenAddress, account);
        setBalance(bal);
      }
      onTrade?.();
      playSuccess();
      toast({
        title: "Buy successful",
        description: `Bought ${tokenSymbol} for ${buyAmount} QUAI`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (err) {
      console.error("Buy failed:", err);
      setChunkProgress(null);
      playError();
      toast({
        title: "Buy failed",
        description: err instanceof Error ? err.message : "Transaction rejected or failed",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [
    amount, slippage, curveAddress, tokenAddress, tokenSymbol, account,
    buyTokensChunked, getTokenBalance, onTrade, toast,
  ]);

  // Bonding curve sell
  const handleSell = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const sellAmount = amount;
    try {
      const minQuaiOut = quote
        ? (parseFloat(quote) * (1 - slippage / 100)).toString()
        : "0";
      await sellTokens(curveAddress, sellAmount, minQuaiOut);
      setAmount("");
      setQuote("");
      if (account) {
        const bal = await getTokenBalance(tokenAddress, account);
        setBalance(bal);
      }
      onTrade?.();
      playSuccess();
      toast({
        title: "Sell successful",
        description: `Sold ${parseFloat(sellAmount).toLocaleString()} ${tokenSymbol}`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (err) {
      console.error("Sell failed:", err);
      playError();
      toast({
        title: "Sell failed",
        description: err instanceof Error ? err.message : "Transaction rejected or failed",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [
    amount, quote, slippage, curveAddress, tokenAddress, tokenSymbol, account,
    sellTokens, getTokenBalance, onTrade, toast,
  ]);

  // Pool buy (swapQuaiForTokens)
  const handlePoolBuy = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !poolAddress || !web3Provider) return;
    const buyAmount = amount;
    setPoolSwapping(true);
    try {
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const pool = new quais.Contract(poolAddress, GraduatedPoolABI, signer);

      const quaiAmount = quais.parseQuai(buyAmount);

      // Get quote for min out
      const readProvider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
      const readPool = new quais.Contract(poolAddress, GraduatedPoolABI, readProvider);
      const expectedOut: bigint = await readPool.getAmountOut(quaiAmount, true);
      const slippageBps = BigInt(Math.floor(slippage * 100));
      const minOut = expectedOut * (10000n - slippageBps) / 10000n;

      const tx = await pool.swapQuaiForTokens(minOut, { value: quaiAmount });
      await tx.wait();

      setAmount("");
      setQuote("");
      if (account) {
        const bal = await getTokenBalance(tokenAddress, account);
        setBalance(bal);
      }
      onTrade?.();
      playSuccess();
      toast({
        title: "Buy successful",
        description: `Bought ${tokenSymbol} for ${buyAmount} QUAI (pool)`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (err) {
      console.error("Pool buy failed:", err);
      playError();
      toast({
        title: "Buy failed",
        description: err instanceof Error ? err.message : "Transaction rejected or failed",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    } finally {
      setPoolSwapping(false);
    }
  }, [
    amount, slippage, poolAddress, web3Provider, tokenAddress, tokenSymbol, account,
    getTokenBalance, onTrade, toast,
  ]);

  // Pool sell (approve + swapTokensForQuai)
  const handlePoolSell = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !poolAddress || !web3Provider) return;
    const sellAmount = amount;
    setPoolSwapping(true);
    try {
      const quais = await import("quais");
      const provider = web3Provider as InstanceType<typeof quais.BrowserProvider>;
      const signer = await provider.getSigner();
      const tokenAmount = quais.parseUnits(sellAmount, 18);

      // Check allowance and approve if needed
      const tokenContract = new quais.Contract(tokenAddress, BondingCurveTokenABI, signer);
      const signerAddress = await signer.getAddress();
      const currentAllowance: bigint = await tokenContract.allowance(signerAddress, poolAddress);

      if (currentAllowance < tokenAmount) {
        setApproving(true);
        const approveTx = await tokenContract.approve(poolAddress, tokenAmount);
        await approveTx.wait();
        setApproving(false);
      }

      // Get quote for min out
      const readProvider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
      const readPool = new quais.Contract(poolAddress, GraduatedPoolABI, readProvider);
      const expectedOut: bigint = await readPool.getAmountOut(tokenAmount, false);
      const slippageBps = BigInt(Math.floor(slippage * 100));
      const minOut = expectedOut * (10000n - slippageBps) / 10000n;

      const pool = new quais.Contract(poolAddress, GraduatedPoolABI, signer);
      const tx = await pool.swapTokensForQuai(tokenAmount, minOut);
      await tx.wait();

      setAmount("");
      setQuote("");
      if (account) {
        const bal = await getTokenBalance(tokenAddress, account);
        setBalance(bal);
      }
      onTrade?.();
      playSuccess();
      toast({
        title: "Sell successful",
        description: `Sold ${parseFloat(sellAmount).toLocaleString()} ${tokenSymbol} (pool)`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (err) {
      console.error("Pool sell failed:", err);
      setApproving(false);
      playError();
      toast({
        title: "Sell failed",
        description: err instanceof Error ? err.message : "Transaction rejected or failed",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    } finally {
      setPoolSwapping(false);
    }
  }, [
    amount, slippage, poolAddress, web3Provider, tokenAddress, tokenSymbol, account,
    getTokenBalance, onTrade, toast,
  ]);

  const handleSellPercent = (pct: number) => {
    const bal = parseFloat(balance);
    if (bal > 0) {
      setAmount((bal * pct / 100).toString());
    }
  };

  const isProcessing = isBuying || isSelling || poolSwapping;
  const connected = !!account;
  const canTradeGraduated = graduated && !!poolAddress;

  const handleAction = () => {
    if (canTradeGraduated) {
      mode === "buy" ? handlePoolBuy() : handlePoolSell();
    } else {
      mode === "buy" ? handleBuy() : handleSell();
    }
  };

  const getButtonText = () => {
    if (approving) return "Approving...";
    if (mode === "buy") return `Buy ${tokenSymbol}`;
    return `Sell ${tokenSymbol}`;
  };

  const getLoadingText = () => {
    if (approving) return "Approving...";
    return mode === "buy" ? "Buying..." : "Selling...";
  };

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      rounded="xl"
      p={4}
    >
      {/* Buy/Sell Tabs */}
      <Flex mb={4} bg="var(--bg-elevated)" rounded="lg" p={1}>
        <Button
          flex={1}
          size="sm"
          rounded="md"
          bg={mode === "buy" ? "var(--accent)" : "transparent"}
          color={mode === "buy" ? "#0b0b0f" : "var(--text-secondary)"}
          fontWeight="600"
          _hover={{
            bg: mode === "buy" ? "var(--accent-hover)" : "var(--bg-surface)",
          }}
          onClick={() => {
            setMode("buy");
            setAmount("");
            setQuote("");
          }}
        >
          Buy
        </Button>
        <Button
          flex={1}
          size="sm"
          rounded="md"
          bg={mode === "sell" ? "var(--sell)" : "transparent"}
          color={mode === "sell" ? "white" : "var(--text-secondary)"}
          fontWeight="600"
          _hover={{
            bg: mode === "sell" ? "#e04848" : "var(--bg-surface)",
          }}
          onClick={() => {
            setMode("sell");
            setAmount("");
            setQuote("");
          }}
        >
          Sell
        </Button>
      </Flex>

      {/* Trading venue indicator */}
      {canTradeGraduated && (
        <Box
          bg="rgba(255,215,0,0.08)"
          border="1px solid"
          borderColor="rgba(255,215,0,0.2)"
          rounded="lg"
          px={3}
          py={1.5}
          mb={3}
        >
          <Text fontSize="10px" color="#ffd700" textAlign="center">
            Trading on Graduated Pool
          </Text>
        </Box>
      )}

      {/* Amount Input */}
      <Box mb={3}>
        <Flex justify="space-between" mb={1}>
          <Text
            fontSize="10px"
            color="var(--text-tertiary)"
            textTransform="uppercase"
          >
            {mode === "buy" ? "Amount (QUAI)" : `Amount (${tokenSymbol})`}
          </Text>
          {mode === "sell" && (
            <Text fontSize="10px" color="var(--text-tertiary)">
              Bal:{" "}
              {parseFloat(balance).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </Text>
          )}
        </Flex>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          type="number"
          bg="var(--bg-elevated)"
          border="1px solid"
          borderColor="var(--border)"
          color="var(--text-primary)"
          fontFamily="mono"
          fontSize="lg"
          fontWeight="600"
          _hover={{ borderColor: "var(--border-hover)" }}
          _focus={{
            borderColor: mode === "buy" ? "var(--accent)" : "var(--sell)",
            boxShadow: "none",
          }}
          _placeholder={{ color: "var(--text-tertiary)" }}
        />
      </Box>

      {/* Preset Pills */}
      <Flex gap={2} mb={3}>
        {mode === "buy"
          ? BUY_PRESETS.map((p) => (
              <Button
                key={p}
                size="xs"
                flex={1}
                bg="var(--bg-elevated)"
                color="var(--text-secondary)"
                border="1px solid"
                borderColor="var(--border)"
                fontFamily="mono"
                fontSize="11px"
                _hover={{
                  borderColor: "var(--accent)",
                  color: "var(--accent)",
                }}
                onClick={() => setAmount(p)}
              >
                {p}
              </Button>
            ))
          : SELL_PRESETS.map((p) => (
              <Button
                key={p}
                size="xs"
                flex={1}
                bg="var(--bg-elevated)"
                color="var(--text-secondary)"
                border="1px solid"
                borderColor="var(--border)"
                fontFamily="mono"
                fontSize="11px"
                _hover={{
                  borderColor: "var(--sell)",
                  color: "var(--sell)",
                }}
                onClick={() => handleSellPercent(p)}
              >
                {p}%
              </Button>
            ))}
      </Flex>

      {/* Quote Display */}
      {(quote || quoteLoading) && (
        <Box
          bg="var(--bg-elevated)"
          rounded="lg"
          p={3}
          mb={3}
          border="1px solid"
          borderColor="var(--border)"
        >
          <Text
            fontSize="10px"
            color="var(--text-tertiary)"
            textTransform="uppercase"
            mb={1}
          >
            You receive
          </Text>
          <Text
            fontSize="sm"
            fontWeight="600"
            fontFamily="mono"
            color="var(--text-primary)"
          >
            {quoteLoading
              ? "..."
              : mode === "buy"
              ? `${parseFloat(quote).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })} ${tokenSymbol}`
              : `${parseFloat(quote).toFixed(4)} QUAI (~$${(
                  parseFloat(quote) * QUAI_USD_PRICE
                ).toFixed(4)})`}
          </Text>
        </Box>
      )}

      {/* Chunk Progress (bonding curve only) */}
      {chunkProgress && (
        <Box mb={3}>
          <Text fontSize="10px" color="var(--accent)" textAlign="center">
            Processing chunk {chunkProgress.current} of {chunkProgress.total}...
          </Text>
        </Box>
      )}

      {/* Action Button */}
      {!connected ? (
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
          bg={mode === "buy" ? "var(--accent)" : "var(--sell)"}
          color={mode === "buy" ? "#0b0b0f" : "white"}
          fontWeight="700"
          fontSize="md"
          _hover={{
            bg: mode === "buy" ? "var(--accent-hover)" : "#e04848",
            boxShadow:
              mode === "buy"
                ? "0 0 20px var(--accent-glow)"
                : "0 0 20px rgba(255,82,82,0.15)",
          }}
          isLoading={isProcessing}
          loadingText={getLoadingText()}
          isDisabled={!amount || parseFloat(amount) <= 0}
          onClick={handleAction}
        >
          {getButtonText()}
        </Button>
      )}

      {/* Slippage */}
      <Flex mt={3} align="center" justify="space-between">
        <Text fontSize="10px" color="var(--text-tertiary)">
          Slippage
        </Text>
        <Flex gap={1} align="center">
          {SLIPPAGE_OPTIONS.map((s) => (
            <Button
              key={s}
              size="xs"
              px={2}
              minW="auto"
              h="22px"
              fontSize="10px"
              fontFamily="mono"
              bg={slippage === s && !customSlippage ? "var(--accent)" : "var(--bg-elevated)"}
              color={slippage === s && !customSlippage ? "#0b0b0f" : "var(--text-tertiary)"}
              border="1px solid"
              borderColor={
                slippage === s && !customSlippage ? "var(--accent)" : "var(--border)"
              }
              _hover={{ borderColor: "var(--accent)" }}
              onClick={() => {
                setSlippage(s);
                setCustomSlippage("");
              }}
            >
              {s}%
            </Button>
          ))}
          <Input
            value={customSlippage}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || (/^\d*\.?\d*$/.test(val) && parseFloat(val) <= 50)) {
                setCustomSlippage(val);
                const num = parseFloat(val);
                if (num > 0 && num <= 50) setSlippage(num);
              }
            }}
            placeholder="Custom"
            w="58px"
            h="22px"
            px={1.5}
            fontSize="10px"
            fontFamily="mono"
            textAlign="center"
            bg={customSlippage ? "var(--accent)" : "var(--bg-elevated)"}
            color={customSlippage ? "#0b0b0f" : "var(--text-tertiary)"}
            border="1px solid"
            borderColor={customSlippage ? "var(--accent)" : "var(--border)"}
            rounded="md"
            _hover={{ borderColor: "var(--accent)" }}
            _focus={{ borderColor: "var(--accent)", boxShadow: "none" }}
            _placeholder={{ color: "var(--text-tertiary)" }}
          />
        </Flex>
      </Flex>

      {/* Token Balance */}
      {connected && (
        <Flex
          mt={3}
          pt={3}
          borderTop="1px solid"
          borderColor="var(--border)"
          justify="space-between"
          align="center"
        >
          <Text fontSize="10px" color="var(--text-tertiary)">
            Your {tokenSymbol}
          </Text>
          <Text
            fontSize="sm"
            fontWeight="600"
            fontFamily="mono"
            color="var(--text-primary)"
          >
            {parseFloat(balance).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </Text>
        </Flex>
      )}
    </Box>
  );
}
