"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    label: "Browse",
    href: "/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    label: "Launch",
    href: "/launch",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 5v14" /><path d="M5 12h14" />
      </svg>
    ),
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    ),
  },
  {
    label: "Ranks",
    href: "/leaderboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M8 21V12H4v9" /><path d="M14 21V8h-4v13" /><path d="M20 21V3h-4v18" />
      </svg>
    ),
  },
  {
    label: "More",
    href: "/watchlist",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
      </svg>
    ),
  },
];

export function MobileTabBar() {
  const pathname = usePathname();

  if (pathname.startsWith("/embed")) return null;

  return (
    <Box
      display={{ base: "block", md: "none" }}
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="var(--bg-surface)"
      borderTop="1px solid"
      borderColor="var(--border)"
      zIndex={100}
      pb="env(safe-area-inset-bottom)"
    >
      <Flex justify="space-around" align="center" h="56px" px={2}>
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Box
              key={tab.href}
              as={NextLink}
              href={tab.href}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              flex={1}
              py={1}
              color={isActive ? "var(--accent)" : "var(--text-tertiary)"}
              _hover={{ color: "var(--accent)" }}
              transition="color 0.15s"
            >
              {tab.icon}
              <Text fontSize="9px" fontWeight={isActive ? "600" : "400"} mt={0.5}>
                {tab.label}
              </Text>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}
