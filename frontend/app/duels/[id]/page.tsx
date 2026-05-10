"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWalletSession } from "@solana/react-hooks";
import { ArrowLeft, Swords, AlertTriangle, BookOpen } from "lucide-react";
import Link from "next/link";
import { getDuelDetail, confirmAcceptDuel } from "@/lib/api";
import { useAcceptDuel } from "@/hooks/useProgram";
import type { DuelDetail as DuelDetailType } from "@/lib/api";

type Props = {
  params: Promise<{ id: string }>;
};

export default function DuelDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const session = useWalletSession();
  const address = session?.account?.address;

  const [duel, setDuel] = useState<DuelDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptDuelTx = useAcceptDuel();

  useEffect(() => {
    getDuelDetail(id)
      .then(setDuel)
      .catch(() => setDuel(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAccept = useCallback(async () => {
    if (!duel || !address) return;

    // 1. Compute opponent's USDC ATA
    let opponentAta: string | null = null;
    try {
      const { computeAta } = await import("@/lib/pdas");
      const { getProgramDerivedAddress, address: solAddr } = await import("@solana/kit");
      opponentAta = await computeAta(getProgramDerivedAddress, solAddr, address, "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
    } catch (e) {
      setError("No se pudo computar la dirección del token");
      return;
    }

    // 2. Compute escrow PDA if not stored
    let escrowPda = duel.escrowPda;
    if (!escrowPda && duel.onChainDuelId) {
      try {
        const { computeEscrowPda } = await import("@/lib/pdas");
        const { getProgramDerivedAddress, address: solAddr } = await import("@solana/kit");
        escrowPda = await computeEscrowPda(
          getProgramDerivedAddress, solAddr,
          "Cj6wPBbQoBZW9GbgAcUtfJEiJZiawiRKzk9JXLTzkfUR",
          duel.onChainDuelId,
          "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
        );
      } catch (e) {
        setError("No se pudo computar la dirección del escrow");
        return;
      }
    }

    if (!duel.onChainDuelId || !escrowPda || !opponentAta) {
      setError("Este duelo no tiene dirección on-chain válida.");
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      await acceptDuelTx.execute({
        opponent: address,
        opponentAta,
        duelPda: duel.onChainDuelId,
        escrowPda,
      });

      // Only sync DB when on-chain tx SUCCEEDED
      await confirmAcceptDuel(duel.id, {
        opponent: address,
        opponentAta,
        onChainDuelId: duel.onChainDuelId,
      }).catch(() => {});

      setAccepted(true);
    } catch (e: any) {
      // #6002 = InvalidStatus → duel already accepted on-chain by someone else
      const isAlreadyAccepted =
        e?.message?.includes("6002") ||
        e?.cause?.message?.includes("6002");

      if (isAlreadyAccepted) {
        // Reconcile DB: the opponent already accepted on a previous attempt.
        // Force-sync the DB so this user can proceed to the quiz.
        confirmAcceptDuel(duel.id, {
          opponent: duel.opponent || address,
          opponentAta,
          onChainDuelId: duel.onChainDuelId,
        }).catch(() => {});
        setAccepted(true);
        return;
      }

      const msg = e instanceof Error ? e.message : "Error al aceptar el duelo";
      try {
        const updated = await getDuelDetail(duel.id);
        if (updated.status === "ACCEPTED") {
          setAccepted(true);
          return;
        }
      } catch {}
      setError(msg);
    } finally {
      setAccepting(false);
    }
  }, [duel, address, acceptDuelTx]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="heavy-card animate-pulse">
          <div className="mb-4 h-6 w-48 border-2 border-brand-gray bg-brand-gray" />
          <div className="mb-6 h-4 w-64 border-2 border-brand-gray bg-brand-gray" />
          <div className="mb-4 grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 border-2 border-brand-gray bg-brand-gray" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="heading-xl mb-4">DUELO NO ENCONTRADO</p>
        <p className="label-meta mb-6 text-muted-foreground">
          Este duelo no existe, expiró o fue cancelado.
        </p>
        <Link href="/duels" className="btn-violet">VER DUELOS</Link>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="heavy-card mx-auto max-w-md">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-brand-black bg-brand-jade">
            <Swords size={32} strokeWidth={3} />
          </div>
          <p className="heading-lg mb-2">¡DUELO ACEPTADO!</p>
          <p className="label-meta mb-6 text-muted-foreground">
            {duel.challenger.slice(0, 8)}.. vs {address?.slice(0, 6)}..
          </p>
          <p className="label-meta mb-4 text-muted-foreground">
            Tema: {duel.topic}
          </p>
          <Link href={`/duels/${duel.id}/play`} className="btn-jade">
            <BookOpen size={16} strokeWidth={3} />
            COMENZAR QUIZ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/duels" className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:text-brand-violet">
        <ArrowLeft size={16} strokeWidth={3} />
        Volver
      </Link>

      <div className="heavy-card">
        <div className="mb-6 flex items-center gap-3">
          <Swords size={24} strokeWidth={3} className="text-brand-jade" />
          <h1 className="heading-lg">{duel.courseName}</h1>
        </div>
        <p className="mb-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {duel.topic}
        </p>

        <div className="mb-6 grid grid-cols-2 gap-4 border-y-2 border-brand-gray py-4 sm:grid-cols-4">
          <div>
            <span className="label-meta text-muted-foreground">Retador</span>
            <p className="text-sm font-bold uppercase tracking-tight">{duel.challenger.slice(0, 8)}..</p>
          </div>
          <div>
            <span className="label-meta text-muted-foreground">Garantía</span>
            <p className="text-sm font-bold uppercase tracking-tight">{duel.stakeAmount} USDC</p>
          </div>
          <div>
            <span className="label-meta text-muted-foreground">Preguntas</span>
            <p className="text-sm font-bold uppercase tracking-tight">{duel.questionCount}</p>
          </div>
          <div>
            <span className="label-meta text-muted-foreground">Tiempo</span>
            <p className="text-sm font-bold uppercase tracking-tight">{duel.timeLimit / 60} min</p>
          </div>
        </div>

        <div className="mb-6 space-y-1">
          <p className="label-meta text-muted-foreground">REGLAS</p>
          <ul className="space-y-1 text-xs font-bold uppercase tracking-wide">
            <li>• Ambos responden las mismas {duel.questionCount} preguntas.</li>
            <li>• Gana quien acierte más.</li>
            <li>• Si empatan, cada uno recupera su garantía.</li>
            <li>• Si no respondés a tiempo, perdés tu stake.</li>
          </ul>
        </div>

        {duel.status === "ACCEPTED" ? (
          <Link
            href={`/duels/${duel.id}/play`}
            className="btn-jade w-full justify-center !py-3"
          >
            <BookOpen size={16} strokeWidth={3} />
            COMENZAR QUIZ
          </Link>
        ) : (
          <>
            {!address && (
              <div className="mb-4 flex items-start gap-2 border-2 border-brand-black bg-brand-violet/10 p-3">
                <AlertTriangle size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-brand-violet" />
                <p className="label-meta text-brand-violet">Conectá tu wallet para aceptar el duelo.</p>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 border-2 border-brand-black bg-red-50 p-3">
                <AlertTriangle size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-destructive" />
                <p className="label-meta text-destructive">{error}</p>
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={!address || accepting}
              className="btn-jade w-full justify-center !py-3"
            >
              {accepting ? (
                <>
                  <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent" />
                  ACEPTANDO...
                </>
              ) : (
                <>
                  <Swords size={16} strokeWidth={3} />
                  ACEPTAR RETO — {duel.stakeAmount} USDC
                </>
              )}
            </button>
          </>
        )}

        <p className="label-meta mt-4 text-center text-muted-foreground">
          ID: {duel.id.slice(0, 8)}.. · CREADO {timeAgo(duel.createdAt)}
        </p>
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  return `Hace ${h}h`;
}
