"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/app/store";
import { NETWORK, WQI_POOL_ADDRESS, WQI_ENABLED } from "@/lib/constants";
import WqiPoolABI from "@/lib/abi/WqiPool.json";

export interface WqiRate {
  quaiPerWqi: number;
  wqiPerQuai: number;
  reserveQuai: string;
  reserveWqi: string;
}

export function useWqiRate() {
  const { rpcProvider } = useAppState();
  const [rate, setRate] = useState<WqiRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = useCallback(async (): Promise<WqiRate | null> => {
    if (!WQI_ENABLED) return null;

    const quais = await import("quais");
    const provider =
      (rpcProvider as InstanceType<typeof quais.JsonRpcProvider>) ||
      new quais.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });
    const pool = new quais.Contract(WQI_POOL_ADDRESS, WqiPoolABI, provider);

    const [reserveQuaiRaw, reserveWqiRaw] = await Promise.all([
      pool.reserveQuai() as Promise<bigint>,
      pool.reserveToken() as Promise<bigint>,
    ]);

    const reserveQuai = parseFloat(quais.formatUnits(reserveQuaiRaw, 18));
    const reserveWqi = parseFloat(quais.formatUnits(reserveWqiRaw, 18));

    if (reserveWqi === 0 || reserveQuai === 0) return null;

    return {
      quaiPerWqi: reserveQuai / reserveWqi,
      wqiPerQuai: reserveWqi / reserveQuai,
      reserveQuai: quais.formatUnits(reserveQuaiRaw, 18),
      reserveWqi: quais.formatUnits(reserveWqiRaw, 18),
    };
  }, [rpcProvider]);

  useEffect(() => {
    if (!WQI_ENABLED) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetchRate();
        if (!cancelled) setRate(r);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch wQI rate");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchRate]);

  const quaiToWqi = useCallback(
    (quaiAmount: number): number | null => {
      if (!rate) return null;
      return quaiAmount * rate.wqiPerQuai;
    },
    [rate]
  );

  const wqiToQuai = useCallback(
    (wqiAmount: number): number | null => {
      if (!rate) return null;
      return wqiAmount * rate.quaiPerWqi;
    },
    [rate]
  );

  return {
    rate,
    loading,
    error,
    fetchRate,
    quaiToWqi,
    wqiToQuai,
    enabled: WQI_ENABLED,
  };
}
