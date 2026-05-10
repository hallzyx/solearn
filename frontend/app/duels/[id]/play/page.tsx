"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWalletSession } from "@solana/react-hooks";
import { Swords, Clock, AlertTriangle, User } from "lucide-react";
import { getDuelQuestions, submitAnswer, getDuelDetail } from "@/lib/api";
import type { SanitizedQuestion, DuelDetail } from "@/lib/api";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getTimerColor(remaining: number, total: number): string {
  const ratio = remaining / total;
  if (ratio <= 0.1) return "text-destructive animate-pulse";
  if (ratio <= 0.2) return "text-orange-500";
  return "text-brand-black";
}

type Props = { params: Promise<{ id: string }> };

export default function QuizPlayPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const session = useWalletSession();
  const myAddress = session?.account?.address;

  const [questions, setQuestions] = useState<SanitizedQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLimit, setTimeLimit] = useState(300);
  const [timeLeft, setTimeLeft] = useState(300);
  const [finished, setFinished] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<"challenger" | "opponent">("challenger");
  const finishedRef = useRef(false);

  // Fetch questions + determine player role on mount
  useEffect(() => {
    async function load() {
      try {
        const duel = await getDuelDetail(id);
        // Determine if I'm challenger or opponent
        if (myAddress && duel.opponent && myAddress === duel.opponent) {
          setPlayerRole("opponent");
        }
        const data = await getDuelQuestions(id);
        setQuestions(data.questions);
        setTimeLimit(data.timeLimit);
        setTimeLeft(data.timeLimit);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, myAddress]);

  // Timer
  useEffect(() => {
    if (finished || loading || error) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishedRef.current = true;
          setFinished(true);
          setWaitingForOpponent(true);
          setWaitingForOpponent(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finished, loading, error]);

  // Reliable polling — checks every 1s, redirects when both players are done
  useEffect(() => {
    if (!waitingForOpponent || questions.length === 0) return;

    let active = true;
    const TOTAL = questions.length;

    const poll = async () => {
      if (!active) return;
      try {
        const duel = await getDuelDetail(id);
        if (!active) return;

        // Determine the OTHER player's progress based on my role
        const theirRole = playerRole === "challenger" ? "opponent" : "challenger";
        const theirAnswers = theirRole === "challenger" ? duel.challengerAnswers : duel.opponentAnswers;
        const theirCount = theirAnswers?.length ?? 0;

        setOpponentProgress(theirCount);

        // Redirect when they've also answered all questions
        if (theirCount >= TOTAL || duel.status === "COMPLETED" || duel.status === "READY_TO_RESOLVE" || duel.status === "TIMED_OUT") {
          router.push(`/duels/${id}/result`);
          return;
        }

        // Continue polling
        if (active) setTimeout(poll, 1000);
      } catch {
        // network error — retry
        if (active) setTimeout(poll, 2000);
      }
    };

    // Start after a short initial delay (allow answer to save server-side)
    const initial = setTimeout(poll, 1500);
    return () => { active = false; clearTimeout(initial); };
  }, [waitingForOpponent, id, questions.length, router, playerRole]);

  // Submit answer to API + local state
  const handleSelect = useCallback(
    async (optionIndex: number) => {
      if (finished || questions.length === 0) return;
      const q = questions[currentQuestion];

      // Optimistic local update
      setAnswers((prev) => ({ ...prev, [q.id]: optionIndex }));

      // Submit to API with correct player role
      try {
        await submitAnswer(id, { player: playerRole, questionId: q.id, selectedIndex: optionIndex });
      } catch {
        // Failed to save — still keep local answer
        console.warn("Answer save failed, kept locally");
      }

      // Auto-advance
      if (currentQuestion < questions.length - 1) {
        setTimeout(() => setCurrentQuestion((p) => p + 1), 300);
      } else {
        setTimeout(() => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            setFinished(true);
          }
        }, 500);
      }
    },
    [currentQuestion, questions, finished, id],
  );

  // ─── Loading ───
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="heavy-card animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4 h-12 border-2 border-brand-gray bg-brand-gray" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error || questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="heading-lg mb-2">ERROR AL CARGAR</p>
        <p className="label-meta mb-4 text-muted-foreground">{error || "No hay preguntas disponibles"}</p>
        <button onClick={() => router.push(`/duels/${id}`)} className="btn-violet">VOLVER</button>
      </div>
    );
  }

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;
  const timerColor = getTimerColor(timeLeft, timeLimit);
  const question = questions[currentQuestion];
  const selectedAnswer = question ? answers[question.id] : undefined;

  // ─── Finished screen (waits for opponent) ───
  if (finished) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="heavy-card">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-brand-black bg-brand-jade">
            <Swords size={32} strokeWidth={3} />
          </div>
          <p className="heading-lg mb-2">¡RESPONDISTE TODAS!</p>
          <p className="label-meta mb-6 text-muted-foreground">
            Respuestas: {answeredCount}/{totalQuestions}
          </p>
          <div className="mx-auto mb-4 h-2 w-full max-w-xs border-2 border-brand-black bg-white">
            <div className="h-full bg-brand-jade transition-all" style={{ width: `${progress}%` }} />
          </div>

          {/* Waiting for opponent */}
          <div className="mb-4 border-2 border-brand-gray p-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <User size={16} strokeWidth={3} className="text-brand-violet" />
              <p className="label-meta">ESPERANDO A TU RIVAL</p>
            </div>
            <div className="h-2 w-full max-w-xs mx-auto border-2 border-brand-black bg-white">
              <div
                className="h-full bg-brand-violet transition-all"
                style={{ width: `${(opponentProgress / totalQuestions) * 100}%` }}
              />
            </div>
            <p className="label-meta mt-2 text-muted-foreground">
              {opponentProgress}/{totalQuestions} respondidas
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock size={16} strokeWidth={3} className={timerColor} />
            <span className={`text-sm font-bold uppercase tracking-tight ${timerColor}`}>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => router.push(`/duels/${id}/result`)}
            className="btn-violet"
          >
            VER RESULTADOS (FORZAR)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Header */}
      <div className="heavy-card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={16} strokeWidth={3} className="text-brand-jade" />
            <span className="heading-lg text-sm">DUELO EN CURSO</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} strokeWidth={3} className={timerColor} />
            <span className={`text-xs font-bold uppercase tracking-wide ${timerColor}`}>{formatTime(timeLeft)}</span>
          </div>
        </div>
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="label-meta text-muted-foreground">Pregunta {currentQuestion + 1} de {totalQuestions}</span>
            <span className="label-meta text-muted-foreground">{answeredCount}/{totalQuestions} respondidas</span>
          </div>
          <div className="h-2 w-full border-2 border-brand-black bg-white">
            <div className="h-full bg-brand-violet transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex gap-1.5">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(idx)}
              className={`h-3 w-3 border-2 border-brand-black transition-all ${
                idx === currentQuestion ? "bg-brand-violet" : answers[q.id] !== undefined ? "bg-brand-jade" : "bg-white"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="heavy-card">
        <div className="mb-1 flex items-center gap-2">
          <span className="label-meta text-muted-foreground">PREGUNTA {currentQuestion + 1}</span>
        </div>
        <h2 className="heading-lg mb-6 !text-lg">{question?.text}</h2>

        <div className="space-y-3">
          {question?.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const labels = ["A", "B", "C", "D"];
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`flex w-full items-start gap-3 border-2 p-4 text-left text-sm font-bold uppercase tracking-wide transition-all ${
                  isSelected ? "border-brand-black bg-brand-jade/20" : "border-brand-gray bg-white hover:border-brand-black"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-brand-black bg-white text-xs font-black">
                  {labels[idx]}
                </span>
                <span className="pt-0.5 leading-tight">{option}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between border-t-2 border-brand-gray pt-4">
          <button
            onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
            disabled={currentQuestion === 0}
            className="btn-violet !px-3 !py-1.5 !text-[10px] disabled:opacity-30"
          >
            ← ANTERIOR
          </button>
          <span className="label-meta text-muted-foreground">
            {currentQuestion + 1}/{totalQuestions}
          </span>
          {selectedAnswer !== undefined && currentQuestion < totalQuestions - 1 && (
            <button onClick={() => setCurrentQuestion((p) => Math.min(p + 1, totalQuestions - 1))} className="btn-jade !px-3 !py-1.5 !text-[10px]">
              SIGUIENTE →
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 border-2 border-brand-black bg-yellow-50 p-3">
        <AlertTriangle size={14} strokeWidth={3} className="mt-0.5 shrink-0 text-orange-500" />
        <p className="label-meta text-orange-500">Tus respuestas se guardan en el servidor. No cierres esta ventana.</p>
      </div>
    </div>
  );
}
