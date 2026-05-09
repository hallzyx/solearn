/**
 * Solana client configuration.
 *
 * Sets up the RPC connection to devnet and exports the program ID.
 */

import { createDefaultClient, LAMPORTS_PER_SOL } from "@solana/client";

/** Solearn program ID on devnet. */
export const SOLEARN_PROGRAM_ID = "Cj6wPBbQoBZW9GbgAcUtfJEiJZiawiRKzk9JXLTzkfUR";

/** USDC devnet mint address. */
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/** Cluster URL for devnet. */
export const CLUSTER_URL = "https://api.devnet.solana.com";

/**
 * Creates a default Solana client configured for devnet.
 */
export {
  createDefaultClient,
  LAMPORTS_PER_SOL,
};

/**
 * Creates a default Solana client configured for devnet.
 */
export function createSolanaClient() {
  return createDefaultClient({
    rpc: CLUSTER_URL,
    cluster: "devnet",
  });
}
