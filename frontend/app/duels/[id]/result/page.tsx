"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWalletSession } from "@solana/react-hooks";
import { Swords, Trophy, BookOpen, ExternalLink, ArrowLeft } from "lucide-react";
import { getDuelDetail, resolveDuel } from "@/lib/api";
import type { DuelDetail } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

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
  const session = useWalletSession();
  const myAddress = session?.account?.address;

  const [duel, setDuel] = useState<DuelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    getDuelDetail(id)
      .then((d) => {
        setDuel(d);
        // Auto-resolve if both have answers but no scores yet
        const hasChallengerAnswers = (d.challengerAnswers ?? []).length >= d.questionCount;
        const hasOpponentAnswers = (d.opponentAnswers ?? []).length >= d.questionCount;
        if (
          hasChallengerAnswers &&
          hasOpponentAnswers &&
          d.challengerScore === null &&
          d.opponentScore === null &&
          (d.status === "ACCEPTED" || d.status === "IN_PROGRESS" || d.status === "READY_TO_RESOLVE")
        ) {
          handleAutoResolve(d);
        }
      })
      .catch(() => setDuel(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleResolve = async () => {
    setResolving(true);
    try {
      const result = await resolveDuel(id);
      setDuel((prev) => prev ? {
        ...prev,
        status: result.status,
        challengerScore: result.challengerScore,
        opponentScore: result.opponentScore,
        winner: result.winner,
      } : null);
    } catch (e) {
      console.error("Resolve failed:", e);
    } finally {
      setResolving(false);
    }
  };

  // Auto-resolve helper (called from useEffect to avoid dependency issues)
  const handleAutoResolve = useCallback(async (_duel: DuelDetail) => {
    setResolving(true);
    try {
      const result = await resolveDuel(id);
      setDuel((prev) => prev ? {
        ...prev,
        status: result.status,
        challengerScore: result.challengerScore,
        opponentScore: result.opponentScore,
        winner: result.winner,
      } : null);
    } catch (e) {
      console.error("Auto-resolve failed:", e);
    } finally {
      setResolving(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="heavy-card animate-pulse">
          <div className="mx-auto mb-4 h-20 w-20 border-2 border-brand-gray bg-brand-gray" />
          <div className="mx-auto mb-4 h-8 w-48 border-2 border-brand-gray bg-brand-gray" />
          <div className="mx-auto mb-6 h-4 w-64 border-2 border-brand-gray bg-brand-gray" />
        </div>
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="heading-xl mb-4">RESULTADO NO DISPONIBLE</p>
        <p className="label-meta mb-6 text-muted-foreground">Este duelo no se encontró.</p>
        <Link href="/" className="btn-violet">VOLVER</Link>
      </div>
    );
  }

  // Determine who I am
  const amChallenger = myAddress && duel.challenger ? myAddress === duel.challenger : true;
  const myScore = amChallenger ? (duel.challengerScore ?? 0) : (duel.opponentScore ?? 0);
  const oppScore = amChallenger ? (duel.opponentScore ?? 0) : (duel.challengerScore ?? 0);
  const myName = amChallenger ? duel.challenger : (duel.opponent ?? "—");
  const oppName = amChallenger ? (duel.opponent ?? "—") : duel.challenger;

  // Determine outcome from MY perspective
  let resultType: "win" | "lose" | "tie" = "tie";
  if (duel.winner === null) resultType = "tie";
  else if (myAddress && duel.winner === myAddress) resultType = "win";
  else resultType = "lose";

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:text-brand-violet">
        <ArrowLeft size={16} strokeWidth={3} />
        Volver
      </Link>

      <div className="heavy-card text-center">
        <ResultBadge type={resultType} />

        {duel.challengerScore === null && duel.opponentScore === null && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="btn-jade mb-4 w-full justify-center !py-3"
          >
            {resolving ? (
              <>
                <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent" />
                CALCULANDO RESULTADOS...
              </>
            ) : (
              "CALCULAR RESULTADOS"
            )}
          </button>
        )}

        {resultType === "win" && (
          <>
            <p className="heading-xl text-brand-jade mb-2">¡GANASTE!</p>
            <p className="label-meta mb-6 text-muted-foreground">Recibiste {duel.stakeAmount * 2} USDC en tu wallet.</p>
          </>
        )}
        {resultType === "lose" && (
          <>
            <p className="heading-xl mb-2">PERDISTE EL DUELO</p>
            <p className="label-meta mb-6 text-muted-foreground">Perdiste {duel.stakeAmount} USDC, pero ahora sabés qué repasar 💪</p>
          </>
        )}
        {resultType === "tie" && (
          <>
            <p className="heading-xl mb-2">¡EMPATE!</p>
            <p className="label-meta mb-6 text-muted-foreground">Recuperaste tu garantía de {duel.stakeAmount} USDC.</p>
          </>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 border-y-2 border-brand-gray py-4">
          <div>
            <span className="label-meta text-muted-foreground">Tu score</span>
            <p className={`heading-xl ${resultType === "win" ? "text-brand-jade" : ""}`}>
              {myScore}/{duel.questionCount}
            </p>
          </div>
          <div>
            <span className="label-meta text-muted-foreground">{oppName.slice(0, 8)}..</span>
            <p className={`heading-xl ${resultType === "lose" ? "text-destructive" : ""}`}>
              {oppScore}/{duel.questionCount}
            </p>
          </div>
        </div>

        <div className="mb-6 space-y-1 text-left">
          <p className="label-meta text-muted-foreground">RESUMEN</p>
          <div className="rounded-none border-2 border-brand-gray bg-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wide">{duel.courseName}</p>
            <p className="label-meta text-muted-foreground">{duel.topic}</p>
            <p className="label-meta mt-2 flex items-center gap-1 text-muted-foreground">
              <ExternalLink size={10} strokeWidth={3} />
              Estado: {duel.status}
            </p>
          </div>
        </div>

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
