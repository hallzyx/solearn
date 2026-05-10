# Userflow: Join Duel

> The opponent (User B) finds and accepts an existing duel.

---

## Step-by-Step

### Step 1: Finding the Duel

There are two ways for User B to find a duel:

**Path A — Open duels feed:**

| Actor | Action | System |
|-------|--------|---------|
| User B | Already connected their wallet. From Home, clicks "Find duels" | Feed is displayed: |

```
┌──────────────────────────────────────────────────────────┐
│  🔍 Open duels — 3 available                             │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⚔️ Emerging Technologies                           │  │
│  │ 📖 Basic blockchain theory                         │  │
│  │ 💰 1 USDC  │  ❓ 5 questions  │  👤 @alice.sol     │  │
│  │ Created 2 min ago                                   │  │
│  │                                        [Accept →]  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⚔️ Cloud Computing                                 │  │
│  │ 📖 AWS vs Azure vs GCP                             │  │
│  │ 💰 2 USDC  │  ❓ 5 questions  │  👤 @bob.sol       │  │
│  │ Created 15 min ago                                  │  │
│  │                                        [Accept →]  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⚔️ Artificial Intelligence                         │  │
│  │ 📖 Convolutional neural networks                   │  │
│  │ 💰 5 USDC  │  ❓ 5 questions  │  👤 @carol.sol     │  │
│  │ Created 1 hour ago                                  │  │
│  │                                        [Accept →]  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Path B — Direct link:**

| Actor | Action | System |
|-------|--------|---------|
| User B | Receives a link `solearn.app/duel/abc123` via WhatsApp/Discord/Telegram | — |
| User B | Opens the link in their browser | dApp loads the duel detail screen directly |
| User B | Connects their wallet if not already | Same connection logic |

---

### Step 2: Duel Detail Screen

| Actor | Action | System |
|-------|--------|---------|
| User B | Sees the full duel detail | UI shows: |

```
┌──────────────────────────────────────────────────────┐
│               ⚔️ DUEL DETAIL                          │
│                                                      │
│  Challenger: @alice.sol                              │
│  Course: Emerging Technologies                       │
│  Topic: Basic blockchain theory                      │
│                                                      │
│  ┌────────────────────────────────────────────┐      │
│  │  💰 Stake: 1 USDC                          │      │
│  │  ❓ Questions: 5 (multiple choice)          │      │
│  │  ⏱️  Time limit: 5 minutes                 │      │
│  │  📅 Created: 2 minutes ago                  │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  📋 Rules:                                            │
│  • Both answer the same 5 questions.                  │
│  • Highest score wins.                                │
│  • A tie returns everyones stake.                     │
│  • Not answering on time forfeits your stake.         │
│                                                      │
│  Your balance: 10.5 USDC                              │
│                                                      │
│  ┌────────────────────────────────────────────┐      │
│  │       [⚔️ Accept challenge — 1 USDC]       │      │
│  └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

**Validations before showing the "Accept" button:**

| Condition | Action |
|-----------|--------|
| B's balance < stake | Button disabled: "Insufficient balance. You need 1 USDC." |
| B is the same as A | Button hidden: "You cannot accept your own duel." |
| Duel already expired | Screen shows: "This duel has expired." |
| Duel already accepted by someone else | Screen shows: "This duel already has an opponent." |
| Wallet not connected | Button shows "Connect wallet to accept" |

---

### Step 3: Accepting the Duel

| Actor | Action | System |
|-------|--------|---------|
| User B | Reviews the conditions and clicks "Accept challenge" | Sequence is triggered |

**Sub-step 3a — UI confirmation:**

| Actor | Action | System |
|-------|--------|---------|
| — | — | Confirmation modal shown: "1 USDC will be locked from your wallet. You will only recover your funds if you win or tie." |
| User B | Clicks "Yes, accept" | — |

**Sub-step 3b — On-chain transaction:**

| Actor | Action | System |
|-------|--------|---------|
| — | — | Frontend builds the instruction: `accept_duel(duel_id)` |
| User B | Signs the transaction in their wallet | — |
| — | — | Solana program: verifies the duel is in `CREATED` state, registers B as `opponent`, transfers B's stake to the escrow account, changes state to `ACCEPTED`, saves `accepted_at`. |

**Accounts involved in `accept_duel`:**

| Account | Role |
|---------|------|
| `opponent` (signer) | User B, pays the tx and the stake |
| `duel_account` (PDA) | Duel account, updated with opponent and state |
| `escrow_token_account` (PDA) | Receives B's stake (now holds 2x the stake) |
| `opponent_token_account` (ATA) | B's USDC/SOL account |
| `token_program` | Token Program |

---

### Step 4: Transition to Quiz Phase

| Actor | Action | System |
|-------|--------|---------|
| — | — | On tx confirmation, backend marks the duel as `ACCEPTED` in the off-chain DB. |
| User B | Sees a transition screen | — |

```
┌────────────────────────────────────────────┐
│          ⚔️ Duel accepted!                 │
│                                            │
│  @alice.sol vs @bob.sol                    │
│  Topic: Basic blockchain theory            │
│                                            │
│  Get ready... the quiz starts soon.        │
│                                            │
│     [▶️ Start quiz]                        │
└────────────────────────────────────────────┘
```

| User B | Clicks "Start quiz" | Navigates to the quiz screen |
| — | — | Backend changes state to `IN_PROGRESS` when both players are ready (or immediately for simplicity). |

**V1 Note:** For simplicity, the duel moves to `IN_PROGRESS` as soon as B accepts. Both players can start answering immediately when they enter the quiz screen. See `userflow_play_quiz.md` for the next phase.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| B opens the link but has no wallet | Show CTA to install Phantom/Backpack first |
| B has a wallet but is on the wrong network | Detect the network and ask to switch to Solana devnet/mainnet |
| Two users try to accept the same duel simultaneously | Contract only accepts the first to confirm the tx. The second gets an error: "Duel already accepted." |
| B clicks accept but rejects the signature | Returns to the detail screen unchanged. |
| The duel was cancelled by A while B was viewing the detail | On accept attempt, the contract rejects because state != CREATED. UI refreshes. |
| B closes the browser after accepting but before playing | The duel stays in `ACCEPTED`. If B doesn't play within the time limit, timeout applies (see `userflow_timeout_duel.md`). |
