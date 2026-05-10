/**
 * Instruction builders for the Solearn Anchor program.
 * Pure data — no @solana/kit imports (avoids module resolution issues).
 */

import idl from "./idl.json";

// ─── Discriminators from IDL ───

const DISCRIMINATORS: Record<string, number[]> = {};
for (const ix of idl.instructions as Array<{ name: string; discriminator: number[] }>) {
  DISCRIMINATORS[ix.name] = ix.discriminator;
}

/** u64 → 8 bytes little-endian */
function borshU64(val: number): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, BigInt(val), true);
  return buf;
}

/** u8 → 1 byte */
function borshU8(val: number): Uint8Array {
  return new Uint8Array([val]);
}

/** i64 → 8 bytes little-endian */
function borshI64(val: number): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigInt64(0, BigInt(val), true);
  return buf;
}

/** Builder for a single Anchor instruction */
export function buildProgramIx(ixName: string, ...borshArgs: Uint8Array[]): Uint8Array {
  const disc = DISCRIMINATORS[ixName];
  if (!disc) throw new Error(`Unknown instruction: ${ixName}`);
  const totalLen = disc.length + borshArgs.reduce((s, a) => s + a.length, 0);
  const buf = new Uint8Array(totalLen);
  buf.set(new Uint8Array(disc), 0);
  let offset = disc.length;
  for (const arg of borshArgs) {
    buf.set(arg, offset);
    offset += arg.length;
  }
  return buf;
}

// ─── Public instruction builders ───

export function createDuelData(stakeAmount: number, questionCount: number, timeLimit: number, duelId: number[]): Uint8Array {
  // USDC has 6 decimals — convert human-readable amount to base units
  const stakeBaseUnits = Math.round(stakeAmount * 1_000_000);
  return buildProgramIx("create_duel", borshU64(stakeBaseUnits), borshU8(questionCount), borshI64(timeLimit), new Uint8Array(duelId));
}

export function acceptDuelData(): Uint8Array {
  return buildProgramIx("accept_duel");
}

export function resolveDuelData(scoreA: number, scoreB: number): Uint8Array {
  return buildProgramIx("resolve_duel", borshU8(scoreA), borshU8(scoreB));
}

export function claimTimeoutData(): Uint8Array {
  return buildProgramIx("claim_timeout");
}

/** Generate a random 8-byte duel ID */
export function generateDuelId(): number[] {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)));
}

/** Compute the duel PDA seed label */
export const DUEL_SEED = "duel";
export const ESCROW_SEED = "escrow";

/** Our program addresses as strings */
export const SOLEARN_PROGRAM = "Cj6wPBbQoBZW9GbgAcUtfJEiJZiawiRKzk9JXLTzkfUR";
export const USDC_MINT_ADDR = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const TOKEN_PROGRAM_ADDR = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
