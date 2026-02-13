"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppState } from "@/app/store";
import { NETWORK } from "@/lib/constants";
import { requestAccounts } from "./requestAccounts";

export function useGetAccounts() {
  const dispatch = useAppDispatch();
  const { account } = useAppState();

  const connectWallet = useCallback(async () => {
    try {
      const accounts = await requestAccounts();
      const quaisLib = await import("quais");
      const web3Provider = new quaisLib.BrowserProvider(
        window.pelagus as unknown as import("quais").Eip1193Provider
      );
      const rpcProvider = new quaisLib.JsonRpcProvider(NETWORK.rpcUrl, undefined, { usePathing: true });

      dispatch({ type: "SET_ACCOUNT", payload: accounts[0] });
      dispatch({ type: "SET_WEB3_PROVIDER", payload: web3Provider });
      dispatch({ type: "SET_RPC_PROVIDER", payload: rpcProvider });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }, [dispatch]);

  const disconnectWallet = useCallback(() => {
    dispatch({ type: "DISCONNECT" });
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.pelagus) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        dispatch({ type: "DISCONNECT" });
      } else {
        dispatch({ type: "SET_ACCOUNT", payload: accounts[0] });
      }
    };

    window.pelagus.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.pelagus?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [dispatch]);

  return { account, connectWallet, disconnectWallet };
}
