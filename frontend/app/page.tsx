import Link from "next/link";
import { Swords, Search, Zap, Coins } from "lucide-react";

/**
 * Landing page — Hero + action cards.
 */
export default function HomePage() {
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
          Duelo de estudio
          <br />
          <span className="text-brand-violet">on-chain con IA</span>
        </h1>
        <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-muted-foreground">
          Retá a un compañero, apostá USDC, y demostrá quién sabe más.
          La IA genera las preguntas. Solana asegura el pozo.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-8 border-y-2 border-brand-black py-4 text-center">
          <div>
            <p className="heading-xl text-brand-violet">7</p>
            <p className="label-meta text-muted-foreground">Duelos activos</p>
          </div>
          <div className="w-px bg-brand-gray" />
          <div>
            <p className="heading-xl text-brand-violet">12</p>
            <p className="label-meta text-muted-foreground">Jugadores</p>
          </div>
          <div className="w-px bg-brand-gray" />
          <div>
            <p className="heading-xl text-brand-violet">42</p>
            <p className="label-meta text-muted-foreground">USDC en juego</p>
          </div>
        </div>
      </section>

      {/* ─── Action Cards ─── */}
      <section className="grid gap-6 sm:grid-cols-2">
        {/* Card: Crear Duelo */}
        <Link href="/create" className="heavy-card group block no-underline">
          <div className="mb-4 flex items-center gap-3">
            <Swords size={32} strokeWidth={3} className="text-brand-jade" />
            <span className="heading-lg">CREAR DUELO</span>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Retá a alguien a un quiz sobre tu tema.
            Vos definís el stake, las preguntas y el tiempo.
          </p>
          <div className="flex items-center gap-2">
            <span className="btn-jade !px-4 !py-2 !text-[10px]">
              CREAR DUELO
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 border-t-2 border-brand-gray pt-3">
            <span className="label-meta text-muted-foreground">
              <Coins size={10} strokeWidth={3} className="inline" /> Stake desde 0.5 USDC
            </span>
            <span className="label-meta text-muted-foreground">
              <Zap size={10} strokeWidth={3} className="inline" /> 3, 5 o 10 preg.
            </span>
          </div>
        </Link>

        {/* Card: Buscar Duelos */}
        <Link href="/duels" className="heavy-card group block no-underline">
          <div className="mb-4 flex items-center gap-3">
            <Search size={32} strokeWidth={3} className="text-brand-violet" />
            <span className="heading-lg">BUSCAR DUELOS</span>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Encontrá duelos abiertos y aceptá el reto.
            Elegí el que más te guste y demostrá lo que sabés.
          </p>
          <div className="flex items-center gap-2">
            <span className="btn-violet !px-4 !py-2 !text-[10px]">
              VER DUELOS
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 border-t-2 border-brand-gray pt-3">
            <span className="label-meta text-muted-foreground">
              3 duelos abiertos ahora
            </span>
          </div>
        </Link>
      </section>

      {/* ─── Footer meta ─── */}
      <footer className="mt-16 border-t-2 border-brand-gray pt-4 text-center">
        <p className="label-meta text-muted-foreground">
          ID: SOL_001 · CONTRATO: Cj6wPBb…kfUR · CREADO CON ANCHOR 1.0.2
        </p>
      </footer>
    </div>
  );
}
