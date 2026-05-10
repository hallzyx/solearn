/**
 * GET /api/duels/[id] — Get duel detail (public fields, no answers/correctIndex)
 */

import { NextRequest, NextResponse } from "next/server";
import { findDuel } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const duel = await findDuel(id);
    if (!duel) {
      return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: duel.id,
      duelId: duel.duelId,
      onChainDuelId: duel.onChainDuelId,
      escrowPda: duel.escrowPda,
      challengerAta: duel.challengerAta,
      opponentAta: duel.opponentAta,
      status: duel.status,
      challenger: duel.challenger,
      opponent: duel.opponent,
      courseName: duel.courseName,
      topic: duel.topic,
      stakeAmount: duel.stakeAmount,
      questionCount: duel.questionCount,
      timeLimit: duel.timeLimit,
      challengerScore: duel.challengerScore,
      opponentScore: duel.opponentScore,
      challengerAnswers: duel.challengerAnswers,
      opponentAnswers: duel.opponentAnswers,
      winner: duel.winner,
      createdAt: duel.createdAt,
      acceptedAt: duel.acceptedAt,
      startedAt: duel.startedAt,
      completedAt: duel.completedAt,
    });
  } catch (error) {
    console.error("GET /api/duels/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
