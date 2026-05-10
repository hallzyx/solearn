/**
 * GET /api/duels/[id]/questions
 * Returns questions WITHOUT correctIndex (sanitized for gameplay).
 * Only works if duel status is ACCEPTED or IN_PROGRESS.
 */

import { NextRequest, NextResponse } from "next/server";
import { findDuel, sanitizeQuestions } from "@/lib/db";

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

    if (duel.status !== "ACCEPTED" && duel.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: `Duel is ${duel.status}, not playable` }, { status: 400 });
    }

    const questions = sanitizeQuestions(duel);

    return NextResponse.json({
      duelId: duel.duelId,
      questionCount: duel.questionCount,
      timeLimit: duel.timeLimit,
      questions,
    });
  } catch (error) {
    console.error("GET /api/duels/[id]/questions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
