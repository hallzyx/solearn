# Userflow: Resolve Duel

> The backend sends scores to the smart contract. The contract determines the winner and distributes the funds.

---

## Step-by-Step

### Step 1: Answer Grading (backend)

| Actor | Action | System |
|-------|--------|---------|
| — | — | Both players have finished the quiz (status `finished`) or the global timer expired. |
| — | — | Backend executes grading: |

```python
def grade_duel(duel):
    challenger_score = 0
    opponent_score = 0

    for question in duel.questions:
        correct = question.correct_index

        challenger_answer = duel.challenger_answers.get(question.id)
        if challenger_answer and challenger_answer.selected_index == correct:
            challenger_score += 1

        opponent_answer = duel.opponent_answers.get(question.id)
        if opponent_answer and opponent_answer.selected_index == correct:
            opponent_score += 1

    return challenger_score, opponent_score
```

| — | — | Backend stores the scores and changes the duel status to `READY_TO_RESOLVE`. |

---

### Step 2: Waiting for Results (frontend)

| Actor | Action | System |
|-------|--------|---------|
| User | Is on the waiting screen | Frontend listens for BroadcastChannel events from the other player |
| — | — | When both have finished, both tabs are redirected to `/duels/:id/result` |

```
┌────────────────────────────────────────────┐
│                                            │
│         ⚖️ Calculating results...          │
│                                            │
│     DeepSeek AI is grading the answers.     │
│                                            │
└────────────────────────────────────────────┘
```

---

### Step 3: On-Chain Resolution (backend → smart contract)

| Actor | Action | System |
|-------|--------|---------|
| — | — | When the user clicks "Calculate Results", the backend calls `POST /api/duels/:id/resolve` |
| — | — | The backend grades answers using off-chain DB, then builds, signs, and sends `resolve_duel(score_a, score_b)` on-chain |
| — | — | The transaction is sent to Solana. |

**Contract logic in `resolve_duel`:**

```rust
pub fn resolve_duel(ctx: Context<ResolveDuel>, score_a: u8, score_b: u8) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    // Only the authorized resolver can call
    require!(ctx.accounts.resolver.key() == duel.resolver, ErrorCode::Unauthorized);

    // Only resolve if in ACCEPTED or IN_PROGRESS state
    require!(duel.status == DuelStatus::Accepted || duel.status == DuelStatus::InProgress,
             ErrorCode::InvalidStatus);

    // Save scores
    duel.score_a = score_a;
    duel.score_b = score_b;

    // Determine winner and transfer
    let total_pot = duel.stake_amount * 2;

    if score_a > score_b {
        // Challenger wins all
        transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.challenger_ata, total_pot)?;
        duel.winner = Some(duel.challenger);
    } else if score_b > score_a {
        // Opponent wins all
        transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.opponent_ata, total_pot)?;
        duel.winner = Some(duel.opponent);
    } else {
        // Tie: return each player their stake
        transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.challenger_ata, duel.stake_amount)?;
        transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.opponent_ata, duel.stake_amount)?;
        duel.winner = None; // None = tie
    }

    duel.status = DuelStatus::Completed;
    Ok(())
}
```

**Accounts involved in `resolve_duel`:**

| Account | Role |
|---------|------|
| `resolver` (signer) | Backend keypair authorized to resolve |
| `duel_account` (PDA) | Duel state, updated with scores and winner |
| `escrow_token_account` (PDA) | Source of the funds |
| `challenger_token_account` (ATA) | Destination if A wins or tie |
| `opponent_token_account` (ATA) | Destination if B wins or tie |
| `token_program` | Token Program |

**Why does the backend pay the tx?**
- Players already paid their stake and the creation/acceptance tx.
- We don't want them to pay additional gas for resolution.
- The backend as "resolver" is a trusted oracle in V1. V2 can decentralize.

---

### Step 4: Result Screen

| Actor | Action | System |
|-------|--------|---------|
| — | — | On-chain transaction confirmed. Backend updates status to `COMPLETED`. |
| User | Frontend detects state change and shows the result screen | — |

**Case: Win (User A won)**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                   🏆 YOU WIN!                         │
│                                                      │
│  Your score: 4/5                                     │
│  @bob.sol's score: 2/5                               │
│  Questions: 5 · Time: 5 min                          │
│                                                      │
│  You received 2.0 USDC in your wallet.               │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Summary                                 │    │
│  │  Course: Emerging Technologies               │    │
│  │  Topic: Basic blockchain theory              │    │
│  │  Tx: 4xK9...f3a  (View on Solscan)          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⚔️ Rematch]    [📚 New topic]                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Case: Lose (User B lost)**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                   📚 You lost the duel                 │
│                                                      │
│  Your score: 2/5                                     │
│  @alice.sol's score: 4/5                             │
│  Questions: 5 · Time: 5 min                          │
│                                                      │
│  You lost 1.0 USDC, but now you know what to study 💪│
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Summary                                 │    │
│  │  Course: Emerging Technologies               │    │
│  │  Topic: Basic blockchain theory              │    │
│  │  Tx: 4xK9...f3a  (View on Solscan)          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⚔️ Rematch]    [📚 New topic]                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Case: Tie**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                   🤝 It's a tie!                      │
│                                                      │
│  Both scored 3/5                                     │
│                                                      │
│  Questions: 5 · Time: 5 min                          │
│                                                      │
│  You got your 1.0 USDC stake back.                   │
│                                                      │
│  [⚔️ Rematch]    [📚 New topic]                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### Step 5: Post-Result Actions

| Button | Behavior |
|--------|----------|
| **Rematch** | Creates a new duel with the same course and topic. Navigates to the creation form pre-filled. |
| **New topic** | Navigates to a clean creation form to start a duel on a different topic. |
| **View on Solscan** | External link to Solana explorer for the resolution transaction. |
| **AI Explanation — 0.1 USDC** | Pays 0.1 USDC via wallet, then generates an AI explanation of all questions and answers (text + ElevenLabs audio). |

---

### Step 6: Answer Review

After the duel is resolved, both players see their answers marked:
- Green = correct answer
- Red = their wrong answer
- Each question shows which option was the correct one and which the player selected

---

## Sequence Diagram (resolve)

```
User A       Frontend A      Backend         Contract        Frontend B      User B
    |               |               |               |               |               |
    |   finished    |               |               |               |   finished    |
    |-------------->|               |               |               |<--------------|
    |               | POST /answers |               |               | POST /answers |
    |               |-------------->|               |               |-------------->|
    |               |               |               |               |               |
    |               |               | both finished → grade scores                 |
    |               |               |               |               |               |
    |  redirected   |               |               |               |  redirected   |
    |<--------------|               |               |               |-------------->|
    |               |               |               |               |               |
    |               |   resolve_duel|               |               |               |
    |               |-------------->|               |               |               |
    |               |               | distribute    |               |               |
    |               |               | funds         |               |               |
    |               |               |<--------------|               |               |
    |               |               |               |               |               |
    |   result      |               |               |   result      |               |
    |<--------------|               |               |-------------->|               |
```

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Backend fails to send `resolve_duel` | Retries with exponential backoff. Duel stays in `READY_TO_RESOLVE`. Frontends continue showing waiting screen. |
| Contract reverts `resolve_duel` (invalid scores) | Backend logs the error, notifies frontends with generic message. |
| A player closes the browser before seeing results | On returning, the result page auto-loads (state is in DB and on-chain). |
| Double resolution attempt | Contract rejects because state is already `COMPLETED`. Backend detects and just notifies frontends. |
| Backend goes down before resolving | Duel stays in `READY_TO_RESOLVE`. On restart, backend processes pending duels. |
| Player disagrees with grading | V1: no dispute mechanism. V2: community review or commit-reveal. |
