# Solearn — Tech Stack

> Definitive MVP stack. Based on official Solana Foundation skill + available tools.

---

## 1. MVP Core Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 16 | App Router, Server Components, API Routes |
| **Language** | TypeScript | 5.x | Strict typing in frontend and backend |
| **UI** | Tailwind CSS + shadcn/ui | 4.x | Consistent components and styles |
| **State management** | Zustand | 5.x | Lightweight global state (modals, UI, wallet) |
| **Validation** | Zod | 4.x | Schemas and form validation |
| **Off-chain DB** | lowdb | — | JSON database embedded in Next.js API Routes |
| **Animation** | Framer Motion | — | Quiz question transitions |
| **AI** | DeepSeek API (OpenAI-compatible) | — | Quiz generation and grading |
| **Solana SDK** | `@solana/client` + `@solana/react-hooks` | — | Wallet connection + signing (framework-kit) |
| **Solana Kit** | `@solana/kit` | — | RPC client, transactions, codecs |
| **Solana Program** | Anchor (Rust) | — | Solana duel program |
| **Backend resolver** | `@solana/web3.js` v1 | 1.x | Node.js transaction building and signing |

---

## 2. Agent Skills

```
.agents/skills/solana-dev/
├── SKILL.md              → Main guide (Solana Foundation v1.1.0)
└── references/
    ├── kit/              → @solana/kit patterns
    ├── anchor/           → Anchor program development
    ├── security.md       → Security checklist
    ├── payments.md       → Payment handling
    ├── common-errors.md  → Frequent errors and solutions
    └── ...
```

### Available Skills

| Skill | Location | Purpose |
|-------|----------|---------|
| **solana-dev** (project) | `solearn/.agents/skills/solana-dev/` | Official Solana Foundation v1.1.0 guide → **use this** |

---

## 3. Available MCP Tools

| Tool | Purpose |
|------|---------|
| `solanaMcp_Solana_Expert__Ask_For_Help` | Specific Solana documentation queries (RAG) |
| `solanaMcp_Solana_Documentation_Search` | Semantic search across docs corpus |
| `solanaMcp_list_sections` | List available documentation sections |
| `solanaMcp_get_documentation` | Get full documentation for a section |

---

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  Next.js 16 + @solana/react-hooks + shadcn/ui          │
│  - Screens: Home, Create, Join, Quiz, Result            │
│  - Wallet connection via @solana/client                  │
│  - Client-side timer management                         │
│  - Global state with Zustand 5                          │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
      API calls                 wallet tx
      (fetch /api/...)         (@solana/client)
           │                          │
┌──────────▼──────────┐     ┌─────────▼───────────────────┐
│   API ROUTES (Next) │     │   SOLANA PROGRAM            │
│                     │     │   (Anchor / Rust)           │
│ - POST /api/duels   │     │                            │
│   → generate quiz   │     │ - create_duel()            │
│ - POST /api/answers │     │ - accept_duel()            │
│   → grade           │     │ - resolve_duel()           │
│ - lowdb persistence │     │ - claim_timeout()          │
│ - Timeout detection │     │ - Fund escrow              │
│ - DeepSeek API      │     │ - Automatic distribution   │
└─────────────────────┘     └────────────────────────────┘
```

### Data Flow

```
1. User A creates duel
   Frontend → POST /api/duels → AI generates quiz → lowdb saves
   Frontend → create_duel() on-chain → escrow lock

2. User B accepts duel
   Frontend → accept_duel() on-chain → escrow lock

3. Both play
   Frontend → POST /api/answers → lowdb saves answers

4. Backend resolves
   Backend → grades answers → resolve_duel() on-chain → escrow distributes
```

---

## 5. Duel Lifecycle

```
CREATED ──→ ACCEPTED ──→ IN_PROGRESS ──→ COMPLETED
   │             │              │
   │             │              └──→ TIMED_OUT (abandonment)
   │             │
   │             └──→ CANCELLED (challenger backs out before being accepted)
   │
   └──→ EXPIRED (no one accepted within time limit)
```

| State | Meaning | Who Can Act |
|-------|---------|-------------|
| `CREATED` | Duel created, A's stake locked, waiting for rival | Challenger can cancel |
| `ACCEPTED` | Both stakes locked, ready to play | System starts quiz |
| `IN_PROGRESS` | Quiz in progress, timer running | Players answer |
| `COMPLETED` | Scores submitted, funds distributed | Read-only |
| `TIMED_OUT` | One player didn't respond, the other claimed | Read-only |
| `CANCELLED` | Challenger cancelled before being accepted | Read-only |
| `EXPIRED` | No one accepted in time | Challenger claims refund |

---

## 6. Solana Program Instructions

### 6.1 Instructions

| Instruction | Signer | Required State | Action |
|------------|--------|----------------|--------|
| `create_duel` | Challenger | — | Creates duel PDA with `question_count`, `time_limit`, locks A's stake, state → `CREATED` |
| `accept_duel` | Opponent | `CREATED` | Registers opponent, locks B's stake, state → `ACCEPTED` |
| `resolve_duel` | Resolver (backend) | `ACCEPTED` or `IN_PROGRESS` | Receives scores, distributes funds, state → `COMPLETED` |
| `claim_timeout` | Resolver (backend) | `ACCEPTED` or `IN_PROGRESS` | Verifies expired time, pays the active player, state → `TIMED_OUT` |
| `cancel_duel` | Challenger | `CREATED` | Returns stake to A, state → `CANCELLED` |

### 6.2 Accounts (PDAs)

| Account | Seeds | Stores |
|---------|-------|--------|
| `duel_account` | `["duel", duel_id]` | challenger, opponent, stake, question_count, time_limit, state, scores, timestamps |
| `escrow_token_account` | `["escrow", duel_pda, mint]` | Locked funds (token account) |

---

## 7. Off-Chain Data Model (Backend)

```
Duel (off-chain):
  id: UUID
  on_chain_address: Pubkey (duel PDA on Solana)
  status: enum
  challenger: Pubkey
  opponent: Pubkey | null
  course_name: string
  topic: string
  stake_amount: number (in lamports or USDC units)
  question_count: number (options: 3, 5, 10)
  time_limit: number (in seconds, options: 180, 300, 600)
  questions: Question[]
  challenger_answers: Answer[] | null
  opponent_answers: Answer[] | null
  challenger_score: number | null
  opponent_score: number | null
  created_at: timestamp
  accepted_at: timestamp | null
  started_at: timestamp | null
  completed_at: timestamp | null

Question:
  id: number (1-5)
  text: string
  options: string[] (4 options)
  correct_index: number (0-3)

Answer:
  question_id: number
  selected_index: number (0-3)
```

---

## 8. Technical Decisions and Justification

| Decision | Justification |
|----------|---------------|
| **Off-chain AI for generation and grading** | Doing it on-chain would require complex oracles or zk-proofs. For MVP, the backend acts as a trusted oracle. Correct for a hackathon. |
| **Symmetric stake** | Simplifies the contract (no need for different stake pools) and keeps the duel fair. |
| **Same questions, same order (V1)** | Simplifies grading and avoids difficulty bias. V2 can randomize order. |
| **Backend resolves the duel (pays the tx)** | The backend has its own keypair and calls `resolve_duel()` and `claim_timeout()`. Players don't pay gas for resolution. |
| **USDC as primary currency** | Stablecoin = no volatility risk. The student knows exactly how much they're risking. SOL also accepted as alternative. |
| **Solana over other chains** | Sub-second transactions, fees under $0.01, mature wallet ecosystem. Ideal for student micro-stakes. |
| **Variable questions and time (V1)** | Both parameters are configurable by the challenger. Implementation cost is minimal (1 extra field in the contract, selectors in the form) and avoids painful refactors later. Options are predefined, not free, to keep the contract predictable. |
| **Timeout as safety mechanism** | Without this, one player could lock the other's funds indefinitely. The contract must allow claiming after time expires. Uses `time_limit` stored per duel. |
| **lowdb over PostgreSQL/MongoDB** | MVP doesn't need a full database engine. lowdb is a JSON file that lives inside Next.js, zero config, zero ops. Enough for a hackathon. |
| **Next.js API Routes over separate backend** | Everything lives in the same Next.js project. Fewer things to deploy, less configuration. Ideal for MVP. |
| **@solana/client + @solana/react-hooks over wallet-adapter** | This is the stack recommended by Solana Foundation. wallet-adapter is deprecated (`@solana/web3.js` is legacy). |
| **Zustand over Redux/Context** | Less boilerplate than Redux, more performant than Context for frequent re-renders (like the quiz timer). |
| **@solana/web3.js v1 for backend resolver** | `@solana/kit` codecs have Node.js compatibility issues. web3.js v1 is battle-tested in server environments. |
| **BroadcastChannel for cross-tab sync** | Simpler and faster than polling. Works within the same browser for both players' tabs. |
| **Pure-JS base58 for PDA/ATA computation** | Avoids `@solana/kit` codec issues that arise when the same code runs in both browser and Node.js. |

---

## 9. Next.js 16 Notes

> ⚠️ This project uses Next.js 16. Check `node_modules/next/dist/docs/` before writing code.

### Key Changes from Next.js 15

- **React 19** under the hood with React Compiler (no manual `useMemo`/`useCallback` required)
- Possible changes in Server Components vs Client Components conventions
- Check local documentation at `node_modules/next/dist/docs/` before implementing any new feature

### Stack Compatibility with Next.js 16

| Library | Compatibility |
|---------|--------------|
| `@solana/react-hooks` | Yes (framework-kit) |
| `shadcn/ui` | Yes (pure Tailwind CSS) |
| `Zustand 5` | Yes |
| `Zod 4` | Yes |
| `lowdb` | Yes |
| `Framer Motion` | Verify on Next 16 |
| `Vercel AI SDK 5` | Yes |

---

## 10. Agent Skill — Quick Reference

### solana-dev (local project)

```
Path: solearn/.agents/skills/solana-dev/SKILL.md
Trigger: "build a Solana dapp", "set up wallet connection", "deploy to devnet"
```

### Available References in the Skill

| File | When to Read It |
|------|-----------------|
| `frontend-framework-kit.md` | Before writing any React component that connects a wallet |
| `kit-web3-interop.md` | If integrating with libraries using web3.js |
| `programs-anchor.md` | Before writing the Solana program |
| `testing.md` | Before writing tests |
| `security.md` | Before deployment — mandatory checklist |
| `payments.md` | For USDC/SOL handling |
| `common-errors.md` | If finding strange toolchain errors |
