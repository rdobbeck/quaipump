"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Container,
  VStack,
  Box,
  Flex,
  Text,
  Link,
  Input,
  Skeleton,
  Button,
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  useBondingCurve,
  type LaunchInfo,
  type CurveState,
} from "@/hooks/useBondingCurve";
import { useAppState } from "@/app/store";
import { NETWORK, QUAI_USD_PRICE } from "@/lib/constants";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";
import BondingCurveABI from "@/lib/abi/BondingCurve.json";

interface Holding {
  launch: LaunchInfo;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  graduated: boolean;
  costBasisQuai: number;
  costBasisUsd: number;
  pnlUsd: number;
  pnlPercent: number;
}

export default function PortfolioPage() {
  const { account } = useAppState();
  const { getAllLaunches, getCurveState, getTokenBalance } = useBondingCurve();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [sortBy, setSortBy] = useState<"value" | "balance" | "name">("value");
  const [search, setSearch] = useState("");

  const fetchPortfolio = useCallback(async () => {
    if (!account) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const launches = await getAllLaunches();

      // Fetch all balances in parallel
      const balanceResults = await Promise.allSettled(
        launches.map((l) => getTokenBalance(l.tokenAddress, account))
      );

      // Filter to tokens with non-zero balance
      const heldLaunches: { launch: LaunchInfo; balance: number }[] = [];
      balanceResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          const bal = parseFloat(result.value);
          if (bal > 0.001) {
            heldLaunches.push({ launch: launches[i], balance: bal });
          }
        }
      });

      if (heldLaunches.length === 0) {
        setHoldings([]);
        setTotalValue(0);
        setLoading(false);
        return;
      }

      // Fetch curve states + prices in parallel
      const stateResults = await Promise.allSettled(
        heldLaunches.map((h) => getCurveState(h.launch.curveAddress))
      );

      const holdingsList: Holding[] = [];
      let total = 0;

      for (let i = 0; i < heldLaunches.length; i++) {
        const { launch, balance } = heldLaunches[i];
        const stateResult = stateResults[i];
        let priceQuai = 0;
        let graduated = false;

        if (stateResult.status === "fulfilled") {
          const state: CurveState = stateResult.value;
          graduated = state.graduated;

          if (state.graduated && state.pool) {
            try {
              const quais = await import("quais");
              const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
              const pool = new quais.Contract(state.pool, GraduatedPoolABI, provider);
              const [rQuai, rToken] = await Promise.all([
                pool.reserveQuai(),
                pool.reserveToken(),
              ]);
              const reserveQuai = parseFloat(quais.formatQuai(rQuai));
              const reserveToken = parseFloat(quais.formatUnits(rToken, 18));
              if (reserveToken > 0) {
                priceQuai = reserveQuai / reserveToken;
              }
            } catch {
              priceQuai = parseFloat(state.currentPrice);
            }
          } else {
            priceQuai = parseFloat(state.currentPrice);
          }
        }

        const priceUsd = priceQuai * QUAI_USD_PRICE;
        const valueUsd = priceUsd * balance;
        total += valueUsd;

        // Estimate cost basis from buy events
        let costBasisQuai = 0;
        try {
          const quais = await import("quais");
          const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
          const curve = new quais.Contract(launch.curveAddress, BondingCurveABI, provider);
          const currentBlock = await provider.getBlockNumber(quais.Shard.Cyprus1);
          const buyFilter = curve.filters.TokensPurchased(account);
          const buyEvents = await curve.queryFilter(buyFilter, Math.max(0, currentBlock - 10000), currentBlock);
          for (const ev of buyEvents) {
            const log = ev as unknown as { args: [string, bigint, bigint, bigint] };
            costBasisQuai += parseFloat(quais.formatQuai(log.args[1]));
          }
        } catch {}
        const costBasisUsd = costBasisQuai * QUAI_USD_PRICE;
        const pnlUsd = valueUsd - costBasisUsd;
        const pnlPercent = costBasisUsd > 0 ? ((valueUsd - costBasisUsd) / costBasisUsd) * 100 : 0;

        holdingsList.push({ launch, balance, priceUsd, valueUsd, graduated, costBasisQuai, costBasisUsd, pnlUsd, pnlPercent });
      }

      // Sort by value descending
      holdingsList.sort((a, b) => b.valueUsd - a.valueUsd);
      setHoldings(holdingsList);
      setTotalValue(total);
    } catch {
      // Portfolio fetch failed
    } finally {
      setLoading(false);
    }
  }, [account, getAllLaunches, getCurveState, getTokenBalance]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const filteredHoldings = useMemo(() => {
    let list = [...holdings];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (h) =>
          h.launch.name.toLowerCase().includes(q) ||
          h.launch.symbol.toLowerCase().includes(q)
      );
    }
    if (sortBy === "value") list.sort((a, b) => b.valueUsd - a.valueUsd);
    else if (sortBy === "balance") list.sort((a, b) => b.balance - a.balance);
    else if (sortBy === "name") list.sort((a, b) => a.launch.name.localeCompare(b.launch.name));
    return list;
  }, [holdings, search, sortBy]);

  const formatBalance = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    if (n < 1) return n.toFixed(4);
    return n.toFixed(2);
  };

  if (!account) {
    return (
      <Container maxW="container.xl" py={8}>
        <Flex
          h="300px"
          align="center"
          justify="center"
          bg="var(--bg-surface)"
          border="1px solid"
          borderColor="var(--border)"
          rounded="xl"
        >
          <Text color="var(--text-tertiary)" fontSize="sm">
            Connect your wallet to view your portfolio
          </Text>
        </Flex>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="700" color="var(--text-primary)">
            Portfolio
          </Text>
          {!loading && holdings.length > 0 && (() => {
            const totalCost = holdings.reduce((s, h) => s + h.costBasisUsd, 0);
            const totalPnl = totalValue - totalCost;
            const totalPnlPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
            return (
              <Flex align="center" gap={3}>
                <Box
                  bg="var(--bg-surface)"
                  border="1px solid"
                  borderColor="var(--border)"
                  rounded="lg"
                  px={4}
                  py={2}
                >
                  <Text fontSize="10px" color="var(--text-tertiary)" mb={0.5}>
                    Total Value
                  </Text>
                  <Text fontSize="md" fontWeight="700" fontFamily="mono" color="var(--accent)">
                    ${totalValue.toFixed(2)}
                  </Text>
                </Box>
                {totalCost > 0 && (
                  <Box
                    bg="var(--bg-surface)"
                    border="1px solid"
                    borderColor="var(--border)"
                    rounded="lg"
                    px={4}
                    py={2}
                  >
                    <Text fontSize="10px" color="var(--text-tertiary)" mb={0.5}>
                      Total PnL
                    </Text>
                    <Text
                      fontSize="md"
                      fontWeight="700"
                      fontFamily="mono"
                      color={totalPnl >= 0 ? "var(--accent)" : "var(--sell)"}
                    >
                      {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%)
                    </Text>
                  </Box>
                )}
              </Flex>
            );
          })()}
        </Flex>

        {/* Sort & Search controls */}
        {!loading && holdings.length > 0 && (
          <Flex gap={3} align="center" flexWrap="wrap">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search holdings..."
              size="sm"
              maxW="220px"
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              color="var(--text-primary)"
              fontSize="xs"
              rounded="lg"
              _hover={{ borderColor: "var(--border-hover)" }}
              _focus={{ borderColor: "var(--accent)", boxShadow: "none" }}
              _placeholder={{ color: "var(--text-tertiary)" }}
            />
            <Flex gap={1}>
              {(["value", "balance", "name"] as const).map((s) => (
                <Button
                  key={s}
                  size="xs"
                  px={3}
                  fontSize="10px"
                  textTransform="capitalize"
                  bg={sortBy === s ? "var(--accent)" : "var(--bg-elevated)"}
                  color={sortBy === s ? "#0b0b0f" : "var(--text-secondary)"}
                  border="1px solid"
                  borderColor={sortBy === s ? "var(--accent)" : "var(--border)"}
                  _hover={{ borderColor: "var(--accent)" }}
                  onClick={() => setSortBy(s)}
                >
                  {s}
                </Button>
              ))}
            </Flex>
          </Flex>
        )}

        {loading ? (
          <VStack spacing={2} align="stretch">
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                h="64px"
                rounded="xl"
                startColor="var(--bg-surface)"
                endColor="var(--bg-elevated)"
              />
            ))}
          </VStack>
        ) : filteredHoldings.length === 0 ? (
          <Flex
            h="200px"
            align="center"
            justify="center"
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            rounded="xl"
          >
            <Text color="var(--text-tertiary)" fontSize="sm">
              No token holdings found
            </Text>
          </Flex>
        ) : (
          <Box
            bg="var(--bg-surface)"
            border="1px solid"
            borderColor="var(--border)"
            rounded="xl"
            overflow="hidden"
          >
            {/* Table header */}
            <Flex
              px={4}
              py={2.5}
              fontSize="9px"
              color="var(--text-tertiary)"
              textTransform="uppercase"
              letterSpacing="0.5px"
              borderBottom="1px solid"
              borderColor="var(--border)"
            >
              <Text flex={1}>Token</Text>
              <Text flex="0 0 100px" textAlign="right">Balance</Text>
              <Text flex="0 0 90px" textAlign="right">Price</Text>
              <Text flex="0 0 90px" textAlign="right">Value</Text>
              <Text flex="0 0 100px" textAlign="right" display={{ base: "none", md: "block" }}>PnL</Text>
            </Flex>

            {/* Rows */}
            {filteredHoldings.map((h) => (
              <Link
                key={h.launch.curveAddress}
                as={NextLink}
                href={`/token/${h.launch.curveAddress}`}
                _hover={{ textDecoration: "none" }}
                display="block"
              >
                <Flex
                  px={4}
                  py={3}
                  align="center"
                  borderBottom="1px solid"
                  borderColor="var(--border)"
                  _hover={{ bg: "var(--bg-elevated)" }}
                  transition="background 0.1s"
                  _last={{ borderBottom: "none" }}
                >
                  {/* Token info */}
                  <Flex flex={1} align="center" gap={3} minW={0}>
                    {h.launch.imageUrl ? (
                      <Box
                        w="32px"
                        h="32px"
                        rounded="full"
                        overflow="hidden"
                        flexShrink={0}
                        bg="var(--bg-elevated)"
                      >
                        <img
                          src={h.launch.imageUrl}
                          alt={h.launch.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </Box>
                    ) : (
                      <Flex
                        w="32px"
                        h="32px"
                        rounded="full"
                        bg={
                          h.graduated
                            ? "rgba(255,215,0,0.15)"
                            : "var(--accent-glow)"
                        }
                        align="center"
                        justify="center"
                        flexShrink={0}
                      >
                        <Text
                          fontSize="10px"
                          fontWeight="700"
                          color={h.graduated ? "#ffd700" : "var(--accent)"}
                        >
                          {h.launch.symbol.slice(0, 2)}
                        </Text>
                      </Flex>
                    )}
                    <Box minW={0}>
                      <Flex align="center" gap={2}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="var(--text-primary)"
                          isTruncated
                        >
                          {h.launch.name}
                        </Text>
                        {h.graduated && (
                          <Box
                            bg="rgba(255,215,0,0.15)"
                            color="#ffd700"
                            px={1.5}
                            py={0}
                            rounded="md"
                            fontSize="9px"
                            fontWeight="600"
                            flexShrink={0}
                          >
                            GRAD
                          </Box>
                        )}
                      </Flex>
                      <Text
                        fontSize="10px"
                        color="var(--text-tertiary)"
                        fontFamily="mono"
                      >
                        ${h.launch.symbol}
                      </Text>
                    </Box>
                  </Flex>

                  {/* Balance */}
                  <Text
                    flex="0 0 100px"
                    textAlign="right"
                    fontFamily="mono"
                    fontSize="sm"
                    color="var(--text-primary)"
                  >
                    {formatBalance(h.balance)}
                  </Text>

                  {/* Price */}
                  <Text
                    flex="0 0 90px"
                    textAlign="right"
                    fontFamily="mono"
                    fontSize="xs"
                    color="var(--text-secondary)"
                  >
                    ${h.priceUsd > 0 ? h.priceUsd.toExponential(2) : "0.00"}
                  </Text>

                  {/* Value */}
                  <Text
                    flex="0 0 90px"
                    textAlign="right"
                    fontFamily="mono"
                    fontSize="sm"
                    fontWeight="600"
                    color="var(--accent)"
                  >
                    ${h.valueUsd.toFixed(2)}
                  </Text>

                  {/* PnL */}
                  <Box
                    flex="0 0 100px"
                    textAlign="right"
                    display={{ base: "none", md: "block" }}
                  >
                    {h.costBasisUsd > 0 ? (
                      <>
                        <Text
                          fontFamily="mono"
                          fontSize="xs"
                          fontWeight="600"
                          color={h.pnlUsd >= 0 ? "var(--accent)" : "var(--sell)"}
                        >
                          {h.pnlUsd >= 0 ? "+" : ""}{h.pnlUsd.toFixed(2)}
                        </Text>
                        <Text
                          fontFamily="mono"
                          fontSize="10px"
                          color={h.pnlPercent >= 0 ? "var(--accent)" : "var(--sell)"}
                        >
                          {h.pnlPercent >= 0 ? "+" : ""}{h.pnlPercent.toFixed(1)}%
                        </Text>
                      </>
                    ) : (
                      <Text fontSize="10px" color="var(--text-tertiary)">--</Text>
                    )}
                  </Box>
                </Flex>
              </Link>
            ))}
          </Box>
        )}
      </VStack>
    </Container>
  );
}
