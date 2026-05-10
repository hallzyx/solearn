/**
 * Backend resolver — signs and sends resolve_duel / claim_timeout
 * using @solana/web3.js v1 (battle-tested in Node.js).
 *
 * Runs in Next.js API routes (server-side only).
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// ─── Constants ───

const PROGRAM_ID = new PublicKey("Cj6wPBbQoBZW9GbgAcUtfJEiJZiawiRKzk9JXLTzkfUR");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const DEVNET_RPC = "https://api.devnet.solana.com";

// Discriminators from Anchor IDL (sha256("global:<instruction_name>")[:8])
const DISCRIMINATORS: Record<string, number[]> = {
  create_duel: [0x31, 0x1c, 0x5d, 0x0b, 0x4b, 0xf2, 0x45, 0xa5],
  accept_duel: [0x50, 0x34, 0x5a, 0x87, 0xac, 0xdd, 0xaf, 0x66],
  resolve_duel: [0xd5, 0xa2, 0xcb, 0xeb, 0x97, 0xec, 0xb2, 0x40],
  claim_timeout: [0x82, 0xea, 0x2d, 0x35, 0x78, 0x5a, 0x56, 0xb2],
  cancel_duel: [0x53, 0x7c, 0xe0, 0xed, 0xeb, 0x2c, 0x26, 0x39],
  close_duel: [0xce, 0xab, 0x70, 0x96, 0xd6, 0x4e, 0xd5, 0xc4],
};

// ─── Borsh encoding ───

function borshU64(val: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(val), 0);
  return buf;
}

function borshU8(val: number): Buffer {
  return Buffer.from([val]);
}

function encodeIx(ixName: string, ...borshArgs: Buffer[]): Buffer {
  const disc = DISCRIMINATORS[ixName];
  if (!disc) throw new Error(`Unknown instruction: ${ixName}`);
  return Buffer.concat([Buffer.from(disc), ...borshArgs]);
}

// ─── Keypair ───

let _resolver: Keypair | null = null;

async function getResolverKeypair(): Promise<Keypair> {
  if (_resolver) return _resolver;

  const secretKeyB58 = process.env.RESOLVER_SECRET_KEY;
  if (secretKeyB58) {
    // bs58 v6 is ESM — use dynamic import
    const bs58 = (await import("bs58")).default;
    const keyBytes = bs58.decode(secretKeyB58);
    _resolver = Keypair.fromSecretKey(Uint8Array.from(keyBytes));
    return _resolver;
  }

  // Fallback: generate ephemeral (won't work without SOL)
  console.warn("⚠️  RESOLVER_SECRET_KEY missing — generating ephemeral keypair");
  _resolver = Keypair.generate();
  console.log(`Resolver pubkey (ephemeral, fund this!): ${_resolver.publicKey.toBase58()}`);
  return _resolver;
}

// ─── Send transaction ───

async function sendTx(
  ixName: string,
  accounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
  ...args: Buffer[]
): Promise<string> {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const signer = await getResolverKeypair();

  const ixData = encodeIx(ixName, ...args);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: accounts,
    data: ixData,
  });

  const tx = new Transaction().add(instruction);

  console.log(`Sending ${ixName}... resolver: ${signer.publicKey.toBase58()}`);
  const sig = await sendAndConfirmTransaction(connection, tx, [signer], {
    commitment: "confirmed",
    skipPreflight: false,
  });

  console.log(`Tx confirmed: ${sig}`);
  return sig;
}

// ─── Public API ───

/**
 * resolve_duel: submit scores, contract distributes the pot.
 */
export async function resolveDuel(params: {
  duelPda: string;
  escrowTokenAccount: string;
  challengerTokenAccount: string;
  opponentTokenAccount: string;
  scoreA: number;
  scoreB: number;
}): Promise<string> {
  const resolver = await getResolverKeypair();

  return sendTx(
    "resolve_duel",
    [
      { pubkey: resolver.publicKey, isSigner: true, isWritable: true },      // resolver (signer)
      { pubkey: new PublicKey(params.duelPda), isSigner: false, isWritable: true },        // duel
      { pubkey: new PublicKey(params.escrowTokenAccount), isSigner: false, isWritable: true }, // escrow
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },                             // mint
      { pubkey: new PublicKey(params.challengerTokenAccount), isSigner: false, isWritable: true }, // challenger ATA
      { pubkey: new PublicKey(params.opponentTokenAccount), isSigner: false, isWritable: true },   // opponent ATA
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },                           // token program
    ],
    borshU8(params.scoreA),
    borshU8(params.scoreB),
  );
}

/**
 * claim_timeout: claim full pot when a player abandons.
 */
export async function claimTimeout(params: {
  duelPda: string;
  escrowTokenAccount: string;
  claimerTokenAccount: string;
}): Promise<string> {
  const resolver = await getResolverKeypair();

  return sendTx(
    "claim_timeout",
    [
      { pubkey: resolver.publicKey, isSigner: true, isWritable: true },      // resolver
      { pubkey: new PublicKey(params.duelPda), isSigner: false, isWritable: true },        // duel
      { pubkey: new PublicKey(params.escrowTokenAccount), isSigner: false, isWritable: true }, // escrow
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },                             // mint
      { pubkey: new PublicKey(params.claimerTokenAccount), isSigner: false, isWritable: true }, // claimer ATA
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },                          // token program
    ],
  );
}

/**
 * Returns the resolver's public key (for display / config).
 */
export async function resolverPubkey(): Promise<string> {
  const r = await getResolverKeypair();
  return r.publicKey.toBase58();
}
