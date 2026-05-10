/**
 * POST /api/duels/[id]/accept — Update off-chain duel state after on-chain accept_duel.
 *
 * Called by the frontend AFTER the accept_duel transaction is confirmed on Solana.
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
    const { opponent, opponentAta, onChainDuelId } = body;

    if (!opponent) {
      return NextResponse.json({ error: "Missing opponent address" }, { status: 400 });
    }

    const duel = await findDuel(id);
    if (!duel) {
      return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    }

    duel.status = "ACCEPTED";
    duel.opponent = opponent;
    duel.opponentAta = opponentAta || duel.opponentAta;
    duel.acceptedAt = Date.now();
    duel.startedAt = Date.now();
    if (onChainDuelId) duel.onChainDuelId = onChainDuelId;

    await saveDuel(duel);

    return NextResponse.json({
      id: duel.id,
      status: duel.status,
      opponent: duel.opponent,
    });
  } catch (error) {
    console.error("POST /api/duels/[id]/accept error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
