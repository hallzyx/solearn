"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWalletSession } from "@solana/react-hooks";
import { Swords, ArrowLeft, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { createDuel, confirmCreateOnChain } from "@/lib/api";
import { useCreateDuel } from "@/hooks/useProgram";
import { generateDuelId } from "@/lib/solana-instructions";
import { computePdas } from "@/lib/pdas";
import { useRefreshStore } from "@/store/refreshStore";

// ─── Constants ───

const STAKE_OPTIONS = [
  { label: "0.5 USDC", value: 0.5 },
  { label: "1 USDC", value: 1 },
  { label: "2 USDC", value: 2 },
  { label: "5 USDC", value: 5 },
] as const;

const QUESTION_OPTIONS = [
  { label: "3 (quick)", value: 3 },
  { label: "5 (default)", value: 5 },
  { label: "10 (full)", value: 10 },
] as const;

const TIME_OPTIONS = [
  { label: "3 min (quick)", value: 180 },
  { label: "5 min (default)", value: 300 },
  { label: "10 min (full)", value: 600 },
] as const;

// ─── Schema ───

const createDuelSchema = z.object({
  courseName: z.string().min(3, "Min 3 characters").max(100, "Max 100 characters"),
  topic: z.string().min(3, "Min 3 characters").max(200, "Max 200 characters"),
  stakeAmount: z.number().positive("Select an amount"),
  questionCount: z.number().min(3).max(10),
  timeLimit: z.number().min(180).max(600),
});

type FormData = z.infer<typeof createDuelSchema>;

// ─── Component ───

export default function CreateDuelPage() {
  const router = useRouter();
  const session = useWalletSession();
  const address = session?.account?.address;

  const [form, setForm] = useState<FormData>({
    courseName: "",
    topic: "",
    stakeAmount: 1,
    questionCount: 5,
    timeLimit: 300,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [step, setStep] = useState<"form" | "generating" | "confirm" | "tx">("form");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [duelId, setDuelId] = useState<string | null>(null);

  const createDuelTx = useCreateDuel();
  const triggerBalanceRefresh = useRefreshStore((s) => s.triggerBalanceRefresh);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const validate = useCallback(() => {
    const result = createDuelSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormData;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return null;
    }
    setErrors({});
    return result.data;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    const data = validate();
    if (!data) return;

    if (!address) {
      alert("Connect your wallet first");
      return;
    }

    setStep("generating");

    try {
      const did = generateDuelId();
      const didHex = Array.from(did).map((b) => b.toString(16).padStart(2, "0")).join("");

      let duelPda: string | null = null;
      let escrowPda: string | null = null;
      let challengerAta: string | null = null;
      try {
        const pdas = await computePdas(did, address);
        duelPda = pdas.duelPda;
        escrowPda = pdas.escrowPda;
        challengerAta = pdas.challengerAta;
      } catch (e) {
        console.warn("PDA computation failed:", e);
      }

      const result = await createDuel({
        courseName: data.courseName,
        topic: data.topic,
        stakeAmount: data.stakeAmount,
        questionCount: data.questionCount,
        timeLimit: data.timeLimit,
        challenger: address,
        duelId: didHex,
        duelPda: duelPda ?? undefined,
        escrowPda: escrowPda ?? undefined,
        challengerAta: challengerAta ?? undefined,
      });

      setDuelId(result.id);

      if (duelPda && escrowPda && challengerAta) {
        setStep("tx");
        try {
          await createDuelTx.execute({
            challenger: address,
            resolver: process.env.NEXT_PUBLIC_RESOLVER_PUBKEY || address,
            duelPda,
            escrowPda,
            challengerAta,
            duelId: did,
            stakeAmount: data.stakeAmount,
            questionCount: data.questionCount,
            timeLimit: data.timeLimit,
          });
          console.log("✅ create_duel tx sent, sig:", createDuelTx.signature);
          triggerBalanceRefresh();

          confirmCreateOnChain(result.id, {
            onChainDuelId: duelPda,
            escrowPda,
            challengerAta,
          }).catch((e) => console.warn("DB sync warning:", e));
        } catch (txErr: any) {
          console.error("❌ create_duel tx failed:", txErr);
        }
      }

      setTxHash(result.duelId);
      setStep("confirm");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`Error creating duel: ${msg}`);
      setStep("form");
    }
  }, [validate, address, createDuelTx]);

  const isConnected = !!address;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <button
        onClick={() => router.push("/")}
        className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:text-brand-violet"
      >
        <ArrowLeft size={16} strokeWidth={3} />
        Back
      </button>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="heavy-card">
            <div className="mb-6 flex items-center gap-3">
              <Swords size={24} strokeWidth={3} className="text-brand-jade" />
              <h2 className="heading-lg">CREATE DUEL</h2>
            </div>

            {step === "form" && (
              <div className="space-y-5">
                <Field label="Course name" error={errors.courseName}>
                  <input
                    className="w-full border-2 border-brand-black bg-surface p-3 text-sm font-medium uppercase tracking-wide placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-black"
                    placeholder="e.g. EMERGING TECHNOLOGIES"
                    value={form.courseName}
                    onChange={(e) => updateField("courseName", e.target.value.toUpperCase())}
                  />
                </Field>

                <Field label="Quiz topic" error={errors.topic}>
                  <input
                    className="w-full border-2 border-brand-black bg-surface p-3 text-sm font-medium uppercase tracking-wide placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-black"
                    placeholder="e.g. BLOCKCHAIN BASICS"
                    value={form.topic}
                    onChange={(e) => updateField("topic", e.target.value.toUpperCase())}
                  />
                </Field>

                <Field label="Stake (wager)" error={errors.stakeAmount}>
                  <div className="grid grid-cols-4 gap-2">
                    {STAKE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("stakeAmount", opt.value)}
                        className={`border-2 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                          form.stakeAmount === opt.value
                            ? "border-brand-black bg-brand-jade text-black"
                            : "border-brand-gray bg-white text-muted-foreground hover:border-brand-black"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Number of questions" error={errors.questionCount}>
                  <div className="grid grid-cols-3 gap-2">
                    {QUESTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("questionCount", opt.value)}
                        className={`border-2 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                          form.questionCount === opt.value
                            ? "border-brand-black bg-brand-jade text-black"
                            : "border-brand-gray bg-white text-muted-foreground hover:border-brand-black"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Time limit" error={errors.timeLimit}>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("timeLimit", opt.value)}
                        className={`border-2 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                          form.timeLimit === opt.value
                            ? "border-brand-black bg-brand-jade text-black"
                            : "border-brand-gray bg-white text-muted-foreground hover:border-brand-black"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                {!isConnected && (
                  <div className="flex items-start gap-2 border-2 border-brand-black bg-brand-violet/10 p-3">
                    <AlertTriangle size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-brand-violet" />
                    <p className="label-meta text-brand-violet">
                      Connect your wallet to create the duel.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!isConnected}
                  className="btn-jade w-full justify-center !py-3"
                >
                  <Swords size={16} strokeWidth={3} />
                  CREATE DUEL
                </button>
              </div>
            )}

            {step === "generating" && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 h-8 w-8 animate-spin border-2 border-brand-black border-t-brand-jade" />
                <p className="heading-lg">GENERATING QUIZ</p>
                <p className="label-meta mt-2 text-muted-foreground">
                  AI is preparing the questions...
                </p>
              </div>
            )}

            {step === "confirm" && (
              <div className="py-8 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-brand-black bg-brand-jade">
                  <Swords size={32} strokeWidth={3} />
                </div>
                <p className="heading-lg mb-2">DUEL CREATED</p>
                <p className="label-meta mb-2 text-muted-foreground">
                  Duel ID: {txHash}
                </p>
                <p className="label-meta mb-6 text-muted-foreground">
                  Share the link from the duel detail page with your opponent.
                </p>
                <div className="flex flex-col gap-3">
                  {duelId && (
                    <button
                      onClick={() => router.push(`/duels/${duelId}`)}
                      className="btn-jade"
                    >
                      <Swords size={16} strokeWidth={3} />
                      GO TO DUEL
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/duels`)}
                    className="btn-violet"
                  >
                    VIEW OPEN DUELS
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="btn-violet !border-brand-gray !bg-white !text-black"
                  >
                    BACK TO HOME
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="heavy-card sticky top-8">
            <span className="label-meta mb-4 block text-muted-foreground">
              ⚔️ DUEL PREVIEW
            </span>
            <div className="space-y-3 border-t-2 border-brand-gray pt-4">
              <PreviewRow label="Challenger" value={address ? `${address.slice(0, 6)}..${address.slice(-4)}` : "— (connect wallet)"} />
              <PreviewRow label="Course" value={form.courseName || "—"} />
              <PreviewRow label="Topic" value={form.topic || "—"} />
              <PreviewRow label="Stake" value={`${form.stakeAmount} USDC`} />
              <PreviewRow label="Questions" value={`${form.questionCount}`} />
              <PreviewRow label="Time" value={`${form.timeLimit / 60} min`} />
            </div>
            <div className="mt-4 border-t-2 border-brand-gray pt-3">
              <span className="label-meta text-muted-foreground">
                ID: PREVIEW — live
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-meta mb-2 block text-muted-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-bold uppercase tracking-wide text-destructive">{error}</p>}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="label-meta text-muted-foreground">{label}</span>
      <span className="text-sm font-bold uppercase tracking-tight">{value}</span>
    </div>
  );
}
