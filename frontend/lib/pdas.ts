/**
 * PDA computation for Solearn program.
 * Works in the browser (client-side).
 * Uses pure-JS base58 to avoid @solana/kit codec issues.
 */

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Pure-JS base58 decode: string → Uint8Array */
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let carry = BASE58_ALPHABET.indexOf(str[i]);
    if (carry < 0) throw new Error(`Invalid base58 char: ${str[i]}`);
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Add leading zeros
  for (let i = 0; i < str.length && str[i] === "1"; i++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

/**
 * Computes the duel PDA: seeds = ["duel", duel_id]
 */
export async function computeDuelPda(
  getProgramDerivedAddress: Function,
  address: Function,
  programId: string,
  duelId: number[],
): Promise<string> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: address(programId),
    seeds: [new TextEncoder().encode("duel"), new Uint8Array(duelId)],
  });
  return pda.toString();
}

/**
 * Computes the escrow PDA: seeds = ["escrow", duel_pda_key, mint_key]
 */
export async function computeEscrowPda(
  getProgramDerivedAddress: Function,
  address: Function,
  programId: string,
  duelPda: string,
  mintAddr: string,
): Promise<string> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: address(programId),
    seeds: [
      new TextEncoder().encode("escrow"),
      base58Decode(duelPda),
      base58Decode(mintAddr),
    ],
  });
  return pda.toString();
}

/**
 * Computes the Associated Token Account (ATA) for a given owner + mint.
 * Seeds: [owner_pubkey, token_program_pubkey, mint_pubkey]
 * Program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
 */
export async function computeAta(
  getProgramDerivedAddress: Function,
  address: Function,
  ownerAddr: string,
  mintAddr: string,
): Promise<string> {
  const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
  const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

  const [pda] = await getProgramDerivedAddress({
    programAddress: address(ATA_PROGRAM),
    seeds: [
      base58Decode(ownerAddr),
      base58Decode(TOKEN_PROGRAM),
      base58Decode(mintAddr),
    ],
  });
  return pda.toString();
}

/**
 * Frontend helper — computes all PDAs in one call.
 */
export async function computePdas(duelId: number[], challengerAddr: string) {
  const { getProgramDerivedAddress, address } = await import("@solana/kit");
  const PROGRAM_ID = "Cj6wPBbQoBZW9GbgAcUtfJEiJZiawiRKzk9JXLTzkfUR";
  const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

  const duelPda = await computeDuelPda(getProgramDerivedAddress, address, PROGRAM_ID, duelId);
  const escrowPda = await computeEscrowPda(getProgramDerivedAddress, address, PROGRAM_ID, duelPda, USDC_MINT);
  const challengerAta = await computeAta(getProgramDerivedAddress, address, challengerAddr, USDC_MINT);

  return { duelPda, escrowPda, challengerAta };
}
