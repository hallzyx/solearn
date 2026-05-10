"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Swords, Coins, Clock, User, ArrowLeft } from "lucide-react";
import { listOpenDuels } from "@/lib/api";
import type { DuelSummary } from "@/lib/api";

/**
 * Feed of open duels — fetches from GET /api/duels.
 */
export default function DuelsFeedPage() {
  const [duels, setDuels] = useState<DuelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOpenDuels()
      .then(setDuels)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="heavy-card animate-pulse">
              <div className="mb-2 h-5 w-48 border-2 border-brand-gray bg-brand-gray" />
              <div className="mb-2 h-4 w-72 border-2 border-brand-gray bg-brand-gray" />
              <div className="h-4 w-32 border-2 border-brand-gray bg-brand-gray" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:text-brand-violet"
      >
        <ArrowLeft size={16} strokeWidth={3} />
        Volver
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <Search size={28} strokeWidth={3} className="text-brand-violet" />
        <h1 className="heading-xl">
          DUELOS ABIERTOS
          <span className="label-meta ml-3 align-middle text-muted-foreground">
            {duels.length} DISPONIBLES
          </span>
        </h1>
      </div>

      <div className="space-y-4">
        {duels.map((duel) => (
          <Link
            key={duel.id}
            href={`/duels/${duel.id}`}
            className="heavy-card group block no-underline"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Swords size={16} strokeWidth={3} className="text-brand-jade" />
                  <span className="heading-lg text-sm">{duel.courseName}</span>
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {duel.topic}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="label-meta flex items-center gap-1 text-muted-foreground">
                    <User size={10} strokeWidth={3} />
                    {duel.challenger.slice(0, 8)}..
                  </span>
                  <span className="label-meta flex items-center gap-1 text-muted-foreground">
                    <Coins size={10} strokeWidth={3} />
                    {duel.stakeAmount} USDC
                  </span>
                  <span className="label-meta flex items-center gap-1 text-muted-foreground">
                    <Clock size={10} strokeWidth={3} />
                    {timeAgo(duel.createdAt)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wide">
                    {duel.questionCount} preg.
                  </p>
                  <p className="label-meta text-muted-foreground">
                    {duel.timeLimit / 60} min
                  </p>
                </div>
                <span className="btn-jade !px-4 !py-2 !text-[10px] group-hover:translate-x-0.5 group-hover:translate-y-0.5">
                  ACEPTAR →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {duels.length === 0 && (
        <div className="heavy-card py-16 text-center">
          <p className="heading-lg mb-2">NO HAY DUELOS ABIERTOS</p>
          <p className="label-meta mb-4 text-muted-foreground">
            Creá uno o volvé más tarde.
          </p>
          <Link href="/create" className="btn-jade">
            CREAR DUELO
          </Link>
        </div>
      )}
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
