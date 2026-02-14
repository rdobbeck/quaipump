"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "quaipump_referrer";
const REFERRAL_COUNT_KEY = "quaipump_referral_count";

export function useReferral() {
  const searchParams = useSearchParams();
  const [referrer, setReferrer] = useState<string | null>(null);

  // Capture ref param on page load
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, ref);
        setReferrer(ref);
      } catch {}
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setReferrer(stored);
      } catch {}
    }
  }, [searchParams]);

  // Generate referral link for current user
  const getReferralLink = useCallback(
    (account: string, path?: string) => {
      if (typeof window === "undefined") return "";
      const base = window.location.origin;
      const target = path || window.location.pathname;
      return `${base}${target}?ref=${account}`;
    },
    []
  );

  // Track referral count (for display)
  const incrementReferralCount = useCallback(() => {
    try {
      const current = parseInt(localStorage.getItem(REFERRAL_COUNT_KEY) || "0", 10);
      localStorage.setItem(REFERRAL_COUNT_KEY, String(current + 1));
    } catch {}
  }, []);

  const getReferralCount = useCallback(() => {
    try {
      return parseInt(localStorage.getItem(REFERRAL_COUNT_KEY) || "0", 10);
    } catch {
      return 0;
    }
  }, []);

  return { referrer, getReferralLink, incrementReferralCount, getReferralCount };
}
