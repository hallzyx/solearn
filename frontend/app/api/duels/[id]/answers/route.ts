/**
 * POST /api/duels/[id]/answers
 * Submits answers for a player (challenger or opponent).
 * One answer at a time.
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
    const { player, questionId, selectedIndex } = body;

    if (!player || questionId === undefined || selectedIndex === undefined) {
      return NextResponse.json({ error: "Missing fields: player, questionId, selectedIndex" }, { status: 400 });
    }

    const duel = await findDuel(id);
    if (!duel) {
      return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    }

    if (duel.status !== "ACCEPTED" && duel.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Duel is not playable" }, { status: 400 });
    }

    const answer = {
      questionId,
      selectedIndex,
      answeredAt: Date.now(),
    };

    if (player === "challenger") {
      if (!duel.challengerAnswers) duel.challengerAnswers = [];
      const existing = duel.challengerAnswers.find((a) => a.questionId === questionId);
      if (existing) {
        existing.selectedIndex = selectedIndex;
        existing.answeredAt = Date.now();
      } else {
        duel.challengerAnswers.push(answer);
      }
    } else if (player === "opponent") {
      if (!duel.opponentAnswers) duel.opponentAnswers = [];
      const existing = duel.opponentAnswers.find((a) => a.questionId === questionId);
      if (existing) {
        existing.selectedIndex = selectedIndex;
        existing.answeredAt = Date.now();
      } else {
        duel.opponentAnswers.push(answer);
      }
    } else {
      return NextResponse.json({ error: "Invalid player role" }, { status: 400 });
    }

    await saveDuel(duel);

    const answersCount = player === "challenger"
      ? duel.challengerAnswers?.length ?? 0
      : duel.opponentAnswers?.length ?? 0;

    return NextResponse.json({
      success: true,
      answeredCount: answersCount,
      totalQuestions: duel.questionCount,
    });
  } catch (error) {
    console.error("POST /api/duels/[id]/answers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET: Return answers with correct answers (only if duel is resolved) ───

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

    // Only expose correct answers after the duel is resolved
    if (duel.status !== "COMPLETED" && duel.status !== "READY_TO_RESOLVE" && duel.status !== "TIMED_OUT") {
      return NextResponse.json({ error: "Duel not yet resolved" }, { status: 400 });
    }

    // Return full questions with correct answers + both players' selected answers
    const questions = duel.questions.map((q) => {
      const ca = duel.challengerAnswers?.find((a) => a.questionId === q.id);
      const oa = duel.opponentAnswers?.find((a) => a.questionId === q.id);
      return {
        id: q.id,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        challengerSelected: ca?.selectedIndex ?? null,
        opponentSelected: oa?.selectedIndex ?? null,
      };
    });

    return NextResponse.json({
      duelId: duel.duelId,
      questions,
      challengerScore: duel.challengerScore,
      opponentScore: duel.opponentScore,
    });
  } catch (error) {
    console.error("GET /api/duels/[id]/answers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
