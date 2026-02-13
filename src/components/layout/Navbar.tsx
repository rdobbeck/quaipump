"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Flex,
  HStack,
  Link,
  Text,
  Container,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NavSearch } from "@/components/layout/NavSearch";
import { WQI_ENABLED } from "@/lib/constants";

const BASE_NAV_LINKS = [
  { label: "Browse", href: "/" },
  { label: "Launch", href: "/launch" },
  { label: "Create", href: "/create" },
  { label: "Portfolio", href: "/portfolio" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navLinks = useMemo(() => {
    const links = [...BASE_NAV_LINKS];
    if (WQI_ENABLED) {
      links.push({ label: "Faucet", href: "/faucet" });
    }
    return links;
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <Box
      bg="var(--bg-surface)"
      borderBottom="1px solid"
      borderColor="var(--border)"
      py={3}
      position="sticky"
      top={0}
      zIndex={100}
      backdropFilter="blur(12px)"
      bgColor="rgba(19, 19, 26, 0.9)"
    >
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center" gap={4}>
          <HStack spacing={6} flexShrink={0}>
            <Link as={NextLink} href="/" _hover={{ textDecoration: "none" }} flexShrink={0}>
              <Text
                fontSize="lg"
                fontWeight="700"
                color="var(--accent)"
                letterSpacing="-0.5px"
              >
                QuaiPump
              </Text>
            </Link>

            <HStack spacing={1} display={{ base: "none", md: "flex" }}>
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    as={NextLink}
                    href={link.href}
                    px={3}
                    py={1.5}
                    rounded="lg"
                    fontSize="sm"
                    fontWeight="500"
                    color={isActive ? "var(--text-primary)" : "var(--text-secondary)"}
                    bg={isActive ? "var(--bg-elevated)" : "transparent"}
                    _hover={{
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      bg: "var(--bg-elevated)",
                    }}
                    transition="all 0.15s"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </HStack>
          </HStack>

          <HStack spacing={3} flexShrink={0}>
            <Box display={{ base: "none", md: "block" }}>
              <NavSearch />
            </Box>
            <ConnectButton />
            <IconButton
              display={{ base: "flex", md: "none" }}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              variant="ghost"
              size="sm"
              color="var(--text-secondary)"
              _hover={{ color: "var(--text-primary)", bg: "var(--bg-elevated)" }}
              onClick={() => setMenuOpen(!menuOpen)}
              icon={
                menuOpen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
                  </svg>
                )
              }
            />
          </HStack>
        </Flex>
      </Container>

      {menuOpen && (
        <Box
          ref={menuRef}
          position="absolute"
          top="100%"
          left={0}
          right={0}
          bg="var(--bg-surface)"
          borderBottom="1px solid"
          borderColor="var(--border)"
          boxShadow="0 8px 32px rgba(0,0,0,0.4)"
          zIndex={99}
          display={{ base: "block", md: "none" }}
        >
          <Container maxW="container.xl" py={3}>
            <VStack spacing={1} align="stretch">
              <Box mb={2}>
                <NavSearch />
              </Box>
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    as={NextLink}
                    href={link.href}
                    px={3}
                    py={2.5}
                    rounded="lg"
                    fontSize="sm"
                    fontWeight="500"
                    color={isActive ? "var(--text-primary)" : "var(--text-secondary)"}
                    bg={isActive ? "var(--bg-elevated)" : "transparent"}
                    _hover={{
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      bg: "var(--bg-elevated)",
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </VStack>
          </Container>
        </Box>
      )}
    </Box>
  );
}
