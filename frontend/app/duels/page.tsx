import Link from "next/link";
import { Search, Swords, Coins, Clock, User, ArrowLeft } from "lucide-react";

// ─── Mock data ───

const MOCK_DUELS = [
  {
    id: "duel_001",
    challenger: "alice.sol",
    courseName: "TECNOLOGÍAS EMERGENTES",
    topic: "TEORÍA BÁSICA DE BLOCKCHAIN",
    stakeAmount: 1,
    questionCount: 5,
    timeLimit: 300,
    createdAt: "Hace 2 min",
  },
  {
    id: "duel_002",
    challenger: "bob.sol",
    courseName: "CLOUD COMPUTING",
    topic: "AWS VS AZURE VS GCP",
    stakeAmount: 2,
    questionCount: 5,
    timeLimit: 300,
    createdAt: "Hace 15 min",
  },
  {
    id: "duel_003",
    challenger: "carol.sol",
    courseName: "INTELIGENCIA ARTIFICIAL",
    topic: "REDES NEURONALES CONVOLUCIONALES",
    stakeAmount: 5,
    questionCount: 10,
    timeLimit: 600,
    createdAt: "Hace 1 hora",
  },
];

// ─── Page ───

export default function DuelsFeedPage() {
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
            {MOCK_DUELS.length} DISPONIBLES
          </span>
        </h1>
      </div>

      <div className="space-y-4">
        {MOCK_DUELS.map((duel) => (
          <Link
            key={duel.id}
            href={`/duels/${duel.id}`}
            className="heavy-card group block no-underline"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Left */}
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
                    {duel.challenger}
                  </span>
                  <span className="label-meta flex items-center gap-1 text-muted-foreground">
                    <Coins size={10} strokeWidth={3} />
                    {duel.stakeAmount} USDC
                  </span>
                  <span className="label-meta flex items-center gap-1 text-muted-foreground">
                    <Clock size={10} strokeWidth={3} />
                    {duel.createdAt}
                  </span>
                </div>
              </div>

              {/* Right */}
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

      {MOCK_DUELS.length === 0 && (
        <div className="heavy-card py-16 text-center">
          <p className="heading-lg mb-2">NO HAY DUELOS ABIERTOS</p>
          <p className="label-meta text-muted-foreground">
            Creá uno o volvé más tarde.
          </p>
        </div>
      )}
    </div>
  );
}
