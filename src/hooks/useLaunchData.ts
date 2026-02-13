"use client";

import { useEffect, useState, useMemo } from "react";
import { useBondingCurve, type LaunchInfo, type CurveState } from "@/hooks/useBondingCurve";
import { BONDING_FACTORY_ADDRESS, QUAI_USD_PRICE, BONDING_TOTAL_SUPPLY, NETWORK } from "@/lib/constants";
import GraduatedPoolABI from "@/lib/abi/GraduatedPool.json";

interface PlatformStats {
  totalLaunches: number;
  graduatedCount: number;
  totalQuaiLocked: number;
  totalQuaiLockedUsd: number;
}

interface UseLaunchDataReturn {
  launches: LaunchInfo[];
  curveStates: Record<string, CurveState>;
  poolReservesMap: Record<string, { quai: string; token: string }>;
  loading: boolean;
  statesLoaded: boolean;
  stats: PlatformStats;
  aboutToGraduate: LaunchInfo[];
  recentlyLaunched: LaunchInfo[];
  topMarketCap: LaunchInfo[];
}

const FEATURED_CAP = 12;

export function useLaunchData(): UseLaunchDataReturn {
  const { getAllLaunches, getCurveState } = useBondingCurve();
  const [launches, setLaunches] = useState<LaunchInfo[]>([]);
  const [curveStates, setCurveStates] = useState<Record<string, CurveState>>({});
  const [poolReservesMap, setPoolReservesMap] = useState<Record<string, { quai: string; token: string }>>({});
  const [loading, setLoading] = useState(true);
  const [statesLoaded, setStatesLoaded] = useState(false);

  // Fetch all launches once
  useEffect(() => {
    if (!BONDING_FACTORY_ADDRESS) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data = await getAllLaunches();
        if (cancelled) return;
        const reversed = [...data].reverse();
        setLaunches(reversed);

        // Fetch curve states in parallel
        const states: Record<string, CurveState> = {};
        await Promise.all(
          reversed.map(async (l) => {
            try {
              const s = await getCurveState(l.curveAddress);
              if (!cancelled) states[l.curveAddress] = s;
            } catch {}
          })
        );
        if (cancelled) return;
        setCurveStates(states);
        setStatesLoaded(true);

        // Fetch pool reserves for graduated tokens
        const quais = await import("quais");
        const provider = new quais.JsonRpcProvider(NETWORK.rpcUrl);
        const reserves: Record<string, { quai: string; token: string }> = {};
        await Promise.all(
          reversed.map(async (l) => {
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
        if (!cancelled) setPoolReservesMap(reserves);
      } catch (err) {
        console.error("Failed to load launches:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [getAllLaunches, getCurveState]);

  // Compute platform stats
  const stats = useMemo<PlatformStats>(() => {
    let graduatedCount = 0;
    let totalQuaiLocked = 0;

    for (const l of launches) {
      const s = curveStates[l.curveAddress];
      if (!s) continue;
      if (s.graduated) {
        graduatedCount++;
        const pr = poolReservesMap[l.curveAddress];
        if (pr) totalQuaiLocked += parseFloat(pr.quai);
      } else {
        totalQuaiLocked += parseFloat(s.realQuaiReserves);
      }
    }

    return {
      totalLaunches: launches.length,
      graduatedCount,
      totalQuaiLocked,
      totalQuaiLockedUsd: totalQuaiLocked * QUAI_USD_PRICE,
    };
  }, [launches, curveStates, poolReservesMap]);

  // Helper: get MCap for a launch
  const getMcap = (l: LaunchInfo): number => {
    const s = curveStates[l.curveAddress];
    if (!s) return 0;
    const pr = poolReservesMap[l.curveAddress];
    if (s.graduated && pr) {
      const t = parseFloat(pr.token);
      return t > 0 ? (parseFloat(pr.quai) / t) * QUAI_USD_PRICE * BONDING_TOTAL_SUPPLY : 0;
    }
    return parseFloat(s.currentPrice) * QUAI_USD_PRICE * BONDING_TOTAL_SUPPLY;
  };

  // About to Graduate: non-graduated, sorted by progress descending
  const aboutToGraduate = useMemo(() => {
    return launches
      .filter((l) => {
        const s = curveStates[l.curveAddress];
        return s && !s.graduated;
      })
      .sort((a, b) => {
        const pa = curveStates[a.curveAddress]?.progress ?? 0;
        const pb = curveStates[b.curveAddress]?.progress ?? 0;
        return pb - pa;
      })
      .slice(0, FEATURED_CAP);
  }, [launches, curveStates]);

  // Recently Launched: sorted by createdAt descending
  const recentlyLaunched = useMemo(() => {
    return [...launches]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, FEATURED_CAP);
  }, [launches]);

  // Top Market Cap: graduated, sorted by mcap descending
  const topMarketCap = useMemo(() => {
    return launches
      .filter((l) => {
        const s = curveStates[l.curveAddress];
        return s?.graduated;
      })
      .sort((a, b) => getMcap(b) - getMcap(a))
      .slice(0, FEATURED_CAP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launches, curveStates, poolReservesMap]);

  return {
    launches,
    curveStates,
    poolReservesMap,
    loading,
    statesLoaded,
    stats,
    aboutToGraduate,
    recentlyLaunched,
    topMarketCap,
  };
}
