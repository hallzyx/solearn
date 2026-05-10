# Solearn — Architecture

> System architecture, component diagram, data flow, and contract interactions.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                        │
│                                                                     │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐ │
│  │ Landing  │  │  Create  │  │  Feed   │  │  Quiz   │  │  Result  │ │
│  │  Page    │  │  Duel    │  │  Duels  │  │  Play   │  │  Screen  │ │
│  └─────────┘  └────┬─────┘  └────┬────┘  └────┬────┘  └────┬─────┘ │
│                     │             │            │            │       │
│              ┌──────▼─────────────▼────────────▼────────────▼──┐    │
│              │           WalletButton (Header)                 │    │
│              │  useBalance(SOL) + useSplToken(USDC)            │    │
│              │  Refresh via Zustand store                      │    │
│              └──────────────────────┬──────────────────────────┘    │
│                                     │                               │
│              ┌──────────────────────▼──────────────────────────┐    │
│              │          @solana/react-hooks (framework-kit)    │    │
│              │  useSendTransaction, useSplToken, useWallet     │    │
│              └──────────────────────┬──────────────────────────┘    │
│                                     │                               │
│              ┌──────────────────────▼──────────────────────────┐    │
│              │          Hooks (useProgram.ts)                   │    │
│              │  useCreateDuel, useAcceptDuel                    │    │
│              └──────────────────────┬──────────────────────────┘    │
│                                     │                               │
│              ┌──────────────────────▼──────────────────────────┐    │
│              │          Library (lib/)                         │    │
│              │  solana-instructions.ts  — instruction builders │    │
│              │  pdas.ts                — PDA/ATA computation  │    │
│              │  api.ts                 — API fetch wrappers    │    │
│              └──────────────────────┬──────────────────────────┘    │
└────────────────────────────────────┬─────────────────────────────────┘
                                     │
                   ┌─────────────────┴─────────────────┐
                   │                                   │
            API calls (fetch)                   Wallet transactions
            POST /api/duels                      create_duel()
            GET  /api/duels                       accept_duel()
            POST /api/duels/:id/answers
            POST /api/duels/:id/resolve
            POST /api/duels/:id/explain
                   │                                   │
                   ▼                                   ▼
┌──────────────────────────────────┐   ┌───────────────────────────────┐
│      API ROUTES (Next.js)        │   │    SOLANA PROGRAM (Anchor)    │
│                                  │   │                               │
│  ┌────────────────────────────┐  │   │  Program ID:                  │
│  │  lib/resolver.ts           │  │   │  Cj6wPBb...kfUR              │
│  │  @solana/web3.js v1        │  │   │                               │
│  │  Signs & sends tx          │  │   │  create_duel(stake, q, t, id) │
│  └────────────────────────────┘  │   │  accept_duel()                │
│                                  │   │  resolve_duel(sA, sB)        │
│  ┌────────────────────────────┐  │   │  claim_timeout()              │
│  │  lib/ai.ts                 │  │   │  cancel_duel()                │
│  │  DeepSeek API              │  │   │  close_duel()                 │
│  │  Quiz generation           │  │   │                               │
│  └────────────────────────────┘  │   │  Accounts:                    │
│                                  │   │  duel PDA, escrow PDA         │
│  ┌────────────────────────────┐  │   └───────────────────────────────┘
│  │  lib/db.ts                 │  │
│  │  lowdb / db.json           │  │
│  │  Off-chain storage         │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## 2. Component Tree (Frontend)

```
RootLayout
├── Providers (SolanaProvider + WalletPersistence)
│   ├── Header
│   │   ├── SolearnLogo
│   │   └── WalletButton
│   │       └── Dropdown: Address, SOL/USDC balance, Disconnect
│   └── Main (children)
│
├── HomePage        → listOpenDuels(), stats
│   └── Link to Create / Link to Duels
│
├── CreateDuelPage  → form + preview + on-chain create_duel
│   └── Field, PreviewRow
│
├── DuelsFeedPage   → listOpenDuels(), skeleton loading
│   └── DuelCard (Link)
│
├── DuelDetailPage  → getDuelDetail(), accept_duel
│   └── Rules, stats grid, Accept button / Start Quiz link
│
├── QuizPlayPage    → getDuelQuestions(), submitAnswer()
│   ├── Timer, ProgressBar, Question dots
│   ├── QuestionCard → OptionButton × 4
│   └── Finished screen (waiting for rival)
│
└── DuelResultPage  → getDuelDetail(), resolveDuel()
    ├── ResultBadge (win/lose/tie)
    ├── Score comparison
    ├── Answer review
    ├── AI Explanation button + Markdown + Audio player
    └── Rematch / New Topic
```

---

## 3. Smart Contract (Anchor / Rust)

### Instructions

| Instruction | Signer | Accounts | Args |
|-------------|--------|----------|------|
| `create_duel` | Challenger | 8 accounts (challenger, resolver, duel PDA, escrow PDA, mint, challenger ATA, token program, system program) | `stake: u64`, `q_count: u8`, `time: i64`, `id: [u8;8]` |
| `accept_duel` | Opponent | 6 accounts (opponent, duel PDA, escrow PDA, mint, opponent ATA, token program) | — |
| `resolve_duel` | Resolver | 7 accounts (resolver, duel PDA, escrow PDA, mint, challenger ATA, opponent ATA, token program) | `score_a: u8`, `score_b: u8` |
| `claim_timeout` | Resolver | 6 accounts (resolver, duel PDA, escrow PDA, mint, claimer ATA, token program) | — |
| `cancel_duel` | Challenger | 6 accounts (challenger, duel PDA, escrow PDA, mint, challenger ATA, token program) | — |
| `close_duel` | Anyone | 5 accounts (duel PDA, escrow PDA, mint, destination, token program) | — |

### PDAs

| Account | Seeds | Size |
|---------|-------|------|
| `duel` | `["duel", duel_id]` | 198 bytes |
| `escrow` | `["escrow", duel_pda_key, mint_key]` | Token account |

### Status Machine

```
CREATED ──→ ACCEPTED ──→ IN_PROGRESS ──→ COMPLETED
   │             │              │
   │             │              └──→ TIMED_OUT
   │             │
   │             └──→ CANCELLED
   │
   └──→ EXPIRED (UI only)
```

---

## 4. Backend API Routes

| Route | Method | Purpose | Key Logic |
|-------|--------|---------|-----------|
| `/api/duels` | POST | Create duel | DeepSeek AI → generate quiz → store in lowdb |
| `/api/duels` | GET | List open duels | Filter by status CREATED |
| `/api/duels/[id]` | GET | Duel detail | Includes onChainDuelId, escrowPda, ATAs |
| `/api/duels/[id]/questions` | GET | Sanitized questions | Correct index removed (never exposed during play) |
| `/api/duels/[id]/answers` | POST | Submit answer | Role-aware (challenger / opponent) |
| `/api/duels/[id]/answers` | GET | Answer review | Only after duel resolved |
| `/api/duels/[id]/resolve` | POST | Grade + resolve | gradeAnswers() + on-chain resolve_duel |
| `/api/duels/[id]/timeout` | POST | Claim timeout | Detects abandonment + on-chain claim_timeout |
| `/api/duels/[id]/accept` | POST | Sync DB after accept | Updates off-chain status to ACCEPTED |
| `/api/duels/[id]/created-on-chain` | POST | Sync DB after create | Stores on-chain PDAs |
| `/api/duels/[id]/explain` | POST | AI explanation | DeepSeek text + ElevenLabs audio |

---

## 5. Data Flow

### Create Duel

```
1. Frontend
   ├─ Generate duel_id [u8;8]
   ├─ Compute PDAs (duel + escrow) via @solana/kit
   ├─ Compute challenger USDC ATA
   ├─ POST /api/duels → DeepSeek generates quiz → lowdb saves
   └─ sendTransaction(create_duel) → wallet signs → on-chain
```

### Accept Duel

```
2. Frontend
   ├─ Compute opponent USDC ATA
   ├─ Compute escrow PDA (from onChainDuelId)
   ├─ sendTransaction(accept_duel) → wallet signs → on-chain
   └─ POST /api/duels/:id/accept → sync DB
```

### Play Quiz

```
3. Both players
   ├─ GET /api/duels/:id/questions → sanitized questions
   ├─ Player selects → POST /api/duels/:id/answers → lowdb saves
   └─ All answered (or timer expires) → signalFinished() via BroadcastChannel
```

### Resolve Duel

```
4. Any player clicks "Calculate Results"
   ├─ POST /api/duels/:id/resolve
   ├─ Backend: gradeAnswers() → compute scores
   ├─ Backend: resolveDuel() → web3.js v1 signs+send on-chain
   └─ Contract: distribute funds → winner gets pot
```

---

## 6. Key Libraries

| Library | Location | Purpose |
|---------|----------|---------|
| `ai.ts` | `frontend/lib/` | DeepSeek quiz prompt + JSON parsing |
| `resolver.ts` | `frontend/lib/` | Backend Solana tx signing (`@solana/web3.js` v1) |
| `db.ts` | `frontend/lib/` | LowDB CRUD, grading, sanitization |
| `api.ts` | `frontend/lib/` | Fetch wrappers for all API routes |
| `pdas.ts` | `frontend/lib/` | Pure-JS base58 + PDA/ATA computation |
| `solana-instructions.ts` | `frontend/lib/` | Instruction data encoding (discriminator + Borsh) |
| `useProgram.ts` | `frontend/hooks/` | React hooks for create_duel + accept_duel |
| `useDuelSync.ts` | `frontend/hooks/` | BroadcastChannel cross-tab sync |
| `refreshStore.ts` | `frontend/store/` | Zustand store for balance refresh events |

---

## 7. Design System

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#FBF9FF` | Page background |
| `brand-black` | `#000000` | Borders, structure |
| `brand-jade` | `#14F195` | Actions, success |
| `brand-violet` | `#9945FF` | Accents, network |
| `brand-gray` | `#E2D8F0` | Grid lines |
| `radius` | `0rem` | No rounded corners |

Typography: Space Grotesk (headings), Inter (body). Grid background 40px.

---

## 8. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand 5 |
| Validation | Zod 4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| AI | DeepSeek API (text), ElevenLabs (TTS) |
| Solana client | `@solana/client` + `@solana/react-hooks` (framework-kit) |
| Solana resolver | `@solana/web3.js` v1 |
| Solana program | Anchor 1.0.2 (Rust) |
| Off-chain DB | lowdb v7 |
