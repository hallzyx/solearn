/**
 * POST /api/duels/[id]/created-on-chain
 *
 * Called by the frontend AFTER the create_duel transaction is confirmed on Solana.
 * Stores the on-chain PDAs and marks the off-chain duel as ready for play.
 */

import { NextRequest, NextResponse } from "next/server";
import { findDuel, saveDuel } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { onChainDuelId, escrowPda, challengerAta } = body;

    const duel = await findDuel(id);
    if (!duel) {
      return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    }

    duel.onChainDuelId = onChainDuelId || duel.onChainDuelId;
    duel.escrowPda = escrowPda || duel.escrowPda;
    duel.challengerAta = challengerAta || duel.challengerAta;

    await saveDuel(duel);

    return NextResponse.json({
      id: duel.id,
      onChainDuelId: duel.onChainDuelId,
      status: duel.status,
    });
  } catch (error) {
    console.error("POST /api/duels/[id]/created-on-chain error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
