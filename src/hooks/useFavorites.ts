"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "quaipump_favorites";

function readFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeFavorites(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // Storage unavailable
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  const isFavorite = useCallback(
    (curveAddress: string) => favorites.has(curveAddress.toLowerCase()),
    [favorites]
  );

  const toggleFavorite = useCallback((curveAddress: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const key = curveAddress.toLowerCase();
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      writeFavorites(next);
      return next;
    });
  }, []);

  const favoriteAddresses = [...favorites];

  return { isFavorite, toggleFavorite, favoriteAddresses, count: favorites.size };
}
