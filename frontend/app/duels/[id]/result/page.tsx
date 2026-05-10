"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSplToken, useWalletSession } from "@solana/react-hooks";
import { Swords, Trophy, BookOpen, ExternalLink, ArrowLeft, Lightbulb } from "lucide-react";
import { getDuelDetail, resolveDuel, getExplanation } from "@/lib/api";
import { useRefreshStore } from "@/store/refreshStore";
import type { DuelDetail } from "@/lib/api";
import { Markdown } from "@/components/ui/Markdown";

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

  const triggerBalanceRefresh = useRefreshStore((s) => s.triggerBalanceRefresh);

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationAudio, setExplanationAudio] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [answersDetail, setAnswersDetail] = useState<any[] | null>(null);
  const usdc = useSplToken("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", { owner: myAddress });

  useEffect(() => {
    getDuelDetail(id)
      .then(setDuel)
      .catch(() => setDuel(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!duel || (duel.status !== "COMPLETED" && duel.status !== "READY_TO_RESOLVE" && duel.status !== "TIMED_OUT")) return;
    fetch(`/api/duels/${encodeURIComponent(id)}/answers`)
      .then((r) => r.json())
      .then((data) => data.questions && setAnswersDetail(data.questions))
      .catch(() => {});
  }, [id, duel?.status]);

  const handleGetExplanation = async () => {
    setExplaining(true);
    setExplainError(null);
    try {
      await usdc.send({
        amount: "0.1",
        destinationOwner: process.env.NEXT_PUBLIC_RESOLVER_PUBKEY!,
        authority: session as any,
      } as any);
      triggerBalanceRefresh();

      const result = await getExplanation(id);
      setExplanation(result.explanation);
      if (result.audio) setExplanationAudio(result.audio);
    } catch (e: any) {
      setExplainError(e?.message || "Error processing payment or explanation");
    } finally {
      setExplaining(false);
    }
  };

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
      triggerBalanceRefresh();
    } catch (e) {
      console.error("Resolve failed:", e);
    } finally {
      setResolving(false);
    }
  };

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
        <p className="heading-xl mb-4">RESULT NOT AVAILABLE</p>
        <p className="label-meta mb-6 text-muted-foreground">This duel was not found.</p>
        <Link href="/" className="btn-violet">GO HOME</Link>
      </div>
    );
  }

  const amChallenger = myAddress && duel.challenger ? myAddress === duel.challenger : true;
  const myScore = amChallenger ? (duel.challengerScore ?? 0) : (duel.opponentScore ?? 0);
  const oppScore = amChallenger ? (duel.opponentScore ?? 0) : (duel.challengerScore ?? 0);
  const myName = amChallenger ? duel.challenger : (duel.opponent ?? "—");
  const oppName = amChallenger ? (duel.opponent ?? "—") : duel.challenger;

  let resultType: "win" | "lose" | "tie" = "tie";
  if (duel.winner === null) resultType = "tie";
  else if (myAddress && duel.winner === myAddress) resultType = "win";
  else resultType = "lose";

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:text-brand-violet">
        <ArrowLeft size={16} strokeWidth={3} />
        Home
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
                CALCULATING RESULTS...
              </>
            ) : (
              "CALCULATE RESULTS"
            )}
          </button>
        )}

        {resultType === "win" && (
          <>
            <p className="heading-xl text-brand-jade mb-2">YOU WIN!</p>
            <p className="label-meta mb-6 text-muted-foreground">You received {duel.stakeAmount * 2} USDC in your wallet.</p>
          </>
        )}
        {resultType === "lose" && (
          <>
            <p className="heading-xl mb-2">YOU LOST THE DUEL</p>
            <p className="label-meta mb-6 text-muted-foreground">You lost {duel.stakeAmount} USDC, but now you know what to study 💪</p>
          </>
        )}
        {resultType === "tie" && (
          <>
            <p className="heading-xl mb-2">IT'S A TIE!</p>
            <p className="label-meta mb-6 text-muted-foreground">You got your {duel.stakeAmount} USDC stake back.</p>
          </>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 border-y-2 border-brand-gray py-4">
          <div>
            <span className="label-meta text-muted-foreground">Your score</span>
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

        {answersDetail && answersDetail.length > 0 && (
          <div className="mb-6 space-y-3 text-left">
            <p className="label-meta text-muted-foreground">ANSWER REVIEW</p>
            {answersDetail.map((q: any) => {
              const mySelected = amChallenger ? q.challengerSelected : q.opponentSelected;
              const oppSelected = amChallenger ? q.opponentSelected : q.challengerSelected;
              return (
                <div key={q.id} className="border-2 border-brand-gray bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide mb-2">
                    Q{q.id}. {q.text}
                  </p>
                  <div className="space-y-1">
                    {q.options.map((opt: string, i: number) => (
                      <p
                        key={i}
                        className={`text-xs pl-4 border-l-2 ${
                          i === q.correctIndex
                            ? "border-brand-jade bg-brand-jade/10 font-bold"
                            : mySelected === i && i !== q.correctIndex
                              ? "border-destructive bg-red-50"
                              : "border-transparent"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}. {opt}
                        {i === q.correctIndex && " ✓"}
                        {mySelected === i && i !== q.correctIndex && " ✗ (your answer)"}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-6 space-y-1 text-left">
          <p className="label-meta text-muted-foreground">SUMMARY</p>
          <div className="rounded-none border-2 border-brand-gray bg-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wide">{duel.courseName}</p>
            <p className="label-meta text-muted-foreground">{duel.topic}</p>
            <p className="label-meta mt-2 flex items-center gap-1 text-muted-foreground">
              <ExternalLink size={10} strokeWidth={3} />
              Status: {duel.status}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="w-full">
            {!explanation && (
              <button
                onClick={handleGetExplanation}
                disabled={explaining || !myAddress}
                className="btn-violet w-full justify-center !py-3"
              >
                <Lightbulb size={16} strokeWidth={3} />
                {explaining
                  ? "PROCESSING PAYMENT 0.1 USDC..."
                  : "AI DETAILED EXPLANATION — 0.1 USDC"}
              </button>
            )}
            {explainError && (
              <p className="label-meta mt-2 text-destructive">{explainError}</p>
            )}
          </div>
        </div>

        {explanation && (
          <div className="mb-6 border-2 border-brand-black bg-surface p-4 text-left">
            <p className="label-meta mb-2 text-brand-violet">
              <Lightbulb size={12} strokeWidth={3} className="inline" /> AI EXPLANATION
            </p>
            <div className="max-h-96 overflow-y-auto mb-3">
              <Markdown text={explanation} />
            </div>
            {explanationAudio && (
              <audio controls className="w-full mt-2">
                <source src={`data:audio/mpeg;base64,${explanationAudio}`} type="audio/mpeg" />
              </audio>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/create" className="btn-jade flex-1 justify-center">
            <Swords size={16} strokeWidth={3} />
            REMATCH
          </Link>
          <Link href="/create" className="btn-violet flex-1 justify-center">
            <BookOpen size={16} strokeWidth={3} />
            NEW TOPIC
          </Link>
        </div>
      </div>
    </div>
  );
}
