"use client";

import { useEffect, useState } from "react";
import { Box, Container } from "@chakra-ui/react";
import { useBondingCurve, type LaunchInfo } from "@/hooks/useBondingCurve";
import { BondingTokenList } from "@/components/bonding/BondingTokenList";
import { LiveTradeFeed } from "@/components/bonding/LiveTradeFeed";
import { BONDING_FACTORY_ADDRESS } from "@/lib/constants";

export default function HomePage() {
  const { getAllLaunches } = useBondingCurve();
  const [launches, setLaunches] = useState<LaunchInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!BONDING_FACTORY_ADDRESS) {
      setLoading(false);
      return;
    }
    getAllLaunches()
      .then((data) => {
        setLaunches([...data].reverse());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getAllLaunches]);

  return (
    <Box minH="calc(100vh - 120px)">
      <Container maxW="container.xl" py={6}>
        <LiveTradeFeed launches={launches} />
        <BondingTokenList launches={launches} loading={loading} />
      </Container>
    </Box>
  );
}
