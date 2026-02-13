import type { Metadata } from "next";
import { ColorModeScript } from "@chakra-ui/react";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuaiPump — Launch Tokens on Quai",
  description:
    "Launch bonding curve tokens on Quai Network. Auto-graduation to DEX, instant trading, no presale.",
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
