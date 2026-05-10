# Userflow: Create Duel

> The challenger (User A) creates a duel defining the course, topic, stake, question count, and time limit.

---

## Step-by-Step

### Step 1: Landing + Wallet Connection

| Actor | Action | System |
|-------|--------|---------|
| User A | Opens the dApp in browser | Frontend loads the landing page |
| User A | Clicks "Connect Wallet" | Wallet selection modal opens (Phantom, Backpack, Solflare, etc.) |
| User A | Approves connection in wallet | dApp obtains A's `Pubkey` and displays: USDC/SOL balance, avatar/identicon, main buttons |

**Rules:**
- If the user has no wallet installed, show a message with links to install Phantom/Backpack.
- If the user doesn't have enough USDC or SOL for minimum stake, show a warning (but don't block — they may fund later).
- The wallet stays connected for the entire session.

---

### Step 2: Home — View Options

| Actor | Action | System |
|-------|--------|---------|
| User A | Reaches Home (connected) | Two main cards are shown: |

```
┌──────────────────────────┐   ┌──────────────────────────┐
│      ⚔️ CREATE DUEL      │   │     🔍 FIND DUELS        │
│                          │   │                          │
│  Challenge someone to    │   │  3 open duels waiting    │
│  a quiz on your topic.   │   │  for an opponent.        │
│                          │   │                          │
│    [Create duel]         │   │    [View duels]          │
└──────────────────────────┘   └──────────────────────────┘
```

| User A | Clicks "Create duel" | Navigates to the creation screen |

---

### Step 3: Creation Form

| Actor | Action | System |
|-------|--------|---------|
| User A | Sees the "Create duel" form | UI displays: |

**Form fields:**

| Field | Type | Example | Validation |
|-------|------|---------|-----------|
| **Course name** | Text input | "Emerging Technologies" | Required, 3–100 characters |
| **Quiz topic** | Text input | "Basic blockchain theory" | Required, 3–200 characters |
| **Stake amount** | Selector | 0.5 USDC, 1 USDC, 2 USDC, 5 USDC | Required, must have sufficient balance |
| **Number of questions** | Selector | 3, 5, 10 | Required, predefined options |
| **Time limit** | Selector | 3 min, 5 min, 10 min | Required, predefined options |

**Predefined options (V1):**

| Parameter | Options |
|-----------|---------|
| **Stake** | 0.5 USDC, 1 USDC (default), 2 USDC, 5 USDC |
| **Questions** | 3 (quick), 5 (default), 10 (full) |
| **Time limit** | 3 min (quick), 5 min (default), 10 min (full) |

---

### Step 3b: Duel Preview

As the user fills the form, a live preview is shown:

```
┌──────────────────────────────────────────────┐
│  ⚔️ DUEL PREVIEW                             │
│                                              │
│  Challenger: @alice.sol                      │
│  Course: Emerging Technologies               │
│  Topic: Basic blockchain theory              │
│  💰 1 USDC  │  ❓ 5 q.  │  ⏱️ 5 min         │
└──────────────────────────────────────────────┘
```

**Form states:**

| State | UI |
|-------|-----|
| Empty | Placeholders: "e.g. Emerging Technologies", "e.g. Basic blockchain theory" |
| Filling | Real-time validation (min characters, sufficient balance) |
| Invalid | Red border on problematic field + error message below |
| Valid | "Create duel" button enabled |

---

### Step 4: Quiz Generation (backend + AI)

| Actor | Action | System |
|-------|--------|---------|
| — | — | Frontend calls backend: `POST /api/duels` with `{ course, topic, stake, question_count, time_limit }` |
| — | — | Backend sends the topic to DeepSeek AI with a structured prompt to generate `question_count` multiple-choice questions with 4 options each, including the correct answer. |
| — | — | AI returns the quiz in structured JSON format. |
| — | — | Backend **does NOT return questions nor correct answers to the frontend yet**. Only creates the off-chain duel entry and returns a `duel_id` and data needed for the on-chain transaction. |

**AI Prompt (example):**
```
You are a university professor expert in [topic].
Generate [question_count] multiple-choice questions (A, B, C, D) about [topic] for a
"[course]" exam. Each question must have exactly 4 options
and one clearly marked correct answer. Questions should
test conceptual understanding, not just memorization.

JSON output format:
{
  "questions": [
    {
      "text": "What is a block in a blockchain?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0
    }
  ]
}
```

---

### Step 5: On-Chain Creation (smart contract)

| Actor | Action | System |
|-------|--------|---------|
| — | — | Frontend builds the Solana instruction: `create_duel(stake_amount, question_count, time_limit, duel_id)` |
| User A | Sees confirmation modal: "You're about to create a duel on [topic] with a 1 USDC stake. This amount will be locked from your wallet." | — |
| User A | Clicks "Confirm" | Transaction sent to A's wallet for signing |
| User A | Signs the transaction in their wallet | — |
| — | — | Solana program: creates the duel PDA with status `CREATED`, transfers A's stake to the escrow token account, stores `challenger`, `stake_amount`, `question_count`, `time_limit`, `duel_id`, `created_at`. |

**Accounts involved in `create_duel`:**

| Account | Role |
|---------|------|
| `challenger` (signer) | User A, pays the tx and the stake |
| `duel_account` (PDA) | New account storing duel state |
| `escrow_token_account` (PDA) | Token account holding funds during the duel |
| `challenger_token_account` (ATA) | A's USDC account, from which the stake is debited |
| `token_program` | Token Program |
| `system_program` | For creating accounts |

---

### Step 6: Confirmation and Duel Link

| Actor | Action | System |
|-------|--------|---------|
| — | — | On on-chain confirmation, the backend marks the duel as `CREATED` in the off-chain DB. |
| User A | Sees the confirmation screen: |

```
┌────────────────────────────────────────┐
│        ✅ Duel created successfully    │
│                                        │
│  Course: Emerging Technologies         │
│  Topic: Basic blockchain theory        │
│  Stake: 1 USDC                         │
│  Questions: 5                          │
│  Time limit: 5 minutes                 │
│                                        │
│  Share this link with your rival:      │
│  ┌────────────────────────────────────┐ │
│  │ solearn.app/duel/abc123            │ │
│  └────────────────────────────────────┘ │
│  [📋 Copy link]                         │
│                                        │
│  Or wait for someone to accept it       │
│  from the open duels feed.              │
│                                        │
│       [⚔️ View my duels]              │
└────────────────────────────────────────┘
```

| User A | Copies the link and shares via WhatsApp/Telegram/Discord | — |
| User A | Or returns to Home to wait | The duel appears in the "Open duels" feed for other users |

---

### Step 7 (optional): Cancel Duel

| Actor | Action | System |
|-------|--------|---------|
| User A | From "My duels", sees their duel in `CREATED` state and clicks "Cancel" | — |
| — | — | Frontend builds `cancel_duel(duel_id)` and requests signature |
| User A | Signs the transaction | — |
| — | — | Contract verifies the duel is in `CREATED` state and the signer is the `challenger`. Releases funds back to A. Changes state to `CANCELLED`. |

**Rule:** Can only cancel if the duel is in `CREATED` state (no one has accepted yet).

---

## UI States During Creation

| Moment | UI State |
|--------|----------|
| Form being filled | Inputs active, button disabled until valid |
| Click "Create duel" | Button shows spinner, inputs disabled |
| Generating quiz (backend) | Message: "AI is generating the questions..." |
| Waiting for wallet signature | Wallet modal open (handled by wallet adapter) |
| Transaction sent | Message: "Creating duel on Solana... (tx: 4xK9...)" with explorer link |
| Transaction confirmed | Success screen with duel link |
| Error at any step | Toast with specific error message and retry button |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| User closes browser while quiz is being generated | Off-chain duel is left half-created. On-chain tx was not executed. Discarded on return. |
| AI fails to generate quiz | Error shown to user: "Could not generate the quiz. Try a more specific topic." |
| User rejects wallet signature | Off-chain duel is orphaned. Show message: "Transaction cancelled." |
| Insufficient balance detected in wallet | Contract reverts. Frontend shows error before sending tx if detected. |
| Offensive or invalid topic | V1: no filter. V2: content filter with AI. |
