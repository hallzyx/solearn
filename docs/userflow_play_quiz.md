# Userflow: Play Quiz

> Both players answer the N duel questions. The timer runs. The system captures answers.

---

## Step-by-Step

### Step 1: Entering the Arena

| Actor | Action | System |
|-------|--------|---------|
| User | Arrives at the quiz screen (from "Start quiz" or automatically) | UI shows the duel header |

```
┌──────────────────────────────────────────────────────┐
│  ⚔️ DUEL IN PROGRESS                                 │
│  @alice.sol vs @bob.sol                              │
│  Topic: Basic blockchain theory                      │
│                                                      │
│  ⏱️ Time remaining: 04:32                            │
│  ❓ Question 1 of 5                                  │
└──────────────────────────────────────────────────────┘
```

---

### Step 2: Question Presentation

| Actor | Action | System |
|-------|--------|---------|
| — | — | Frontend gets the question from the backend: `GET /api/duels/:id/questions?player=alice` |
| — | — | **Important:** Backend only returns the question text and 4 options. **NEVER returns `correct_index`** to the frontend during gameplay. |
| User | Sees the current question | UI renders: |

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  📝 Question 1:                                      │
│  What is a block in a blockchain?                    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  ○ A. An encrypted file containing           │    │
│  │       all network wallets                    │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  ○ B. A data structure that groups           │    │
│  │       validated transactions and links them  │    │
│  │       cryptographically to the previous block│    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  ○ C. A smart contract that automatically    │    │
│  │       executes transactions                  │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  ○ D. A central server that validates        │    │
│  │       network transactions                   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│              [Select an option]                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Selection behavior:**
- Options are large buttons/radios, easy to tap on mobile.
- Clicking an option highlights it immediately (visual mark, colored border).
- No "Confirm" button per question — selection is instant.
- Once selected, it auto-advances to the next question (~300ms smooth transition).

**If the user wants to change their answer:**
| Actor | Action | System |
|-------|--------|---------|
| User | Clicks "← Previous" | Goes back to the previous question. Previous answer appears selected. |
| User | Selects a different option | Backend answer is updated. |

---

### Step 3: Answer Saving

| Actor | Action | System |
|-------|--------|---------|
| User | Selects an option | Frontend immediately sends to backend: `POST /api/duels/:id/answers` with `{ player, question_id, selected_index }` |
| — | — | Backend saves the answer in the off-chain DB. |
| — | — | Frontend also saves in local state for offline resilience and sync on reconnect. |

**Save strategy:**
- Each answer is saved individually (no waiting for all 5).
- If the user loses connection, answers are saved in localStorage and sent on reconnect.
- If the user closes the browser and returns, previously sent answers are recovered from the backend and the current question is shown.

---

### Step 4: Progress and Timer

The UI constantly shows:

```
┌──────────────────────────────────────────────────────┐
│  ⏱️ 04:32  │  ❓ 3/5 answered                        │
│                                                      │
│  Progress:  ██████████░░░░░░░░░░  3/5                │
│  Timeout: 5 min · Questions: 5                       │
└──────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| **Timer** | Countdown from the duel's `time_limit` (3, 5, or 10 min). Last 60s turns orange, last 30s turns red with pulse. |
| **Progress bar** | Fills as the player answers. Independent per player. |
| **Question indicator** | Shows checkmarks on answered ones, empty circles on pending ones. |

---

### Step 5: Quiz Completion

Two triggers for completion:

**Trigger A — All questions answered:**

| Actor | Action | System |
|-------|--------|---------|
| User | Answers the last question (the Nth per `question_count`) | — |
| — | — | Frontend detects all answered and shows waiting screen |
| — | — | Backend marks the player as `finished` |

**Trigger B — Timer expires:**

| Actor | Action | System |
|-------|--------|---------|
| — | — | Timer reaches 00:00 |
| — | — | Frontend locks the UI (answers can't be changed) |
| — | — | Current answers are sent to the backend (unanswered stay as `null` and count as incorrect) |
| — | — | Backend marks the player as `finished` |

---

### Step 6: Waiting Screen

| Actor | Action | System |
|-------|--------|---------|
| User | Finished their quiz but the rival is still playing | Waiting screen is shown: |

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│           ✅ You answered all questions!              │
│                                                      │
│              ⏳ Waiting for your rival...             │
│                                                      │
│        @bob.sol is still answering.                   │
│                                                      │
│     You will be redirected automatically when         │
│     they finish.                                     │
│                                                      │
│     Don't close this window. The results              │
│     will appear as soon as both finish.               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Important:** Cross-tab BroadcastChannel sync instantly redirects both players when both have finished. No polling needed if both tabs are in the same browser.

---

### Step 7: Off-Chain Grading

| Actor | Action | System |
|-------|--------|---------|
| — | — | Backend detects both players have finished (or global timer expired) |
| — | — | Backend compares each player's answers against `correct_index` (stored in the quiz, never exposed to the frontend during play) |
| — | — | Computes `scoreA` and `scoreB` (0 to `question_count`) |
| — | — | Stores scores in DB and changes duel status to `READY_TO_RESOLVE` |
| — | — | Notifies both frontends (via BroadcastChannel or the result page) that results are ready |

---

## UI States During Quiz

| Moment | UI State |
|--------|----------|
| Loading questions | Skeleton loader with dynamic items (3, 5, or 10) |
| Quiz in progress | Current question visible, options clickable, timer running |
| Selecting option | Option highlighted + transition to next question |
| Last 60 seconds | Timer orange, text: "1 minute left" |
| Last 30 seconds | Timer red, pulsing, text: "Hurry up" |
| Quiz finished (waiting for rival) | Waiting screen with "WAITING FOR YOUR RIVAL" |
| Quiz finished (both ready) | Transition to result page: "All done!" |
| Connection error | Yellow banner: "Your answers are saved on the server. Don't close this window." |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| User reloads the page mid-quiz | State is restored from the backend (already answered questions, current question). Server-side timer keeps running. |
| User closes the browser and doesn't return | Partial answers are saved. If they don't return before timeout, abandonment applies (see `userflow_timeout_duel.md`). |
| User tries to open the quiz in two tabs | Second tab detects active session and shows: "You already have the quiz open in another tab." |
| Both players finish at the same time | Backend processes grading once (with lock or idempotency). |
| Backend fails to save an answer | Frontend retries with exponential backoff. After 3 failures, shows error and saves in localStorage. |
| One player finishes in 30 seconds, the other takes 4:50 | First player sees the waiting screen. The result auto-triggers when both have finished. |
