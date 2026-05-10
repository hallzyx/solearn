"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Swords, Search, Zap, Coins } from "lucide-react";
import { listOpenDuels } from "@/lib/api";
import type { DuelSummary } from "@/lib/api";

/**
 * Landing page — Hero + action cards with real API data.
 */
export default function HomePage() {
  const [duels, setDuels] = useState<DuelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOpenDuels()
      .then(setDuels)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      {/* ─── Hero ─── */}
      <section className="mb-16 text-center">
        <div className="mb-6 flex justify-center">
          <span className="label-meta inline-flex items-center gap-2 rounded-none border-2 border-brand-black bg-brand-jade px-4 py-1.5 text-black">
            <Zap size={12} strokeWidth={3} />
            SOLANA DEVRET V1 — MVP
          </span>
        </div>
        <h1 className="heading-display mb-4">
          On-chain study
          <br />
          <span className="text-brand-violet">duel with AI</span>
        </h1>
        <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-muted-foreground">
          Challenge a classmate, stake USDC, and prove who knows more.
          AI generates the quiz. Solana secures the pot.
        </p>

        {/* Stats from real API */}
        <div className="flex justify-center gap-8 border-y-2 border-brand-black py-4 text-center">
          <div>
            <p className="heading-xl text-brand-violet">
              {loading ? "..." : duels.length}
            </p>
            <p className="label-meta text-muted-foreground">Open duels</p>
          </div>
          <div className="w-px bg-brand-gray" />
          <div>
            <p className="heading-xl text-brand-violet">AI</p>
            <p className="label-meta text-muted-foreground">Generated quiz</p>
          </div>
          <div className="w-px bg-brand-gray" />
          <div>
            <p className="heading-xl text-brand-violet">0</p>
            <p className="label-meta text-muted-foreground">In play</p>
          </div>
        </div>
      </section>

      {/* ─── Action Cards ─── */}
      <section className="grid gap-6 sm:grid-cols-2">
        <Link href="/create" className="heavy-card group block no-underline">
          <div className="mb-4 flex items-center gap-3">
            <Swords size={32} strokeWidth={3} className="text-brand-jade" />
            <span className="heading-lg">CREATE DUEL</span>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Pick a topic, set the stake and questions. AI generates the quiz instantly.
          </p>
          <span className="btn-jade !px-4 !py-2 !text-[10px]">CREATE DUEL</span>
          <div className="mt-4 flex items-center gap-4 border-t-2 border-brand-gray pt-3">
            <span className="label-meta text-muted-foreground">
              <Coins size={10} strokeWidth={3} className="inline" /> Stake from 0.5 USDC
            </span>
            <span className="label-meta text-muted-foreground">
              <Zap size={10} strokeWidth={3} className="inline" /> 3, 5 or 10 q.
            </span>
          </div>
        </Link>

        <Link href="/duels" className="heavy-card group block no-underline">
          <div className="mb-4 flex items-center gap-3">
            <Search size={32} strokeWidth={3} className="text-brand-violet" />
            <span className="heading-lg">FIND DUELS</span>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Find open duels and accept the challenge. Pick the one you like.
          </p>
          <span className="btn-violet !px-4 !py-2 !text-[10px]">VIEW DUELS</span>
          <div className="mt-4 flex items-center gap-4 border-t-2 border-brand-gray pt-3">
            <span className="label-meta text-muted-foreground">
              {loading ? "..." : duels.length} open duels now
            </span>
          </div>
        </Link>
      </section>

      <footer className="mt-16 border-t-2 border-brand-gray pt-4 text-center">
        <p className="label-meta text-muted-foreground">
          ID: SOL_001 · CONTRACT: Cj6wPBb…kfUR
        </p>
      </footer>
    </div>
  );
}
