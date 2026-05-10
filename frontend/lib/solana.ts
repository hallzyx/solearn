/**
 * Solana constants shared across the app.
 * No Solana library imports here to avoid module resolution issues
 * between browser (client components) and node (API routes).
 */

/** Solearn program ID on devnet. */
export const SOLEARN_PROGRAM_ID = "Cj6wPBbQoBZW9GbgAcUtfJEiJZiawiRKzk9JXLTzkfUR";

/** USDC devnet mint address. */
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/** Devnet RPC URL. */
export const DEVNET_RPC = "https://api.devnet.solana.com";

/** SOL lamports per SOL. */
export const LAMPORTS_PER_SOL = 1_000_000_000;
