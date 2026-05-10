"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWalletSession } from "@solana/react-hooks";
import { Swords, Clock, AlertTriangle, User } from "lucide-react";
import { getDuelQuestions, submitAnswer, getDuelDetail } from "@/lib/api";
import type { SanitizedQuestion, DuelDetail } from "@/lib/api";
import { useDuelSync } from "@/hooks/useDuelSync";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<"challenger" | "opponent">("challenger");
  const finishedRef = useRef(false);

  const { signalFinished } = useDuelSync(id, playerRole);

  useEffect(() => {
    async function load() {
      try {
        const duel = await getDuelDetail(id);
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

  useEffect(() => {
    if (finished || loading || error) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishedRef.current = true;
          setFinished(true);
          signalFinished();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finished, loading, error, signalFinished]);

  const handleSelect = useCallback(
    async (optionIndex: number) => {
      if (finished || questions.length === 0) return;
      const q = questions[currentQuestion];

      setAnswers((prev) => ({ ...prev, [q.id]: optionIndex }));

      try {
        await submitAnswer(id, { player: playerRole, questionId: q.id, selectedIndex: optionIndex });
      } catch {
        console.warn("Answer save failed, kept locally");
      }

      if (currentQuestion < questions.length - 1) {
        setTimeout(() => setCurrentQuestion((p) => p + 1), 300);
      } else {
        setTimeout(() => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            setFinished(true);
            signalFinished();
          }
        }, 500);
      }
    },
    [currentQuestion, questions, finished, id],
  );

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

  if (error || questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="heading-lg mb-2">LOADING ERROR</p>
        <p className="label-meta mb-4 text-muted-foreground">{error || "No questions available"}</p>
        <button onClick={() => router.push(`/duels/${id}`)} className="btn-violet">GO BACK</button>
      </div>
    );
  }

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;
  const timerColor = getTimerColor(timeLeft, timeLimit);
  const question = questions[currentQuestion];
  const selectedAnswer = question ? answers[question.id] : undefined;

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="heavy-card">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-brand-black bg-brand-jade">
            <Swords size={32} strokeWidth={3} />
          </div>
          <p className="heading-lg mb-2">ALL DONE!</p>
          <p className="label-meta mb-6 text-muted-foreground">
            Answers: {answeredCount}/{totalQuestions}
          </p>
          <div className="mx-auto mb-4 h-2 w-full max-w-xs border-2 border-brand-black bg-white">
            <div className="h-full bg-brand-jade" style={{ width: `${progress}%` }} />
          </div>

          <div className="mb-4 border-2 border-brand-gray p-4">
            <div className="flex items-center justify-center gap-2">
              <User size={16} strokeWidth={3} className="text-brand-violet" />
              <p className="label-meta">WAITING FOR YOUR RIVAL</p>
            </div>
            <p className="label-meta mt-2 text-muted-foreground">
              You will be redirected automatically when they finish.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock size={16} strokeWidth={3} className={timerColor} />
            <span className={`text-sm font-bold uppercase tracking-tight ${timerColor}`}>{formatTime(timeLeft)}</span>
          </div>

          <button onClick={() => router.push(`/duels/${id}/result`)} className="btn-violet">
            VIEW RESULTS (FORCE)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="heavy-card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={16} strokeWidth={3} className="text-brand-jade" />
            <span className="heading-lg text-sm">DUEL IN PROGRESS</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} strokeWidth={3} className={timerColor} />
            <span className={`text-xs font-bold uppercase tracking-wide ${timerColor}`}>{formatTime(timeLeft)}</span>
          </div>
        </div>
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="label-meta text-muted-foreground">Question {currentQuestion + 1} of {totalQuestions}</span>
            <span className="label-meta text-muted-foreground">{answeredCount}/{totalQuestions} answered</span>
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

      <div className="heavy-card">
        <div className="mb-1 flex items-center gap-2">
          <span className="label-meta text-muted-foreground">QUESTION {currentQuestion + 1}</span>
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
            ← PREVIOUS
          </button>
          <span className="label-meta text-muted-foreground">
            {currentQuestion + 1}/{totalQuestions}
          </span>
          {selectedAnswer !== undefined && currentQuestion < totalQuestions - 1 && (
            <button onClick={() => setCurrentQuestion((p) => Math.min(p + 1, totalQuestions - 1))} className="btn-jade !px-3 !py-1.5 !text-[10px]">
              NEXT →
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 border-2 border-brand-black bg-yellow-50 p-3">
        <AlertTriangle size={14} strokeWidth={3} className="mt-0.5 shrink-0 text-orange-500" />
        <p className="label-meta text-orange-500">Your answers are saved on the server. Don't close this window.</p>
      </div>
    </div>
  );
}
