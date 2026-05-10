/**
 * POST /api/duels/[id]/timeout
 * Backend claims timeout on-chain via @solana/web3.js v1.
 */

import { NextRequest, NextResponse } from "next/server";
import { findDuel, saveDuel } from "@/lib/db";
import { claimTimeout } from "@/lib/resolver";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const duel = await findDuel(id);
    if (!duel) {
      return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    }

    if (duel.status !== "ACCEPTED" && duel.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: `Cannot timeout in status: ${duel.status}` }, { status: 400 });
    }

    const challengerFinished = (duel.challengerAnswers?.length ?? 0) === duel.questionCount;
    const opponentFinished = (duel.opponentAnswers?.length ?? 0) === duel.questionCount;

    let winner: string | null = null;
    let claimerAta: string | null = null;

    if (challengerFinished && !opponentFinished) {
      winner = duel.challenger;
      claimerAta = duel.challengerAta ?? null;
    } else if (!challengerFinished && opponentFinished) {
      winner = duel.opponent;
      claimerAta = duel.opponentAta ?? null;
    } else {
      return NextResponse.json({ error: "Both players either finished or abandoned" }, { status: 400 });
    }

    const duelPda = duel.onChainDuelId;
    const escrowPda = duel.escrowPda;

    if (!duelPda || !escrowPda || !claimerAta) {
      return NextResponse.json({ error: "Missing on-chain addresses" }, { status: 400 });
    }

    try {
      const sig = await claimTimeout({
        duelPda,
        escrowTokenAccount: escrowPda,
        claimerTokenAccount: claimerAta,
      });
      duel.status = "TIMED_OUT";
      duel.completedAt = Date.now();
      duel.winner = winner;
      console.log(`✅ Duel ${id} timeout claimed on-chain: ${sig}`);
    } catch (e) {
      console.error("On-chain timeout failed:", e);
    }

    await saveDuel(duel);

    return NextResponse.json({
      id: duel.id,
      status: duel.status,
      winner,
    });
  } catch (error) {
    console.error("POST /api/duels/[id]/timeout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
