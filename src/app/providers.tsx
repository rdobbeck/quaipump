"use client";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { StateProvider } from "./store";
import { type ReactNode } from "react";

const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  colors: {
    brand: {
      50: "#e0fff0",
      100: "#b3ffd6",
      200: "#80ffbb",
      300: "#4dffa1",
      400: "#1aff86",
      500: "#00e676",
      600: "#00c853",
      700: "#009e42",
      800: "#007531",
      900: "#004d20",
    },
    surface: {
      bg: "#0b0b0f",
      card: "#13131a",
      elevated: "#1a1a24",
      border: "#2a2a3a",
      borderHover: "#3a3a4a",
    },
  },
  styles: {
    global: {
      body: {
        bg: "#0b0b0f",
        color: "#e8e8ed",
      },
    },
  },
  components: {
    Button: {
      variants: {
        accent: {
          bg: "#00e676",
          color: "#0b0b0f",
          fontWeight: "600",
          _hover: {
            bg: "#00c853",
            boxShadow: "0 0 20px rgba(0,230,118,0.3)",
            _disabled: { bg: "#00e676" },
          },
          _active: { bg: "#00b84d" },
        },
        sell: {
          bg: "#ff5252",
          color: "white",
          fontWeight: "600",
          _hover: {
            bg: "#ff1744",
            boxShadow: "0 0 20px rgba(255,82,82,0.3)",
            _disabled: { bg: "#ff5252" },
          },
          _active: { bg: "#d50000" },
        },
        ghost: {
          color: "#6b6b7b",
          _hover: { bg: "#1a1a24", color: "#e8e8ed" },
        },
        outline: {
          borderColor: "#2a2a3a",
          color: "#e8e8ed",
          _hover: { bg: "#1a1a24", borderColor: "#3a3a4a" },
        },
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: "#1a1a24",
            borderColor: "#2a2a3a",
            border: "1px solid",
            color: "#e8e8ed",
            _hover: { bg: "#1a1a24", borderColor: "#3a3a4a" },
            _focus: {
              bg: "#1a1a24",
              borderColor: "#00e676",
              boxShadow: "0 0 0 1px #00e676",
            },
          },
        },
      },
      defaultProps: { variant: "filled" },
    },
    NumberInput: {
      variants: {
        filled: {
          field: {
            bg: "#1a1a24",
            borderColor: "#2a2a3a",
            border: "1px solid",
            color: "#e8e8ed",
            _hover: { bg: "#1a1a24", borderColor: "#3a3a4a" },
            _focus: {
              bg: "#1a1a24",
              borderColor: "#00e676",
              boxShadow: "0 0 0 1px #00e676",
            },
          },
        },
      },
      defaultProps: { variant: "filled" },
    },
    Select: {
      variants: {
        filled: {
          field: {
            bg: "#1a1a24",
            borderColor: "#2a2a3a",
            border: "1px solid",
            color: "#e8e8ed",
            _hover: { bg: "#1a1a24", borderColor: "#3a3a4a" },
            _focus: {
              bg: "#1a1a24",
              borderColor: "#00e676",
              boxShadow: "0 0 0 1px #00e676",
            },
          },
        },
      },
      defaultProps: { variant: "filled" },
    },
    Tabs: {
      variants: {
        "soft-rounded": {
          tab: {
            color: "#6b6b7b",
            _selected: { bg: "#00e676", color: "#0b0b0f" },
          },
        },
      },
    },
    Alert: {
      variants: {
        subtle: { container: { bg: "#1a1a24" } },
      },
    },
    Skeleton: {
      baseStyle: { startColor: "#1a1a24", endColor: "#2a2a3a" },
    },
    Modal: {
      baseStyle: {
        dialog: { bg: "#13131a", borderColor: "#2a2a3a", border: "1px solid" },
        overlay: { bg: "rgba(0,0,0,0.7)" },
      },
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <StateProvider>{children}</StateProvider>
    </ChakraProvider>
  );
}
