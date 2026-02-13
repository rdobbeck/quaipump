"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useBondingCurve, type LaunchInfo } from "@/hooks/useBondingCurve";

const MAX_RESULTS = 8;

export function NavSearch() {
  const router = useRouter();
  const { getAllLaunches } = useBondingCurve();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [launches, setLaunches] = useState<LaunchInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch launches on first focus (lazy load)
  const loadLaunches = useCallback(async () => {
    if (loaded) return;
    try {
      const all = await getAllLaunches();
      setLaunches(all);
    } catch {
      // Search unavailable
    } finally {
      setLoaded(true);
    }
  }, [loaded, getAllLaunches]);

  // Filter results
  const q = query.toLowerCase().trim();
  const results =
    q.length > 0
      ? launches
          .filter(
            (l) =>
              l.name.toLowerCase().includes(q) ||
              l.symbol.toLowerCase().includes(q) ||
              l.curveAddress.toLowerCase().includes(q) ||
              l.tokenAddress.toLowerCase().includes(q)
          )
          .slice(0, MAX_RESULTS)
      : [];

  const showDropdown = open && q.length > 0;

  // Navigate to selected token
  const navigateTo = useCallback(
    (launch: LaunchInfo) => {
      router.push(`/token/${launch.curveAddress}`);
      setQuery("");
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [router]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        navigateTo(results[activeIndex]);
      } else if (results.length === 1) {
        navigateTo(results[0]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <Box ref={containerRef} position="relative" w={{ base: "100%", md: "240px" }}>
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          loadLaunches();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search tokens..."
        size="sm"
        bg="var(--bg-elevated)"
        border="1px solid"
        borderColor="var(--border)"
        color="var(--text-primary)"
        fontSize="xs"
        rounded="lg"
        _hover={{ borderColor: "var(--border-hover)" }}
        _focus={{
          borderColor: "var(--accent)",
          boxShadow: "none",
        }}
        _placeholder={{ color: "var(--text-tertiary)" }}
      />

      {showDropdown && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          bg="var(--bg-surface)"
          border="1px solid"
          borderColor="var(--border)"
          rounded="xl"
          boxShadow="0 8px 32px rgba(0,0,0,0.5)"
          zIndex={200}
          overflow="hidden"
          maxH="360px"
          overflowY="auto"
        >
          {!loaded ? (
            <Box p={3}>
              <Text fontSize="xs" color="var(--text-tertiary)" textAlign="center">
                Loading...
              </Text>
            </Box>
          ) : results.length === 0 ? (
            <Box p={3}>
              <Text fontSize="xs" color="var(--text-tertiary)" textAlign="center">
                No tokens found
              </Text>
            </Box>
          ) : (
            results.map((launch, i) => (
              <Flex
                key={launch.curveAddress}
                px={3}
                py={2.5}
                align="center"
                gap={2.5}
                cursor="pointer"
                bg={i === activeIndex ? "var(--bg-elevated)" : "transparent"}
                _hover={{ bg: "var(--bg-elevated)" }}
                onClick={() => navigateTo(launch)}
                transition="background 0.1s"
              >
                {/* Token icon */}
                {launch.imageUrl ? (
                  <Box
                    w="28px"
                    h="28px"
                    rounded="full"
                    overflow="hidden"
                    flexShrink={0}
                    bg="var(--bg-elevated)"
                  >
                    <img
                      src={launch.imageUrl}
                      alt={launch.name}
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
                    w="28px"
                    h="28px"
                    rounded="full"
                    bg="var(--accent-glow)"
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <Text
                      fontSize="10px"
                      fontWeight="700"
                      color="var(--accent)"
                    >
                      {launch.symbol.slice(0, 2)}
                    </Text>
                  </Flex>
                )}

                {/* Name + symbol */}
                <Box flex={1} minW={0}>
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color="var(--text-primary)"
                    isTruncated
                  >
                    {launch.name}
                  </Text>
                  <Text
                    fontSize="10px"
                    color="var(--text-tertiary)"
                    fontFamily="mono"
                  >
                    ${launch.symbol}
                  </Text>
                </Box>

                {/* Arrow */}
                <Text fontSize="xs" color="var(--text-tertiary)">
                  &rarr;
                </Text>
              </Flex>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
