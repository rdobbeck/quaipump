"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Box, Flex, Text } from "@chakra-ui/react";
import {
  useBondingCurve,
  type LaunchInfo,
  type CurveState,
} from "@/hooks/useBondingCurve";
import { NETWORK, QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY } from "@/lib/constants";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

export default function EmbedPage() {
  const params = useParams<{ address: string }>();
  const address = params.address;
  const { getAllLaunches, getCurveState } = useBondingCurve();

  const [launch, setLaunch] = useState<LaunchInfo | null>(null);
  const [curveState, setCurveState] = useState<CurveState | null>(null);
  const [poolReserves, setPoolReserves] = useState<{ quai: string; token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!address) return;
    try {
      const launches = await getAllLaunches();
      const found = launches.find(
        (l) => l.curveAddress.toLowerCase() === address.toLowerCase()
      );
      if (!found) return;
      setLaunch(found);

      const state = await getCurveState(found.curveAddress);
      setCurveState(state);

      if (state.graduated && state.pool) {
        try {
          const quais = await import("quais");
          const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: false });
          const pool = new quais.Contract(state.pool, GraduatedPoolABI, provider);
          const [rQuai, rToken] = await Promise.all([
            pool.reserveQuai(),
            pool.reserveToken(),
          ]);
          setPoolReserves({
            quai: quais.formatQuai(rQuai),
            token: quais.formatUnits(rToken, 18),
          });
        } catch {}
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [address, getAllLaunches, getCurveState]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Box
        w="100%"
        maxW="400px"
        mx="auto"
        p={4}
        bg="#0b0b0f"
        rounded="xl"
        border="1px solid #1a1a2e"
      >
        <Box className="skeleton-shimmer" h="80px" rounded="lg" />
      </Box>
    );
  }

  if (!launch) {
    return (
      <Flex
        w="100%"
        maxW="400px"
        mx="auto"
        h="80px"
        align="center"
        justify="center"
        bg="#0b0b0f"
        rounded="xl"
        border="1px solid #1a1a2e"
      >
        <Text color="#555" fontSize="xs">Token not found</Text>
      </Flex>
    );
  }

  const graduated = curveState?.graduated ?? false;
  const priceQuai =
    graduated && poolReserves && parseFloat(poolReserves.token) > 0
      ? parseFloat(poolReserves.quai) / parseFloat(poolReserves.token)
      : curveState
      ? parseFloat(curveState.currentPrice)
      : 0;
  const priceUsd = priceQuai * QUAI_USD_PRICE;
  const mcapUsd = priceUsd * BONDING_TOTAL_SUPPLY;
  const progress = curveState?.progress ?? 0;

  return (
    <Box
      w="100%"
      maxW="400px"
      mx="auto"
      bg="#0b0b0f"
      rounded="xl"
      border="1px solid #1a1a2e"
      overflow="hidden"
      fontFamily="'Inter', system-ui, sans-serif"
      cursor="pointer"
      onClick={() => {
        window.open(`${window.location.origin}/token/${address}`, "_blank");
      }}
      _hover={{ borderColor: "#00e676" }}
      transition="border-color 0.2s"
    >
      {/* Header */}
      <Flex p={4} gap={3} align="center">
        {launch.imageUrl ? (
          <Box
            w="40px"
            h="40px"
            rounded="full"
            overflow="hidden"
            flexShrink={0}
            bg="#14141f"
          >
            <img
              src={launch.imageUrl}
              alt={launch.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </Box>
        ) : (
          <Flex
            w="40px"
            h="40px"
            rounded="full"
            bg={graduated ? "rgba(255,215,0,0.15)" : "rgba(0,230,118,0.08)"}
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Text
              fontSize="sm"
              fontWeight="700"
              color={graduated ? "#ffd700" : "#00e676"}
            >
              {launch.symbol.slice(0, 2)}
            </Text>
          </Flex>
        )}

        <Box flex={1} minW={0}>
          <Flex gap={2} align="center">
            <Text
              fontSize="md"
              fontWeight="700"
              color="#e0e0e0"
              isTruncated
            >
              {launch.name}
            </Text>
            <Text
              fontSize="10px"
              fontFamily="mono"
              color="#888"
            >
              ${launch.symbol}
            </Text>
            {graduated && (
              <Box
                bg="rgba(255,215,0,0.15)"
                color="#ffd700"
                px={1.5}
                rounded="md"
                fontSize="9px"
                fontWeight="600"
              >
                GRAD
              </Box>
            )}
          </Flex>
          <Text
            fontSize="sm"
            fontWeight="600"
            fontFamily="mono"
            color="#00e676"
            mt={0.5}
          >
            ${priceUsd > 0 ? priceUsd.toExponential(2) : "0.00"}
          </Text>
        </Box>
      </Flex>

      {/* Stats row */}
      <Flex
        px={4}
        pb={3}
        gap={4}
        fontSize="10px"
      >
        <Box>
          <Text color="#666" textTransform="uppercase" mb={0.5}>MCap</Text>
          <Text color="#aaa" fontFamily="mono" fontWeight="600">
            ${mcapUsd > 1 ? mcapUsd.toFixed(2) : mcapUsd.toFixed(4)}
          </Text>
        </Box>
        <Box>
          <Text color="#666" textTransform="uppercase" mb={0.5}>Progress</Text>
          <Text color={graduated ? "#ffd700" : "#aaa"} fontFamily="mono" fontWeight="600">
            {graduated ? "100%" : `${(progress / 100).toFixed(1)}%`}
          </Text>
        </Box>
        {curveState && (
          <Box>
            <Text color="#666" textTransform="uppercase" mb={0.5}>Liquidity</Text>
            <Text color="#aaa" fontFamily="mono" fontWeight="600">
              {parseFloat(curveState.realQuaiReserves).toFixed(2)} QUAI
            </Text>
          </Box>
        )}
      </Flex>

      {/* Progress bar */}
      {!graduated && (
        <Box px={4} pb={3}>
          <Box h="3px" bg="#1a1a2e" rounded="full" overflow="hidden">
            <Box
              h="100%"
              w={`${progress / 100}%`}
              bg="#00e676"
              rounded="full"
            />
          </Box>
        </Box>
      )}

      {/* Footer */}
      <Flex
        px={4}
        py={2}
        bg="#08080d"
        borderTop="1px solid #1a1a2e"
        justify="space-between"
        align="center"
      >
        <Text fontSize="9px" color="#555">
          QuaiPump
        </Text>
        <Text fontSize="9px" color="#555">
          Trade on Quai Network
        </Text>
      </Flex>
    </Box>
  );
}
