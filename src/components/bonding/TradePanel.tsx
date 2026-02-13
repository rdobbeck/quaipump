"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Flex, Text, Input, Button } from "@chakra-ui/react";
import { useBondingCurve } from "@/hooks/useBondingCurve";
import { useAppState } from "@/app/store";
import { QUAI_USD_PRICE } from "@/lib/constants";

interface TradePanelProps {
  curveAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  graduated: boolean;
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
  onTrade,
}: TradePanelProps) {
  const { account } = useAppState();
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
    if (!amount || parseFloat(amount) <= 0 || graduated) {
      setQuote("");
      return;
    }
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        if (mode === "buy") {
          const q = await getBuyQuote(curveAddress, amount);
          setQuote(q);
        } else {
          const q = await getSellQuote(curveAddress, amount);
          setQuote(q);
        }
      } catch {
        setQuote("");
      } finally {
        setQuoteLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [amount, mode, curveAddress, graduated, getBuyQuote, getSellQuote]);

  const handleBuy = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      const slippageFraction = slippage / 100;
      setChunkProgress(null);
      await buyTokensChunked(
        curveAddress,
        amount,
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
    } catch (err) {
      console.error("Buy failed:", err);
      setChunkProgress(null);
    }
  }, [
    amount,
    slippage,
    curveAddress,
    tokenAddress,
    account,
    buyTokensChunked,
    getTokenBalance,
    onTrade,
  ]);

  const handleSell = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      const minQuaiOut = quote
        ? (parseFloat(quote) * (1 - slippage / 100)).toString()
        : "0";
      await sellTokens(curveAddress, amount, minQuaiOut);
      setAmount("");
      setQuote("");
      if (account) {
        const bal = await getTokenBalance(tokenAddress, account);
        setBalance(bal);
      }
      onTrade?.();
    } catch (err) {
      console.error("Sell failed:", err);
    }
  }, [
    amount,
    quote,
    slippage,
    curveAddress,
    tokenAddress,
    account,
    sellTokens,
    getTokenBalance,
    onTrade,
  ]);

  const handleSellPercent = (pct: number) => {
    const bal = parseFloat(balance);
    if (bal > 0) {
      setAmount((bal * pct / 100).toString());
    }
  };

  const isProcessing = isBuying || isSelling;
  const connected = !!account;

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
      {(quote || quoteLoading) && !graduated && (
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

      {/* Chunk Progress */}
      {chunkProgress && (
        <Box mb={3}>
          <Text fontSize="10px" color="var(--accent)" textAlign="center">
            Processing chunk {chunkProgress.current} of {chunkProgress.total}...
          </Text>
        </Box>
      )}

      {/* Action Button */}
      {graduated ? (
        <Box textAlign="center" py={2}>
          <Text fontSize="xs" color="var(--text-tertiary)">
            This token has graduated. Trade on the DEX.
          </Text>
        </Box>
      ) : !connected ? (
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
          loadingText={mode === "buy" ? "Buying..." : "Selling..."}
          isDisabled={!amount || parseFloat(amount) <= 0}
          onClick={mode === "buy" ? handleBuy : handleSell}
        >
          {mode === "buy" ? `Buy ${tokenSymbol}` : `Sell ${tokenSymbol}`}
        </Button>
      )}

      {/* Slippage */}
      <Flex mt={3} align="center" justify="space-between">
        <Text fontSize="10px" color="var(--text-tertiary)">
          Slippage
        </Text>
        <Flex gap={1}>
          {SLIPPAGE_OPTIONS.map((s) => (
            <Button
              key={s}
              size="xs"
              px={2}
              minW="auto"
              h="22px"
              fontSize="10px"
              fontFamily="mono"
              bg={slippage === s ? "var(--accent)" : "var(--bg-elevated)"}
              color={slippage === s ? "#0b0b0f" : "var(--text-tertiary)"}
              border="1px solid"
              borderColor={
                slippage === s ? "var(--accent)" : "var(--border)"
              }
              _hover={{ borderColor: "var(--accent)" }}
              onClick={() => setSlippage(s)}
            >
              {s}%
            </Button>
          ))}
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
