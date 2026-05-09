"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Swords, Clock, AlertTriangle } from "lucide-react";

// ─── Mock quiz data ───

const MOCK_QUESTIONS = [
  {
    id: 1,
    text: "¿Qué es un bloque en una blockchain?",
    options: [
      "Un archivo cifrado que contiene todas las wallets de la red",
      "Una estructura de datos que agrupa transacciones validadas y las enlaza criptográficamente al bloque anterior",
      "Un smart contract que ejecuta transacciones automáticamente",
      "Un servidor central que valida las transacciones de la red",
    ],
  },
  {
    id: 2,
    text: "¿Qué mecanismo usa Solana para ordenar las transacciones?",
    options: [
      "Proof of Work (PoW)",
      "Proof of Stake (PoS)",
      "Proof of History (PoH)",
      "Delegated Proof of Stake (DPoS)",
    ],
  },
  {
    id: 3,
    text: "¿Qué significa 'smart contract'?",
    options: [
      "Un contrato legal firmado digitalmente",
      "Un programa que se ejecuta automáticamente cuando se cumplen condiciones",
      "Un tipo de criptomoneda",
      "Un sistema de votación electrónica",
    ],
  },
  {
    id: 4,
    text: "¿Cuál es la principal ventaja de una blockchain pública?",
    options: [
      "Es más rápida que una base de datos tradicional",
      "No requiere electricidad para funcionar",
      "Es transparente, inmutable y descentralizada",
      "Solo puede ser modificada por el creador",
    ],
  },
  {
    id: 5,
    text: "¿Qué es un token en el contexto de blockchain?",
    options: [
      "Un dispositivo de seguridad físico",
      "Un tipo de moneda digital que opera sobre una blockchain existente",
      "Un fragmento de código malicioso",
      "Una clave privada de acceso",
    ],
  },
];

// ─── Helpers ───

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

// ─── Types ───

type Props = {
  params: Promise<{ id: string }>;
};

// ─── Page ───

export default function QuizPlayPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 min default
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  const totalQuestions = MOCK_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;
  const timerColor = getTimerColor(timeLeft, 300);

  // Timer
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finished]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (finished) return;

      const qId = MOCK_QUESTIONS[currentQuestion].id;
      setAnswers((prev) => ({ ...prev, [qId]: optionIndex }));

      // Auto-advance to next question
      if (currentQuestion < totalQuestions - 1) {
        setTimeout(() => {
          setCurrentQuestion((prev) => prev + 1);
        }, 300);
      } else {
        // Last question answered
        setTimeout(() => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            setFinished(true);
          }
        }, 500);
      }
    },
    [currentQuestion, totalQuestions, finished],
  );

  const goBack = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  }, [currentQuestion]);

  const goToQuestion = useCallback((index: number) => {
    setCurrentQuestion(index);
  }, []);

  // ─── Finished screen (waiting for opponent) ───
  if (finished) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="heavy-card">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-brand-black bg-brand-jade">
            <Swords size={32} strokeWidth={3} />
          </div>
          <p className="heading-lg mb-2">¡RESPONDISTE TODAS!</p>
          <p className="label-meta mb-6 text-muted-foreground">
            Esperando a que tu rival termine...
          </p>
          <div className="mx-auto mb-4 h-2 w-full max-w-xs border-2 border-brand-black bg-white">
            <div
              className="h-full bg-brand-jade transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Clock size={16} strokeWidth={3} className={timerColor} />
            <span className={`text-sm font-bold uppercase tracking-tight ${timerColor}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Simulate: after delay, go to result */}
          <button
            onClick={() => router.push(`/duels/${id}/result`)}
            className="btn-violet mt-6"
          >
            VER RESULTADOS (SIMULACIÓN)
          </button>
        </div>
      </div>
    );
  }

  const question = MOCK_QUESTIONS[currentQuestion];
  const selectedAnswer = answers[question?.id];

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* ─── Header ─── */}
      <div className="heavy-card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={16} strokeWidth={3} className="text-brand-jade" />
            <span className="heading-lg text-sm">DUELO EN CURSO</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} strokeWidth={3} className={timerColor} />
            <span className={`text-xs font-bold uppercase tracking-wide ${timerColor}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="label-meta text-muted-foreground">
              Pregunta {currentQuestion + 1} de {totalQuestions}
            </span>
            <span className="label-meta text-muted-foreground">
              {answeredCount}/{totalQuestions} respondidas
            </span>
          </div>
          <div className="h-2 w-full border-2 border-brand-black bg-white">
            <div
              className="h-full bg-brand-violet transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question indicator dots */}
        <div className="flex gap-1.5">
          {MOCK_QUESTIONS.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => goToQuestion(idx)}
              className={`h-3 w-3 border-2 border-brand-black transition-all ${
                idx === currentQuestion
                  ? "bg-brand-violet"
                  : answers[q.id] !== undefined
                    ? "bg-brand-jade"
                    : "bg-white"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ─── Question ─── */}
      <div className="heavy-card">
        <div className="mb-1 flex items-center gap-2">
          <span className="label-meta text-muted-foreground">
            PREGUNTA {currentQuestion + 1}
          </span>
        </div>
        <h2 className="heading-lg mb-6 !text-lg">{question?.text}</h2>

        {/* Options */}
        <div className="space-y-3">
          {question?.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const labels = ["A", "B", "C", "D"];
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`flex w-full items-start gap-3 border-2 p-4 text-left text-sm font-bold uppercase tracking-wide transition-all ${
                  isSelected
                    ? "border-brand-black bg-brand-jade/20"
                    : "border-brand-gray bg-white hover:border-brand-black"
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

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t-2 border-brand-gray pt-4">
          <button
            onClick={goBack}
            disabled={currentQuestion === 0}
            className="btn-violet !px-3 !py-1.5 !text-[10px] disabled:opacity-30"
          >
            ← ANTERIOR
          </button>
          <span className="label-meta text-muted-foreground">
            {currentQuestion + 1}/{totalQuestions}
          </span>
          {selectedAnswer !== undefined && currentQuestion < totalQuestions - 1 && (
            <button
              onClick={() => setCurrentQuestion((p) => Math.min(p + 1, totalQuestions - 1))}
              className="btn-jade !px-3 !py-1.5 !text-[10px]"
            >
              SIGUIENTE →
            </button>
          )}
        </div>
      </div>

      {/* Offline warning */}
      <div className="mt-4 flex items-start gap-2 border-2 border-brand-black bg-yellow-50 p-3">
        <AlertTriangle size={14} strokeWidth={3} className="mt-0.5 shrink-0 text-orange-500" />
        <p className="label-meta text-orange-500">
          Tus respuestas se guardan localmente. No cierres esta ventana.
        </p>
      </div>
    </div>
  );
}
