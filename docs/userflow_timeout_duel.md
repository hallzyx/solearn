# Userflow: Timeout Due to Abandonment

> Security mechanism for when a player abandons the duel.
> The active player claims the full pot. The player who abandoned loses their stake.

---

## Step-by-Step

### General Concept

In a duel, there are two critical time windows:

| Phase | Timeout | What Happens on Expiry |
|-------|---------|----------------------|
| **Waiting for rival** | 24 hours from `CREATED` | Duel expires. Challenger can claim refund. |
| **Quiz in progress** | Duel's `time_limit` from `IN_PROGRESS` (3, 5, or 10 min depending on challenger's selection) | The player who DIDN'T answer (or answered incompletely) loses. The other claims the pot. |

For V1, we focus primarily on the quiz timeout (the most critical case). The "waiting for rival" timeout is a nice-to-have.

---

### Scenario: Timeout During the Quiz

**Premise:** Both players accepted the duel (status `IN_PROGRESS`). One abandons (doesn't answer, closes the browser, loses internet).

---

### Step 1: Abandonment Detection (backend)

| Actor | Action | System |
|-------|--------|---------|
| — | — | Backend monitors duels in `IN_PROGRESS` or `ACCEPTED` state. |
| — | — | A background check runs periodically: |

**Detection logic:**

```python
def check_timeouts():
    active_duels = db.get_duels_in_progress()

    for duel in active_duels:
        # Time since the duel moved to IN_PROGRESS
        elapsed = now() - duel.started_at

        if elapsed > duel.time_limit:  # uses the time_limit set by the challenger
            # Did both finish?
            if duel.challenger_answers.count < duel.question_count:
                # Challenger didn't finish
                resolve_timeout(duel, abandoned='challenger', claimer='opponent')
            elif duel.opponent_answers.count < duel.question_count:
                # Opponent didn't finish
                resolve_timeout(duel, abandoned='opponent', claimer='challenger')
```

**Timeout rules:**
- If the duel's `time_limit` (3, 5, or 10 minutes since entering `IN_PROGRESS`) has passed and one player didn't answer all questions, that player is declared in abandonment.
- The backend calculates the score of the player who DID answer (even partially) for display, but the duel result automatically favors the active player.
- Unanswered questions by the abandoning player count as incorrect (0). Answered ones are graded normally.

---

### Step 2: On-Chain Claim (backend → smart contract)

| Actor | Action | System |
|-------|--------|---------|
| — | — | Backend builds and signs the transaction: `claim_timeout(duel_id)` |
| — | — | The transaction is sent to Solana. |

**Contract logic in `claim_timeout`:**

```rust
pub fn claim_timeout(ctx: Context<ClaimTimeout>) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    // Only the authorized resolver
    require!(ctx.accounts.resolver.key() == duel.resolver, ErrorCode::Unauthorized);

    // The duel must be in ACCEPTED or IN_PROGRESS state
    require!(
        duel.status == DuelStatus::Accepted || duel.status == DuelStatus::InProgress,
        ErrorCode::InvalidStatus
    );

    // Verify the time limit has actually passed
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= duel.started_at + duel.time_limit,
        ErrorCode::TimeoutNotReached
    );

    let total_pot = duel.stake_amount * 2;

    // Transfer everything to the active player
    transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.claimer_ata, total_pot)?;

    duel.winner = Some(ctx.accounts.claimer.key());
    duel.status = DuelStatus::TimedOut;

    Ok(())
}
```

**Accounts involved in `claim_timeout`:**

| Account | Role |
|---------|------|
| `resolver` (signer) | Backend keypair |
| `duel_account` (PDA) | Updated state to `TIMED_OUT` |
| `escrow_token_account` (PDA) | Source of the funds |
| `claimer_token_account` (ATA) | Destination: the player who DID NOT abandon |
| `token_program` | Token Program |

---

### Step 3: Notification to Players

**For the active player (winner by timeout):**

| Actor | Action | System |
|-------|--------|---------|
| Active user | Is on the waiting screen or returns to the app | Frontend detects state change |

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│               ⏰ Your rival didn't answer!            │
│                                                      │
│  @bob.sol didn't complete the quiz on time.           │
│                                                      │
│  You received the full pot: 2.0 USDC                  │
│                                                      │
│  Your answers: 3/5                                   │
│  (not that it mattered, but well done!)               │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Summary                                 │    │
│  │  Course: Emerging Technologies               │    │
│  │  Topic: Basic blockchain theory              │    │
│  │  Reason: Rival didn't answer                 │    │
│  │  Tx: 4xK9...f3a  (View on Solscan)          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⚔️ New duel]    [📚 New topic]                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**For the player who abandoned:**

| Actor | Action | System |
|-------|--------|---------|
| Player who abandoned | Opens the app later | Frontend detects `TIMED_OUT` state |

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│          ⏰ Time ran out                               │
│                                                      │
│  You didn't answer on time. You lost your stake       │
│  of 1.0 USDC.                                        │
│                                                      │
│  Next time, make sure you have enough time            │
│  to complete the duel.                                │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Summary                                 │    │
│  │  Course: Emerging Technologies               │    │
│  │  Topic: Basic blockchain theory              │    │
│  │  Reason: You didn't answer on time          │    │
│  │  Tx: 4xK9...f3a  (View on Solscan)          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⚔️ Try again]    [📚 New topic]                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### Step 4: Timeout for Expired Duel (no rival)

| Actor | Action | System |
|-------|--------|---------|
| User A | Created a duel 24 hours ago and no one accepted | — |
| — | — | Backend detects duels in `CREATED` state older than 24 hours |
| — | — | Changes state to `EXPIRED` off-chain |
| — | — | Frontend builds the tx: `cancel_duel(duel_id)` |
| User A | Signs the transaction | — |
| — | — | Contract releases funds back to A. State: `EXPIRED`. |

**V1 Note:** For simplicity, the "no rival" timeout can use the existing `cancel_duel` instruction without any time restriction (the user cancels whenever they want). The `EXPIRED` state is informational in the UI.

---

## State Diagram with Timeouts

```
                    ┌─────────┐
                    │ CREATED │──(A cancels)──→ CANCELLED
                    └────┬────┘
                         │
                    (B accepts)
                         │
                    ┌────▼─────┐
                    │ ACCEPTED │
                    └────┬─────┘
                         │
                    (quiz starts)
                         │
                 ┌───────▼────────┐
                 │  IN_PROGRESS   │
                 └┬──────────────┬┘
                  │              │
          (both finish)    (timer expires without
          and scores sent)   one player finishing)
                  │              │
          ┌───────▼──────┐  ┌───▼─────────┐
          │  COMPLETED   │  │  TIMED_OUT   │
          └──────────────┘  └──────────────┘
```

---

## Security Considerations

| Risk | Mitigation |
|------|-----------|
| **Frontend manipulates the timer** | The real timer is controlled by the backend. The frontend timer is visual only. The backend is the source of truth for timeouts. |
| **Player answers 1 question and closes everything to force timeout and recover** | They don't recover. Timeout always benefits the player who played more. If the rival answered even 1 more question, the rival wins. |
| **Both abandon** | Rare edge case. If neither answers anything within the duel's `time_limit`, it's considered a tie and each gets their stake back (or both are penalized — design decision). V1: return to both. |
| **Denial of service attack on the backend** | Timeout is an on-chain safety net. If the backend goes down, the contract can still be called by anyone after the time limit (with the correct data). V1: only the backend can call it. V2: any user can trigger the timeout. |
| **Resolver cheats by calling timeout before time has passed** | The contract verifies `clock.unix_timestamp >= started_at + TIME_LIMIT`. Cannot be tricked early. |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Player loses connection for 2 min but returns before timeout | Can continue answering. Backend timer keeps running. |
| Player answers 4/5 and leaves | Backend waits until timeout. If they don't return, the 4 answers are graded and compared against the rival. If the rival answered 5/5, the rival wins normally (no timeout applied because both "finished" — the backend closes the duel at global timeout even if answers are missing). |
| Duel resolved by timeout but the "winner" also had score 0 | Still wins. The abandoner loses by abandonment, not by score. |
| Backend tries to resolve by timeout but the contract was already resolved normally | Contract rejects the transaction (state is no longer IN_PROGRESS). Backend detects the error and doesn't retry. |
