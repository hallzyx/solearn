"use client";

import { SolanaProvider } from "@solana/react-hooks";
import { createSolanaClient } from "@/lib/solana";
import type { ReactNode } from "react";

const client = createSolanaClient();

/**
 * Wraps the app with all required providers:
 * - Solana (client + query + wallet persistence)
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SolanaProvider
      client={client}
      walletPersistence={{ autoConnect: true }}
    >
      {children}
    </SolanaProvider>
  );
}
