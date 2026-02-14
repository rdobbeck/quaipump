"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "quaipump_price_alerts";

export interface PriceAlert {
  id: string;
  curveAddress: string;
  tokenSymbol: string;
  condition: "above" | "below";
  priceUsd: number;
  createdAt: number;
  triggered: boolean;
}

function loadAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PriceAlert[];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {}
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  const addAlert = useCallback(
    (curveAddress: string, tokenSymbol: string, condition: "above" | "below", priceUsd: number) => {
      const alert: PriceAlert = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        curveAddress,
        tokenSymbol,
        condition,
        priceUsd,
        createdAt: Math.floor(Date.now() / 1000),
        triggered: false,
      };
      setAlerts((prev) => {
        const next = [alert, ...prev];
        saveAlerts(next);
        return next;
      });
      return alert.id;
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAlerts(next);
      return next;
    });
  }, []);

  const markTriggered = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, triggered: true } : a
      );
      saveAlerts(next);
      return next;
    });
  }, []);

  const checkAlerts = useCallback(
    (prices: Record<string, number>): PriceAlert[] => {
      const triggered: PriceAlert[] = [];
      for (const alert of alerts) {
        if (alert.triggered) continue;
        const currentPrice = prices[alert.curveAddress];
        if (currentPrice === undefined) continue;
        const shouldTrigger =
          (alert.condition === "above" && currentPrice >= alert.priceUsd) ||
          (alert.condition === "below" && currentPrice <= alert.priceUsd);
        if (shouldTrigger) {
          triggered.push(alert);
          markTriggered(alert.id);
        }
      }
      return triggered;
    },
    [alerts, markTriggered]
  );

  const activeAlerts = alerts.filter((a) => !a.triggered);

  return { alerts, activeAlerts, addAlert, removeAlert, checkAlerts };
}
