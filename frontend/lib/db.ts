/**
 * LowDB database for off-chain duel storage.
 *
 * Uses Node.js async adapter. All duels, questions, answers,
 * and scores are stored here. The on-chain contract only
 * holds stake + final scores.
 */

import { JSONFilePreset } from "lowdb/node";

// ─── Types ───

export type DuelStatus = "CREATED" | "ACCEPTED" | "IN_PROGRESS" | "READY_TO_RESOLVE" | "COMPLETED" | "TIMED_OUT" | "CANCELLED" | "EXPIRED";

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctIndex: number; // 0-3, NEVER exposed to frontend during play
}

export interface Answer {
  questionId: number;
  selectedIndex: number;
  answeredAt: number;
}

export interface DuelRecord {
  id: string;
  /** On-chain duel PDA pubkey */
  onChainDuelId?: string;
  /** On-chain escrow PDA pubkey */
  escrowPda?: string;
  /** Challenger's USDC ATA */
  challengerAta?: string;
  /** Opponent's USDC ATA */
  opponentAta?: string;
  /** Off-chain duel_id [u8; 8] */
  duelId: string;
  status: DuelStatus;
  challenger: string;
  opponent: string | null;
  resolver: string;
  courseName: string;
  topic: string;
  stakeAmount: number;
  questionCount: number;
  timeLimit: number;
  questions: Question[];
  challengerAnswers: Answer[] | null;
  opponentAnswers: Answer[] | null;
  challengerScore: number | null;
  opponentScore: number | null;
  winner: string | null;
  createdAt: number;
  acceptedAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface DBData {
  duels: DuelRecord[];
}

// ─── Singleton ───

let db: Awaited<ReturnType<typeof JSONFilePreset<DBData>>> | null = null;

/**
 * Returns the singleton LowDB instance.
 * Creates the db.json file if it doesn't exist.
 */
export async function getDb() {
  if (!db) {
    db = await JSONFilePreset<DBData>("db.json", { duels: [] });
  }
  return db;
}

// ─── Helpers ───

/**
 * Finds a duel by its off-chain ID.
 */
export async function findDuel(id: string): Promise<DuelRecord | undefined> {
  const db = await getDb();
  return db.data.duels.find((d) => d.id === id);
}

export async function listDuelsByStatus(status: DuelStatus): Promise<DuelRecord[]> {
  const db = await getDb();
  return db.data.duels.filter((d) => d.status === status);
}

export async function countDuelsByStatus(status: DuelStatus): Promise<number> {
  const db = await getDb();
  return db.data.duels.filter((d) => d.status === status).length;
}

/**
 * Saves (inserts or updates) a duel record.
 */
export async function saveDuel(duel: DuelRecord): Promise<void> {
  const db = await getDb();
  const idx = db.data.duels.findIndex((d) => d.id === duel.id);
  if (idx >= 0) {
    db.data.duels[idx] = duel;
  } else {
    db.data.duels.push(duel);
  }
  await db.write();
}

/**
 * Returns questions for a duel WITHOUT the correctIndex field.
 * This is what the frontend receives during gameplay.
 */
export function sanitizeQuestions(duel: DuelRecord) {
  return duel.questions.map(({ id, text, options }) => ({
    id,
    text,
    options,
  }));
}

/**
 * Grades a duel: compares answers against correctIndex.
 * Stores scores in the duel record.
 */
export function gradeAnswers(duel: DuelRecord): { challengerScore: number; opponentScore: number } {
  let challengerScore = 0;
  let opponentScore = 0;

  for (const q of duel.questions) {
    const ca = duel.challengerAnswers?.find((a) => a.questionId === q.id);
    const oa = duel.opponentAnswers?.find((a) => a.questionId === q.id);
    if (ca?.selectedIndex === q.correctIndex) challengerScore++;
    if (oa?.selectedIndex === q.correctIndex) opponentScore++;
  }

  return { challengerScore, opponentScore };
}
