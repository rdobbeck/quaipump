"use client";

import { useState, useMemo, useEffect } from "react";
import {
  SimpleGrid,
  Text,
  VStack,
  Box,
  HStack,
  Button,
  Flex,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { type LaunchInfo, type CurveState, useBondingCurve } from "@/hooks/useBondingCurve";
import { BondingTokenCard } from "./BondingTokenCard";
import { QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY, NETWORK } from "@/lib/constants";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

type ViewMode = "columns" | "grid";
type SortOption = "newest" | "progress" | "mcap" | "liquidity";
type FilterStatus = "all" | "active" | "graduating" | "graduated";

interface BondingTokenListProps {
  launches: LaunchInfo[];
  loading: boolean;
  curveStates?: Record<string, CurveState>;
  poolReservesMap?: Record<string, { quai: string; token: string }>;
}

function ColumnHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <Flex
      justify="space-between"
      align="center"
      mb={3}
      pb={2}
      borderBottom="1px solid"
      borderColor="var(--border)"
    >
      <HStack spacing={2}>
        <Box w="8px" h="8px" rounded="full" bg={color} />
        <Text fontSize="sm" fontWeight="600" color="var(--text-primary)">
          {title}
        </Text>
      </HStack>
      <Box
        bg="var(--bg-elevated)"
        px={2}
        py={0.5}
        rounded="full"
        fontSize="xs"
        color="var(--text-secondary)"
      >
        {count}
      </Box>
    </Flex>
  );
}

function ColumnSkeleton() {
  return (
    <VStack spacing={3} align="stretch">
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          bg="var(--bg-surface)"
          p={4}
          rounded="xl"
          border="1px solid"
          borderColor="var(--border)"
        >
          <VStack spacing={3} align="stretch">
            <Box className="skeleton-shimmer" h="18px" w="60%" />
            <Box className="skeleton-shimmer" h="14px" w="80%" />
            <Box className="skeleton-shimmer" h="14px" w="40%" />
            <Box className="skeleton-shimmer" h="6px" w="100%" />
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

const GRID_PAGE_SIZE = 24;
const COLUMN_PAGE_SIZE = 8;

const FILTER_OPTIONS: { value: FilterStatus; label: string; color: string }[] = [
  { value: "all", label: "All", color: "var(--text-primary)" },
  { value: "active", label: "Active", color: "var(--accent)" },
  { value: "graduating", label: "Graduating", color: "#ff9800" },
  { value: "graduated", label: "Graduated", color: "#ffd700" },
];

export function BondingTokenList({
  launches,
  loading,
  curveStates: externalCurveStates,
  poolReservesMap: externalPoolReservesMap,
}: BondingTokenListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("columns");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [gridPage, setGridPage] = useState(0);
  const [columnLimits, setColumnLimits] = useState({ active: COLUMN_PAGE_SIZE, graduating: COLUMN_PAGE_SIZE, graduated: COLUMN_PAGE_SIZE });
  const [internalCurveStates, setInternalCurveStates] = useState<Record<string, CurveState>>({});
  const [internalPoolReservesMap, setInternalPoolReservesMap] = useState<Record<string, { quai: string; token: string }>>({});
  const [statesLoaded, setStatesLoaded] = useState(false);
  const { getCurveState } = useBondingCurve();

  // Use external data if provided, otherwise use internal
  const curveStates = externalCurveStates ?? internalCurveStates;
  const poolReservesMap = externalPoolReservesMap ?? internalPoolReservesMap;

  // Fetch curve states and pool reserves only when external data is NOT provided
  useEffect(() => {
    if (externalCurveStates) {
      setStatesLoaded(true);
      return;
    }
    if (launches.length === 0) return;
    let cancelled = false;
    const fetchStates = async () => {
      const states: Record<string, CurveState> = {};
      await Promise.all(
        launches.map(async (l) => {
          try {
            const s = await getCurveState(l.curveAddress);
            if (!cancelled) states[l.curveAddress] = s;
          } catch {}
        })
      );
      if (cancelled) return;
      setInternalCurveStates(states);
      setStatesLoaded(true);

      // Fetch pool reserves for graduated tokens
      const quais = await import("quais");
      const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
      const reserves: Record<string, { quai: string; token: string }> = {};
      await Promise.all(
        launches.map(async (l) => {
          const s = states[l.curveAddress];
          if (!s?.graduated || !s.pool) return;
          try {
            const pool = new quais.Contract(s.pool, GraduatedPoolABI, provider);
            const [rQuai, rToken] = await Promise.all([
              pool.reserveQuai(),
              pool.reserveToken(),
            ]);
            if (!cancelled) {
              reserves[l.curveAddress] = {
                quai: quais.formatQuai(rQuai),
                token: quais.formatUnits(rToken, 18),
              };
            }
          } catch {}
        })
      );
      if (!cancelled) setInternalPoolReservesMap(reserves);
    };
    fetchStates();
    return () => { cancelled = true; };
  }, [launches, getCurveState, externalCurveStates]);

  // Mark states loaded when external pool reserves change
  useEffect(() => {
    if (externalPoolReservesMap) {
      setStatesLoaded(true);
    }
  }, [externalPoolReservesMap]);

  // Helper: get QUAI liquidity for a launch
  const getLiquidity = (addr: string): number => {
    const s = curveStates[addr];
    if (!s) return 0;
    const pr = poolReservesMap[addr];
    if (s.graduated && pr) return parseFloat(pr.quai);
    return parseFloat(s.realQuaiReserves);
  };

  // Helper: get MCap for a launch
  const getMcap = (addr: string): number => {
    const s = curveStates[addr];
    if (!s) return 0;
    const pr = poolReservesMap[addr];
    if (s.graduated && pr) {
      const t = parseFloat(pr.token);
      return t > 0 ? (parseFloat(pr.quai) / t) * QUAI_USD_PRICE * BONDING_TOTAL_SUPPLY : 0;
    }
    return parseFloat(s.currentPrice) * QUAI_USD_PRICE * BONDING_TOTAL_SUPPLY;
  };

  // Helper: get status category for a launch
  const getCategory = (addr: string): "active" | "graduating" | "graduated" => {
    const s = curveStates[addr];
    if (!s) return "active";
    if (s.graduated) return "graduated";
    if (s.progress / 100 >= 50) return "graduating";
    return "active";
  };

  // Text search filter
  const textFiltered = useMemo(() => {
    if (!searchQuery.trim()) return launches;
    const q = searchQuery.toLowerCase().trim();
    return launches.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.symbol.toLowerCase().includes(q) ||
        l.creator.toLowerCase().includes(q)
    );
  }, [launches, searchQuery]);

  // Status filter
  const statusFiltered = useMemo(() => {
    if (filterStatus === "all") return textFiltered;
    return textFiltered.filter((l) => getCategory(l.curveAddress) === filterStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textFiltered, filterStatus, curveStates]);

  // Sort function
  const sortLaunches = useMemo(() => {
    return (items: LaunchInfo[]) => {
      const sorted = [...items];
      switch (sortBy) {
        case "newest":
          return sorted.sort((a, b) => b.createdAt - a.createdAt);
        case "progress":
          return sorted.sort((a, b) => {
            const pa = curveStates[a.curveAddress]?.progress ?? 0;
            const pb = curveStates[b.curveAddress]?.progress ?? 0;
            return pb - pa;
          });
        case "mcap":
          return sorted.sort((a, b) => getMcap(b.curveAddress) - getMcap(a.curveAddress));
        case "liquidity":
          return sorted.sort((a, b) => getLiquidity(b.curveAddress) - getLiquidity(a.curveAddress));
        default:
          return sorted;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, curveStates, poolReservesMap]);

  // Categorize tokens into three columns
  const { newTokens, graduating, graduated } = useMemo(() => {
    const newTokens: LaunchInfo[] = [];
    const graduating: LaunchInfo[] = [];
    const graduated: LaunchInfo[] = [];

    for (const l of textFiltered) {
      const cat = getCategory(l.curveAddress);
      if (cat === "graduated") graduated.push(l);
      else if (cat === "graduating") graduating.push(l);
      else newTokens.push(l);
    }

    return {
      newTokens: sortLaunches(newTokens),
      graduating: sortLaunches(graduating),
      graduated: sortLaunches(graduated),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textFiltered, curveStates, sortLaunches]);

  // Grid view: flat sorted list with all filters applied
  const allSorted = useMemo(() => sortLaunches(statusFiltered), [statusFiltered, sortLaunches]);

  // Reset pagination when filters/sort/search change
  useEffect(() => {
    setGridPage(0);
    setColumnLimits({ active: COLUMN_PAGE_SIZE, graduating: COLUMN_PAGE_SIZE, graduated: COLUMN_PAGE_SIZE });
  }, [sortBy, filterStatus, searchQuery]);

  // Grid pagination
  const gridTotalPages = Math.max(1, Math.ceil(allSorted.length / GRID_PAGE_SIZE));
  const gridPageItems = useMemo(
    () => allSorted.slice(gridPage * GRID_PAGE_SIZE, (gridPage + 1) * GRID_PAGE_SIZE),
    [allSorted, gridPage]
  );

  // Status counts
  const counts = useMemo(() => {
    let active = 0, grad = 0, graduating2 = 0;
    for (const l of textFiltered) {
      const cat = getCategory(l.curveAddress);
      if (cat === "graduated") grad++;
      else if (cat === "graduating") graduating2++;
      else active++;
    }
    return { all: textFiltered.length, active, graduating: graduating2, graduated: grad };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textFiltered, curveStates]);

  if (loading) {
    return (
      <VStack spacing={4}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
          <Box><ColumnHeader title="New Creations" count={0} color="var(--accent)" /><ColumnSkeleton /></Box>
          <Box><ColumnHeader title="About to Graduate" count={0} color="#ff9800" /><ColumnSkeleton /></Box>
          <Box><ColumnHeader title="Graduated" count={0} color="#ffd700" /><ColumnSkeleton /></Box>
        </SimpleGrid>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Controls bar */}
      <Flex
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap={3}
      >
        {/* Left: View mode + Filter pills */}
        <HStack spacing={3} flexWrap="wrap">
          <HStack spacing={1} bg="var(--bg-elevated)" p={1} rounded="lg">
            <Button
              size="xs"
              px={3}
              rounded="md"
              bg={viewMode === "columns" ? "var(--accent)" : "transparent"}
              color={viewMode === "columns" ? "var(--bg-primary)" : "var(--text-secondary)"}
              _hover={{ bg: viewMode === "columns" ? "var(--accent-hover)" : "var(--bg-surface)" }}
              onClick={() => setViewMode("columns")}
            >
              Columns
            </Button>
            <Button
              size="xs"
              px={3}
              rounded="md"
              bg={viewMode === "grid" ? "var(--accent)" : "transparent"}
              color={viewMode === "grid" ? "var(--bg-primary)" : "var(--text-secondary)"}
              _hover={{ bg: viewMode === "grid" ? "var(--accent-hover)" : "var(--bg-surface)" }}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </Button>
          </HStack>

          {viewMode === "grid" && (
            <HStack spacing={1} bg="var(--bg-elevated)" p={1} rounded="lg">
              {FILTER_OPTIONS.map((opt) => {
                const isActive = filterStatus === opt.value;
                const count = counts[opt.value];
                return (
                  <Button
                    key={opt.value}
                    size="xs"
                    px={2.5}
                    rounded="md"
                    bg={isActive ? "var(--bg-surface)" : "transparent"}
                    color={isActive ? opt.color : "var(--text-tertiary)"}
                    border={isActive ? "1px solid" : "1px solid transparent"}
                    borderColor={isActive ? "var(--border)" : "transparent"}
                    _hover={{
                      color: opt.color,
                      bg: isActive ? "var(--bg-surface)" : "rgba(255,255,255,0.03)",
                    }}
                    onClick={() => setFilterStatus(opt.value)}
                    fontWeight={isActive ? "600" : "500"}
                  >
                    {opt.label}
                    {statesLoaded && (
                      <Box
                        as="span"
                        ml={1.5}
                        fontSize="10px"
                        color="var(--text-tertiary)"
                        fontWeight="400"
                      >
                        {count}
                      </Box>
                    )}
                  </Button>
                );
              })}
            </HStack>
          )}
        </HStack>

        {/* Right: Search + Sort */}
        <HStack spacing={3}>
          <InputGroup size="xs" w="160px">
            <InputLeftElement pointerEvents="none" h="full">
              <Text color="var(--text-tertiary)" fontSize="xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </Text>
            </InputLeftElement>
            <Input
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="lg"
              color="var(--text-primary)"
              fontSize="xs"
              _placeholder={{ color: "var(--text-tertiary)" }}
              _hover={{ borderColor: "var(--border-hover)" }}
              _focus={{
                borderColor: "var(--accent)",
                boxShadow: "0 0 0 1px var(--accent)",
              }}
            />
          </InputGroup>

          <HStack spacing={2}>
            <Text fontSize="xs" color="var(--text-secondary)" display={{ base: "none", sm: "block" }}>Sort:</Text>
            <Select
              size="xs"
              w="150px"
              rounded="lg"
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              color="var(--text-primary)"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="newest">Newest First</option>
              <option value="progress">Most Progress</option>
              <option value="mcap">Highest MCap</option>
              <option value="liquidity">Most Liquidity</option>
            </Select>
          </HStack>
        </HStack>
      </Flex>

      {/* Results count when filtering */}
      {(searchQuery.trim() || filterStatus !== "all") && (
        <Text fontSize="xs" color="var(--text-tertiary)">
          Showing {viewMode === "grid" ? allSorted.length : textFiltered.length} of {launches.length} tokens
          {searchQuery.trim() && (
            <Box as="span"> matching &quot;{searchQuery.trim()}&quot;</Box>
          )}
        </Text>
      )}

      {launches.length === 0 ? (
        <VStack spacing={2} py={12}>
          <Text color="var(--text-secondary)" fontSize="md">
            No tokens found
          </Text>
          <Text color="var(--text-tertiary)" fontSize="sm">
            Be the first to launch a bonding curve token!
          </Text>
        </VStack>
      ) : viewMode === "columns" ? (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Box>
            <ColumnHeader title="New Creations" count={newTokens.length} color="var(--accent)" />
            <VStack spacing={3} align="stretch">
              {newTokens.length === 0 ? (
                <Text color="var(--text-tertiary)" fontSize="sm" textAlign="center" py={4}>
                  No new tokens
                </Text>
              ) : (
                <>
                  {newTokens.slice(0, columnLimits.active).map((l) => (
                    <BondingTokenCard key={l.launchId} launch={l} curveState={curveStates[l.curveAddress]} poolReserves={poolReservesMap[l.curveAddress]} />
                  ))}
                  {newTokens.length > columnLimits.active && (
                    <ShowMoreButton
                      remaining={newTokens.length - columnLimits.active}
                      onClick={() => setColumnLimits((prev) => ({ ...prev, active: prev.active + COLUMN_PAGE_SIZE }))}
                    />
                  )}
                </>
              )}
            </VStack>
          </Box>

          <Box>
            <ColumnHeader title="About to Graduate" count={graduating.length} color="#ff9800" />
            <VStack spacing={3} align="stretch">
              {graduating.length === 0 ? (
                <Text color="var(--text-tertiary)" fontSize="sm" textAlign="center" py={4}>
                  No graduating tokens
                </Text>
              ) : (
                <>
                  {graduating.slice(0, columnLimits.graduating).map((l) => (
                    <BondingTokenCard key={l.launchId} launch={l} curveState={curveStates[l.curveAddress]} poolReserves={poolReservesMap[l.curveAddress]} />
                  ))}
                  {graduating.length > columnLimits.graduating && (
                    <ShowMoreButton
                      remaining={graduating.length - columnLimits.graduating}
                      onClick={() => setColumnLimits((prev) => ({ ...prev, graduating: prev.graduating + COLUMN_PAGE_SIZE }))}
                    />
                  )}
                </>
              )}
            </VStack>
          </Box>

          <Box>
            <ColumnHeader title="Graduated" count={graduated.length} color="#ffd700" />
            <VStack spacing={3} align="stretch">
              {graduated.length === 0 ? (
                <Text color="var(--text-tertiary)" fontSize="sm" textAlign="center" py={4}>
                  No graduated tokens yet
                </Text>
              ) : (
                <>
                  {graduated.slice(0, columnLimits.graduated).map((l) => (
                    <BondingTokenCard key={l.launchId} launch={l} curveState={curveStates[l.curveAddress]} poolReserves={poolReservesMap[l.curveAddress]} />
                  ))}
                  {graduated.length > columnLimits.graduated && (
                    <ShowMoreButton
                      remaining={graduated.length - columnLimits.graduated}
                      onClick={() => setColumnLimits((prev) => ({ ...prev, graduated: prev.graduated + COLUMN_PAGE_SIZE }))}
                    />
                  )}
                </>
              )}
            </VStack>
          </Box>
        </SimpleGrid>
      ) : allSorted.length === 0 ? (
        <VStack spacing={2} py={12}>
          <Text color="var(--text-secondary)" fontSize="md">
            No tokens match your filters
          </Text>
          <Text color="var(--text-tertiary)" fontSize="sm">
            Try adjusting your search or filter criteria.
          </Text>
        </VStack>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={4}>
            {gridPageItems.map((launch) => (
              <BondingTokenCard key={launch.launchId} launch={launch} curveState={curveStates[launch.curveAddress]} poolReserves={poolReservesMap[launch.curveAddress]} />
            ))}
          </SimpleGrid>

          {gridTotalPages > 1 && (
            <Flex justify="center" align="center" gap={3} pt={2}>
              <Button
                size="xs"
                px={3}
                rounded="lg"
                bg="var(--bg-elevated)"
                color="var(--text-secondary)"
                border="1px solid"
                borderColor="var(--border)"
                _hover={{ borderColor: "var(--border-hover)", color: "var(--text-primary)" }}
                onClick={() => { setGridPage((p) => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                isDisabled={gridPage === 0}
              >
                Prev
              </Button>
              <Text fontSize="xs" color="var(--text-secondary)" fontFamily="mono">
                {gridPage + 1} / {gridTotalPages}
              </Text>
              <Button
                size="xs"
                px={3}
                rounded="lg"
                bg="var(--bg-elevated)"
                color="var(--text-secondary)"
                border="1px solid"
                borderColor="var(--border)"
                _hover={{ borderColor: "var(--border-hover)", color: "var(--text-primary)" }}
                onClick={() => { setGridPage((p) => Math.min(gridTotalPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                isDisabled={gridPage >= gridTotalPages - 1}
              >
                Next
              </Button>
            </Flex>
          )}
        </>
      )}
    </VStack>
  );
}

function ShowMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <Button
      size="xs"
      w="full"
      bg="var(--bg-elevated)"
      color="var(--text-secondary)"
      border="1px solid"
      borderColor="var(--border)"
      _hover={{ borderColor: "var(--border-hover)", color: "var(--text-primary)" }}
      rounded="lg"
      onClick={onClick}
      fontWeight="500"
    >
      Show more ({remaining})
    </Button>
  );
}
