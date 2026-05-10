/**
 * POST /api/duels  — Create a new duel (quiz generation + store off-chain)
 * GET  /api/duels  — List open duels
 *
 * The frontend is responsible for computing PDAs and sending the on-chain
 * create_duel transaction. The API just generates the quiz and stores data.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { randomBytes } from "crypto";
import { generateQuiz } from "@/lib/ai";
import { getDb, saveDuel, listDuelsByStatus, type DuelRecord } from "@/lib/db";

// ─── POST: Create duel ───

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseName, topic, stakeAmount, questionCount, timeLimit, challenger, duelId: duelIdHex, duelPda: onChainDuelId, escrowPda, challengerAta } = body;

    // Validate
    if (!courseName || !topic || !stakeAmount || !questionCount || !timeLimit || !challenger) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Parse duel_id from frontend (hex string → bytes for DB)
    const duelIdBytes = duelIdHex
      ? Buffer.from(duelIdHex, "hex")
      : randomBytes(8);

    // 1. Generate quiz with AI
    const quiz = await generateQuiz(courseName, topic, questionCount);

    // 2. Create duel record
    const duelIdStr = duelIdBytes.toString("base64url");

    const duel: DuelRecord = {
      id: uuid(),
      duelId: duelIdStr,
      onChainDuelId: onChainDuelId || null,
      escrowPda: escrowPda || null,
      challengerAta: challengerAta || null,
      status: "CREATED",
      challenger,
      opponent: null,
      resolver: process.env.RESOLVER_PUBKEY || "backend",
      courseName,
      topic,
      stakeAmount,
      questionCount,
      timeLimit,
      questions: quiz.questions.map((q: any, i: number) => ({
        id: i + 1,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
      })),
      challengerAnswers: null,
      opponentAnswers: null,
      challengerScore: null,
      opponentScore: null,
      winner: null,
      createdAt: Date.now(),
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
    };

    await saveDuel(duel);

    return NextResponse.json({
      id: duel.id,
      duelId: duel.duelId,
      status: duel.status,
      message: "Duel created. Share the ID with your opponent.",
    });
  } catch (error) {
    console.error("POST /api/duels error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── GET: List open duels ───

export async function GET() {
  try {
    const duels = await listDuelsByStatus("CREATED");

    const publicDuels = duels.map((d) => ({
      id: d.id,
      duelId: d.duelId,
      challenger: d.challenger,
      courseName: d.courseName,
      topic: d.topic,
      stakeAmount: d.stakeAmount,
      questionCount: d.questionCount,
      timeLimit: d.timeLimit,
      createdAt: d.createdAt,
    }));

    return NextResponse.json(publicDuels);
  } catch (error) {
    console.error("GET /api/duels error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
