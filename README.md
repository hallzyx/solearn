# Solearn ⚔️ — On-chain study duel with AI

> **Solearn** turns studying into a 1v1 duel where both players stake USDC and an AI acts as teacher and referee. Built on Solana.

---

## Index / Documentation Map

```
solearn/
├── README.md                       ← You are here
├── architecture.md                 ← System architecture, diagram, data flow
│
├── docs/                           ← Product & technical documentation
│   ├── product.md                  ← Product brief, problem, solution, value prop
│   ├── stack.md                    ← Tech stack, architecture, decisions
│   ├── userflow_create_duel.md     ← Create duel flow (challenger)
│   ├── userflow_join_duel.md       ← Accept duel flow (opponent)
│   ├── userflow_play_quiz.md       ← Quiz gameplay flow
│   ├── userflow_resolve_duel.md    ← Grading + on-chain resolution flow
│   ├── userflow_timeout_duel.md    ← Abandonment / timeout flow
│   └── userflow_ai_explanation.md  ← AI explanation + ElevenLabs voice (x402)
│
├── contracts/                      ← Solana Anchor program (Rust)
│   └── programs/solearn_duel/
│       └── src/
│           ├── lib.rs              ← Program entrypoint + account structs
│           ├── state.rs            ← Duel account layout
│           ├── error.rs            ← Error codes
│           ├── constants.rs        ← PDA seeds
│           └── instructions/       ← Handler logic per instruction
│
├── frontend/                       ← Next.js 16 app
│   ├── app/                        ← Pages + API routes
│   ├── components/                 ← UI components (shadcn/ui + custom)
│   ├── hooks/                      ← React hooks (useProgram, useDuelSync)
│   ├── lib/                        ← Core libraries (ai, db, resolver, pdas, api)
│   ├── store/                      ← Zustand stores
│   ├── DESIGN.md                   ← Design system (Vanguard Brutalist Terminal)
│   └── AGENTS.md                   ← Agent instructions for AI assistants
│
└── .env.example                    ← Required environment variables
```

---

## Quick Start

```bash
# 1. Install frontend dependencies
cd frontend && npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env: add DEEPSEEK_API_KEY, ELEVEN_LABS_API_KEY

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime |
| npm | 10+ | Package manager |
| Solana CLI | 3.x | Contract deployment |
| Anchor CLI | 1.0.2 | Contract compilation |
| Phantom / Backpack | Latest | Wallet for dApp interaction |

---

## Environment Variables

See `.env.example` for all required values. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | ✅ | AI quiz generation + explanations |
| `ELEVEN_LABS_API_KEY` | ❌ | Text-to-speech for explanations |
| `RESOLVER_SECRET_KEY` | ✅ | Backend keypair for on-chain resolution |
| `NEXT_PUBLIC_RESOLVER_PUBKEY` | ✅ | Public key of the resolver |

---

## Key Features

- **AI quiz generation** — DeepSeek generates multiple-choice questions on any topic
- **On-chain escrow** — Solana smart contract locks stakes in PDA
- **Off-chain grading** — Backend compares answers against correct ones
- **Auto resolution** — Contract distributes the pot to the winner
- **Cross-tab sync** — BroadcastChannel redirects both players when quiz ends
- **AI explanations** — Pay 0.1 USDC for detailed text + voice explanation
- **Wallet balance refresh** — Balances update after every on-chain action

---

## Project Structure

```
solearn/
├── contracts/       ← Solana program (Anchor / Rust)
├── frontend/        ← Next.js dApp
├── docs/            ← Documentation
└── .env.example     ← Environment template
```

---

## Documentation

| Doc | What it covers |
|-----|----------------|
| [`docs/product.md`](docs/product.md) | Problem, solution, value prop, feature set |
| [`docs/stack.md`](docs/stack.md) | Tech stack, architecture, decisions |
| [`docs/userflow_create_duel.md`](docs/userflow_create_duel.md) | Challenger creates a duel |
| [`docs/userflow_join_duel.md`](docs/userflow_join_duel.md) | Opponent accepts a duel |
| [`docs/userflow_play_quiz.md`](docs/userflow_play_quiz.md) | Quiz gameplay |
| [`docs/userflow_resolve_duel.md`](docs/userflow_resolve_duel.md) | Grading + on-chain resolution |
| [`docs/userflow_timeout_duel.md`](docs/userflow_timeout_duel.md) | Abandonment / timeout |
| [`docs/userflow_ai_explanation.md`](docs/userflow_ai_explanation.md) | AI explanation + voice (x402) |
| [`frontend/DESIGN.md`](frontend/DESIGN.md) | Design system (brutalist) |

---

## Network

- **Deployed on**: Solana devnet
- **Program ID**: `Cj6wPBbQoBZW9GbgAcUtfJEiJZiawiRKzk9JXLTzkfUR`
- **USDC mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Resolver wallet**: `35ibw735mSNa61tkB7UK5HAD1BJx8seVTcvKM66UejHp`

---

## License

MIT — built for the Solana hackathon.
