"use client";

import { use, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useWalletSession } from "@solana/react-hooks";
import { ArrowLeft, Swords, Coins, Clock, User, AlertTriangle, BookOpen } from "lucide-react";
import Link from "next/link";

// ─── Mock data ───

const MOCK_DUELS: Record<string, {
  id: string;
  challenger: string;
  courseName: string;
  topic: string;
  stakeAmount: number;
  questionCount: number;
  timeLimit: number;
  createdAt: string;
  challengerToken: string;
}> = {
  duel_001: {
    id: "duel_001",
    challenger: "alice.sol",
    courseName: "TECNOLOGÍAS EMERGENTES",
    topic: "TEORÍA BÁSICA DE BLOCKCHAIN",
    stakeAmount: 1,
    questionCount: 5,
    timeLimit: 300,
    createdAt: "Hace 2 min",
    challengerToken: "0xAlice...abc",
  },
};

// ─── Types ───

type Props = {
  params: Promise<{ id: string }>;
};

// ─── Page ───

export default function DuelDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const session = useWalletSession();
  const address = session?.account?.address;

  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const duel = MOCK_DUELS[id];

  const handleAccept = useCallback(async () => {
    if (!duel || !address) return;
    setAccepting(true);

    // Simulate: send accept_duel tx to Solana
    await new Promise((r) => setTimeout(r, 2000));

    setAccepting(false);
    setAccepted(true);
  }, [duel, address]);

  // Not found
  if (!duel) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="heading-xl mb-4">DUELO NO ENCONTRADO</p>
        <p className="label-meta mb-6 text-muted-foreground">
          Este duelo no existe o ya expiró.
        </p>
        <Link href="/duels" className="btn-violet">
          VER DUELOS
        </Link>
      </div>
    );
  }

  // Accepted
  if (accepted) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="heavy-card mx-auto max-w-md">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-brand-black bg-brand-jade">
            <Swords size={32} strokeWidth={3} />
          </div>
          <p className="heading-lg mb-2">¡DUELO ACEPTADO!</p>
          <p className="label-meta mb-6 text-muted-foreground">
            {duel.challenger} vs {address?.slice(0, 6)}..
          </p>
          <Link
            href={`/duels/${duel.id}/play`}
            className="btn-jade"
          >
            <BookOpen size={16} strokeWidth={3} />
            COMENZAR QUIZ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/duels"
        className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:text-brand-violet"
      >
        <ArrowLeft size={16} strokeWidth={3} />
        Volver
      </Link>

      <div className="heavy-card">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Swords size={24} strokeWidth={3} className="text-brand-jade" />
          <h1 className="heading-lg">{duel.courseName}</h1>
        </div>

        <p className="mb-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {duel.topic}
        </p>

        {/* Stats grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 border-y-2 border-brand-gray py-4 sm:grid-cols-4">
          <div>
            <span className="label-meta text-muted-foreground">Retador</span>
            <p className="text-sm font-bold uppercase tracking-tight">{duel.challenger}</p>
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

        {/* Rules */}
        <div className="mb-6 space-y-1">
          <p className="label-meta text-muted-foreground">REGLAS</p>
          <ul className="space-y-1 text-xs font-bold uppercase tracking-wide">
            <li>• Ambos responden las mismas {duel.questionCount} preguntas.</li>
            <li>• Gana quien acierte más.</li>
            <li>• Si empatan, cada uno recupera su garantía.</li>
            <li>• Si no respondés a tiempo, perdés tu stake.</li>
          </ul>
        </div>

        {/* Wallet validation */}
        {!address && (
          <div className="mb-4 flex items-start gap-2 border-2 border-brand-black bg-brand-violet/10 p-3">
            <AlertTriangle size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-brand-violet" />
            <p className="label-meta text-brand-violet">
              Conectá tu wallet para aceptar el duelo.
            </p>
          </div>
        )}

        {/* Accept */}
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

        {/* ID meta */}
        <p className="label-meta mt-4 text-center text-muted-foreground">
          ID: {duel.id} · CREADO {duel.createdAt}
        </p>
      </div>
    </div>
  );
}
