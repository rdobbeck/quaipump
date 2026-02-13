import type { Metadata } from "next";
import { ColorModeScript } from "@chakra-ui/react";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tokenomics Factory — Deploy Custom Tokens on Quai",
  description:
    "Create and deploy ERC20 tokens with taxes, vesting, LP locking, and reflection on Quai Network.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ColorModeScript initialColorMode="dark" />
        <Providers>
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 100px)" }}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
