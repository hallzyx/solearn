/**
 * Frontend API client — fetch wrappers for all backend routes.
 *
 * Each function maps directly to an API route.
 * All calls go through Next.js API routes (same origin).
 */

const BASE = "";

// ─── Types matching API responses ───

export interface DuelSummary {
  id: string;
  duelId: string;
  challenger: string;
  courseName: string;
  topic: string;
  stakeAmount: number;
  questionCount: number;
  timeLimit: number;
  createdAt: number;
}

export interface DuelDetail extends DuelSummary {
  status: string;
  onChainDuelId: string | null;
  escrowPda: string | null;
  challengerAta?: string;
  opponentAta?: string;
  opponent: string | null;
  challengerScore: number | null;
  opponentScore: number | null;
  challengerAnswers?: { questionId: number; selectedIndex: number }[];
  opponentAnswers?: { questionId: number; selectedIndex: number }[];
  winner: string | null;
  acceptedAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface SanitizedQuestion {
  id: number;
  text: string;
  options: string[];
}

export interface QuestionsResponse {
  duelId: string;
  questionCount: number;
  timeLimit: number;
  questions: SanitizedQuestion[];
}

export interface AnswerResponse {
  success: boolean;
  answeredCount: number;
  totalQuestions: number;
}

export interface CreateDuelResponse {
  id: string;
  duelId: string;
  duelPda: string | null;
  escrowPda: string | null;
  status: string;
  message: string;
}

export interface ResolveResponse {
  id: string;
  status: string;
  challengerScore: number;
  opponentScore: number;
  winner: string | null;
}

export interface TimeoutResponse {
  id: string;
  status: string;
  winner: string | null;
}

// ─── Helpers ───

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── API Methods ───

/** Create a new duel (POST /api/duels) */
export function createDuel(body: {
  courseName: string;
  topic: string;
  stakeAmount: number;
  questionCount: number;
  timeLimit: number;
  challenger: string;
  duelId: string;
  duelPda?: string;
  escrowPda?: string;
  challengerAta?: string;
}): Promise<CreateDuelResponse> {
  return fetchJSON(`${BASE}/api/duels`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** List open duels (GET /api/duels) */
export function listOpenDuels(): Promise<DuelSummary[]> {
  return fetchJSON(`${BASE}/api/duels`);
}

/** Get duel detail (GET /api/duels/[id]) */
export function getDuelDetail(id: string): Promise<DuelDetail> {
  return fetchJSON(`${BASE}/api/duels/${encodeURIComponent(id)}`);
}

/** Get sanitized questions (GET /api/duels/[id]/questions) */
export function getDuelQuestions(id: string): Promise<QuestionsResponse> {
  return fetchJSON(`${BASE}/api/duels/${encodeURIComponent(id)}/questions`);
}

/** Submit an answer (POST /api/duels/[id]/answers) */
export function submitAnswer(
  id: string,
  body: { player: "challenger" | "opponent"; questionId: number; selectedIndex: number },
): Promise<AnswerResponse> {
  return fetchJSON(`${BASE}/api/duels/${encodeURIComponent(id)}/answers`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Trigger resolution (POST /api/duels/[id]/resolve) */
export function resolveDuel(id: string): Promise<ResolveResponse> {
  return fetchJSON(`${BASE}/api/duels/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
  });
}

/** Trigger timeout (POST /api/duels/[id]/timeout) */
export function claimTimeoutDuel(id: string): Promise<TimeoutResponse> {
  return fetchJSON(`${BASE}/api/duels/${encodeURIComponent(id)}/timeout`, {
    method: "POST",
  });
}

/** Update off-chain duel after on-chain accept (POST /api/duels/[id]/accept) */
export function confirmAcceptDuel(
  id: string,
  body: { opponent: string; opponentAta?: string; onChainDuelId?: string },
): Promise<{ id: string; status: string }> {
  return fetchJSON(`${BASE}/api/duels/${encodeURIComponent(id)}/accept`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Update off-chain duel after on-chain create (POST /api/duels/[id]/created-on-chain) */
export function confirmCreateOnChain(
  id: string,
  body: { onChainDuelId: string; escrowPda: string; challengerAta?: string },
): Promise<{ id: string; status: string }> {
  return fetchJSON(`${BASE}/api/duels/${encodeURIComponent(id)}/created-on-chain`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Get detailed explanation for a duel (POST /api/duels/[id]/explain) */
export function getExplanation(id: string): Promise<{ explanation: string; audio?: string }> {
  return fetchJSON(`${BASE}/api/duels/${encodeURIComponent(id)}/explain`, {
    method: "POST",
  });
}
