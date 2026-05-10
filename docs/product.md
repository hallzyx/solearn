# Solearn — Product Brief

> Solearn turns studying for college into a 1v1 duel where both players stake money and an AI acts as teacher and referee.

---

## 1. Product Identity

| Field | Description |
|-------|-------------|
| **Name** | Solearn |
| **Tagline** | On-chain study duel with AI |
| **Platform** | Solana (devnet for MVP, mainnet post-hackathon) |
| **Target audience** | University students (18–25) in tech, digital business, computer science |
| **Product type** | dApp (decentralized application) |

---

## 2. Problem

University students procrastinate and struggle to maintain study discipline before exams. Current study tools (flashcards, videos, PDFs, quiz platforms) are **passive** and lack three critical elements:

1. **Real accountability** — No tangible consequences if you don't study. Close the app and you're done.
2. **Direct competition** — Solitary experiences. No human opponent pushing you.
3. **Fast adaptation** — Creating study content for a specific course takes time from the teacher or student.

The result: studying feels like an abstract burden, with no urgency or immediate consequences.

---

## 3. Solution

**Solearn** turns studying into a 1v1 duel with financial consequences:

- Two students challenge each other to a quiz on any course topic.
- Both put up a **stake** in USDC.
- An **AI acts as a universal teacher**: generates multiple-choice questions on the specified topic and grades the answers.
- A **Solana smart contract** acts as a fair referee: locks the funds, receives results, and automatically pays the winner.

Whoever studied more wins. Whoever didn't loses money. Simple, direct, and effective.

---

## 4. Value Proposition

| Component | Value |
|-----------|-------|
| **Skin in the game** | If you don't study, you lose money. Accountability is real and immediate. |
| **AI as universal teacher** | Any course, any topic. The student writes what they need to study and the AI generates the quiz instantly. |
| **Smart contract as referee** | No "friend who dodges payment". The code determines the winner and distributes automatically. |
| **1v1 competition** | The pressure of a real human opponent. Not against a machine, against another student. |
| **Rematch loop** | The loser wants revenge. The winner wants to keep winning. Organic retention. |

---

## 5. Demo Case (hackathon)

- **Course**: Emerging Technologies
- **Topic**: "Basic blockchain theory"
- **Stake**: 1 USDC per player
- **Questions**: 5 multiple choice
- **Expected result**: AI generates 5 blockchain questions, both answer, contract pays 2 USDC to the best scorer.

---

## 6. Feature Set — MVP (V1)

### 6.1 Included Features

| Feature | Description |
|---------|-------------|
| **Connect wallet** | Integration with Solana wallets (Phantom, Backpack, Solflare) via wallet-standard |
| **Create duel** | The challenger defines: course name, duel topic, stake amount, question count, time limit |
| **AI quiz generation** | On duel creation, AI generates N multiple-choice questions with 4 options each on the specified topic |
| **List open duels** | Feed of pending duels where any user can enter as the opponent |
| **Accept duel** | The opponent sees the duel parameters and decides to enter, locking their stake |
| **Play quiz** | Both players answer the same questions (same order in V1) within a time limit |
| **Off-chain grading** | The backend corrects answers and computes each player's score (0 to N questions) |
| **On-chain resolution** | The backend sends scores to the contract, which compares and distributes funds automatically |
| **Result screen** | Shows winner, scores, and options to rematch or try a new topic |
| **Timeout for abandonment** | If a player doesn't answer within the time limit, the other claims the full pot |

### 6.2 V1 Explicit Limitations

- Only closed-ended questions (multiple choice, 4 options).
- Symmetric stake: both put exactly the same amount.
- AI grading **off-chain**: the contract only receives final scores.
- The backend acts as a "trusted oracle" for resolution.
- No global ranking, no full on-chain history, no reputation system.

---

## 7. Out of Scope for V1 (V2+ Ideas)

- Open-ended questions (free text) graded by AI.
- Asymmetric stake (one player stakes more than the other).
- Bracket tournaments.
- Global ranking and on-chain leaderboard.
- Full duel history on-chain.
- Reputation / ELO system.
- Practice mode without stake.
- Teacher-created quizzes (curated, not AI).
- On-chain answer verification (commit-reveal or zk).
- Team duels (2v2).
- University LMS integration (Moodle, Canvas).
- Native governance token.
