"use client";

import { SolanaProvider } from "@solana/react-hooks";
import { createDefaultClient } from "@solana/client";
import { DEVNET_RPC } from "@/lib/solana";
import type { ReactNode } from "react";

// Client created once at module level (browser-only "use client")
const client = createDefaultClient({
  rpc: DEVNET_RPC,
  cluster: "devnet",
});

/**
 * Wraps the app with all required providers:
 * - Solana (client + query + wallet persistence)
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SolanaProvider client={client} walletPersistence={{ autoConnect: true }}>
      {children}
    </SolanaProvider>
  );
}
