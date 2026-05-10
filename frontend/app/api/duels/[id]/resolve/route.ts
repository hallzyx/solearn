/**
 * POST /api/duels/[id]/resolve
 * Backend grades the duel and calls resolve_duel on-chain via @solana/web3.js v1.
 */

import { NextRequest, NextResponse } from "next/server";
import { findDuel, saveDuel, gradeAnswers } from "@/lib/db";
import { resolveDuel } from "@/lib/resolver";

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

    if (duel.status !== "ACCEPTED" && duel.status !== "IN_PROGRESS" && duel.status !== "READY_TO_RESOLVE") {
      // If already resolved, return existing scores
      if (duel.status === "COMPLETED" || duel.status === "TIMED_OUT") {
        return NextResponse.json({
          id: duel.id,
          status: duel.status,
          challengerScore: duel.challengerScore,
          opponentScore: duel.opponentScore,
          winner: duel.winner,
        });
      }
      return NextResponse.json({ error: `Cannot resolve in status: ${duel.status}` }, { status: 400 });
    }

    // 1. Grade answers
    const { challengerScore, opponentScore } = gradeAnswers(duel);
    duel.challengerScore = challengerScore;
    duel.opponentScore = opponentScore;

    // 2. Determine winner
    if (challengerScore > opponentScore) {
      duel.winner = duel.challenger;
    } else if (opponentScore > challengerScore) {
      duel.winner = duel.opponent!;
    } else {
      duel.winner = null; // tie
    }

    // 3. Call on-chain resolve_duel
    const duelPda = duel.onChainDuelId;
    const escrowPda = duel.escrowPda;
    const challengerAta = duel.challengerAta;
    const opponentAta = duel.opponentAta;

    if (!duelPda || !escrowPda) {
      return NextResponse.json({ error: "Missing on-chain addresses for this duel" }, { status: 400 });
    }

    if (!challengerAta || !opponentAta) {
      return NextResponse.json({ error: "Missing token account addresses (ATA)" }, { status: 400 });
    }

    try {
      const sig = await resolveDuel({
        duelPda,
        escrowTokenAccount: escrowPda,
        challengerTokenAccount: challengerAta,
        opponentTokenAccount: opponentAta,
        scoreA: challengerScore,
        scoreB: opponentScore,
      });

      duel.status = "COMPLETED";
      duel.completedAt = Date.now();
      console.log(`✅ Duel ${id} resolved on-chain: ${sig}`);
    } catch (e: any) {
      console.error("On-chain resolution failed:", e?.logs?.join("\n") || e?.message || e);
      duel.status = "READY_TO_RESOLVE"; // retryable
    }

    await saveDuel(duel);

    return NextResponse.json({
      id: duel.id,
      status: duel.status,
      challengerScore,
      opponentScore,
      winner: duel.winner,
    });
  } catch (error) {
    console.error("POST /api/duels/[id]/resolve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
