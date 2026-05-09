"use client";

import { use } from "react";
import Link from "next/link";
import { Swords, Trophy, BookOpen, ExternalLink, ArrowLeft } from "lucide-react";

// ─── Mock result data ───

const MOCK_RESULTS: Record<string, {
  challenger: string;
  opponent: string;
  challengerScore: number;
  opponentScore: number;
  totalQuestions: number;
  winner: "challenger" | "opponent" | "tie";
  stakeAmount: number;
  courseName: string;
  topic: string;
}> = {
  duel_001: {
    challenger: "alice.sol",
    opponent: "bob.sol",
    challengerScore: 4,
    opponentScore: 2,
    totalQuestions: 5,
    winner: "challenger",
    stakeAmount: 1,
    courseName: "TECNOLOGÍAS EMERGENTES",
    topic: "TEORÍA BÁSICA DE BLOCKCHAIN",
  },
};

// ─── Types ───

type Props = {
  params: Promise<{ id: string }>;
};

// ─── Result component ───

function ResultBadge({ type }: { type: "win" | "lose" | "tie" }) {
  if (type === "win") {
    return (
      <div className="mb-4 inline-flex h-20 w-20 items-center justify-center border-2 border-brand-black bg-brand-jade">
        <Trophy size={40} strokeWidth={3} />
      </div>
    );
  }
  if (type === "lose") {
    return (
      <div className="mb-4 inline-flex h-20 w-20 items-center justify-center border-2 border-brand-black bg-brand-gray">
        <BookOpen size={40} strokeWidth={3} />
      </div>
    );
  }
  return (
    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center border-2 border-brand-black bg-brand-violet/20">
      <Swords size={40} strokeWidth={3} className="text-brand-violet" />
    </div>
  );
}

export default function DuelResultPage({ params }: Props) {
  const { id } = use(params);
  const result = MOCK_RESULTS[id];

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="heading-xl mb-4">RESULTADO NO DISPONIBLE</p>
        <p className="label-meta mb-6 text-muted-foreground">
          Este duelo aún no se ha resuelto.
        </p>
        <Link href="/" className="btn-violet">
          VOLVER
        </Link>
      </div>
    );
  }

  // Determine which side the viewer is on
  // In real MVP, this would depend on connected wallet
  const isChallenger = true; // mock: we're alice
  const myScore = isChallenger ? result.challengerScore : result.opponentScore;
  const opponentScore = isChallenger ? result.opponentScore : result.challengerScore;
  const opponentName = isChallenger ? result.opponent : result.challenger;
  const isWinner =
    result.winner === "tie"
      ? "tie"
      : (result.winner === "challenger" && isChallenger) ||
          (result.winner === "opponent" && !isChallenger)
        ? "win"
        : "lose";

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:text-brand-violet"
      >
        <ArrowLeft size={16} strokeWidth={3} />
        Volver
      </Link>

      <div className="heavy-card text-center">
        <ResultBadge type={isWinner} />

        {isWinner === "win" && (
          <>
            <p className="heading-xl text-brand-jade mb-2">¡GANASTE!</p>
            <p className="label-meta mb-6 text-muted-foreground">
              Recibiste {result.stakeAmount * 2} USDC en tu wallet.
            </p>
          </>
        )}
        {isWinner === "lose" && (
          <>
            <p className="heading-xl mb-2">PERDISTE EL DUELO</p>
            <p className="label-meta mb-6 text-muted-foreground">
              Perdiste {result.stakeAmount} USDC, pero ahora sabés qué repasar. 💪
            </p>
          </>
        )}
        {isWinner === "tie" && (
          <>
            <p className="heading-xl mb-2">¡EMPATE!</p>
            <p className="label-meta mb-6 text-muted-foreground">
              Recuperaste tu garantía de {result.stakeAmount} USDC.
            </p>
          </>
        )}

        {/* Score comparison */}
        <div className="mb-6 grid grid-cols-2 gap-4 border-y-2 border-brand-gray py-4">
          <div>
            <span className="label-meta text-muted-foreground">Tu score</span>
            <p className={`heading-xl ${isWinner === "win" ? "text-brand-jade" : ""}`}>
              {myScore}/{result.totalQuestions}
            </p>
          </div>
          <div>
            <span className="label-meta text-muted-foreground">{opponentName}</span>
            <p className={`heading-xl ${isWinner === "lose" ? "text-destructive" : ""}`}>
              {opponentScore}/{result.totalQuestions}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 space-y-1 text-left">
          <p className="label-meta text-muted-foreground">RESUMEN</p>
          <div className="rounded-none border-2 border-brand-gray bg-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wide">
              {result.courseName}
            </p>
            <p className="label-meta text-muted-foreground">{result.topic}</p>
            <p className="label-meta mt-2 flex items-center gap-1 text-muted-foreground">
              <ExternalLink size={10} strokeWidth={3} />
              Tx: SIMULATED_TX_HASH_123 (Ver en Solscan)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/create" className="btn-jade flex-1 justify-center">
            <Swords size={16} strokeWidth={3} />
            PEDIR REVANCHA
          </Link>
          <Link href="/create" className="btn-violet flex-1 justify-center">
            <BookOpen size={16} strokeWidth={3} />
            NUEVO TEMA
          </Link>
        </div>
      </div>
    </div>
  );
}
