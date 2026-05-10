# Userflow: AI Explanation + ElevenLabs Voice via x402

> After a duel is resolved, each player can pay **0.1 USDC** to receive a detailed AI explanation of every question in the quiz (text + audio). The payment goes through the wallet as a standard SPL token transfer (x402).

---

## Step-by-Step

### Step 1: Trigger on the Result Screen

| Actor | Action | System |
|-------|--------|---------|
| Player | Sees the result screen (win/lose/tie) with scores and answer review | A button at the bottom reads: "AI DETAILED EXPLANATION — 0.1 USDC" |
| Player | Clicks the button | — |

**Button states:**

| State | Appearance |
|-------|-----------|
| **Default** | `[AI DETAILED EXPLANATION — 0.1 USDC]` |
| **Processing payment** | `[🔄 PROCESSING PAYMENT 0.1 USDC...]` — spinner + disabled |
| **Error** | `(error message)` appears below the button in red |
| **Done** | Button disappears, explanation panel renders |

---

### Step 2: Payment (x402 — 0.1 USDC via SPL Transfer)

| Actor | Action | System |
|-------|--------|---------|
| — | — | Frontend calls `usdc.send()` on the `useSplToken` hook, sending **0.1 USDC** to `NEXT_PUBLIC_RESOLVER_PUBKEY` (`35ibw735m...`) |
| Player | Wallet popup opens (Phantom / Backpack / Solflare) asking to approve the 0.1 USDC transfer | — |
| Player | Approves and signs the transaction | — |
| — | — | The SPL token transfer is confirmed on-chain. The wallet's balance refreshes automatically via the Zustand refresh store. |

**Payment details:**

| Field | Value |
|-------|-------|
| **Token** | USDC (mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) |
| **Amount** | 0.1 USDC (100,000 base units) |
| **Destination** | `35ibw735mSNa61tkB7UK5HAD1BJx8seVTcvKM66UejHp` (resolver wallet) |
| **Network** | Solana devnet |
| **Fee** | ~0.000005 SOL (standard tx fee, paid by the player) |

**Why not a Solana Pay QR?**
The payment is a standard SPL token transfer embedded in a single click — no QR code needed since both sender and receiver are known. This is the x402 pattern (HTTP 402 "Payment Required"), where the frontend only shows the content after the payment is confirmed on-chain.

---

### Step 3: Text Explanation Generation (DeepSeek AI)

| Actor | Action | System |
|-------|--------|---------|
| — | — | After payment confirmation, frontend calls `POST /api/duels/:id/explain` |
| — | — | Backend gathers the full quiz data: questions, correct answers, both players' selected answers, and the final scores |
| — | — | Backend sends a structured prompt to DeepSeek (`deepseek-chat`): |

**Prompt structure:**
```
Eres un profesor universitario...
Desglosa cada pregunta con su respuesta correcta y explica
por qué las otras opciones son incorrectas.
```

| — | — | DeepSeek returns a detailed markdown explanation (2–8 paragraphs per question) |

---

### Step 4: Voice Generation (ElevenLabs TTS)

| Actor | Action | System |
|-------|--------|---------|
| — | — | If `ELEVEN_LABS_API_KEY` is configured, the backend strips markdown formatting and sends the text to ElevenLabs TTS |
| — | — | ElevenLabs API endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` |

**TTS configuration:**

| Parameter | Value |
|-----------|-------|
| **Voice ID** | `9BWtsMINqrJLrRacOk9x` (Aria — female, Spanish-friendly) |
| **Model** | `eleven_multilingual_v2` |
| **Stability** | `0.5` |
| **Similarity boost** | `0.75` |

| — | — | ElevenLabs returns the audio as MP3 bytes. Backend encodes it as **base64** and returns both `explanation` (text) and `audio` (base64 string). |

**If ElevenLabs is unavailable:**
- Backend logs the error to the console (`❌ ElevenLabs TTS failed`)
- The API still returns the text explanation (no audio)
- The frontend hides the audio player and shows only the text

---

### Step 5: Rendering on the Result Screen

| Actor | Action | System |
|-------|--------|---------|
| Player | Sees the explanation panel appear below the scores | — |

```
┌──────────────────────────────────────────────────────┐
│  💡 AI EXPLANATION                                   │
│                                                      │
│  ## Q1. What is a block in a blockchain?             │
│                                                      │
│  **✅ Correct answer:** B. A data structure that...  │
│  A data structure that groups validated transactions │
│  and links them cryptographically to the previous    │
│  block. This is correct because...                   │
│                                                      │
│  ❌ Option A: An encrypted file... → Wrong because   │
│  a block doesn't contain wallets.                    │
│                                                      │
│  ❌ Option C: A smart contract... → Wrong because    │
│  a block is not a smart contract.                   │
│                                                      │
│  ...                                                 │
│                                                      │
│  ▶️ [audio player with playback controls]            │
└──────────────────────────────────────────────────────┘
```

**Explanation format:**
- **Markdown rendered** — bold, headings, lists, all styled with the brutalist design system
- **Per-question breakdown** — each question is its own section
- **Your answers flagged** — shows which option you chose and whether it was correct
- **Distractor explanations** — explains why each wrong option is plausible but incorrect

**Audio player:**
- Native HTML `<audio>` element with play/pause, progress bar, volume control
- Source: `data:audio/mpeg;base64,{audio}` (embedded directly in the page)
- Only appears if `ELEVEN_LABS_API_KEY` is configured and the TTS call succeeded

---

## UI States

| Moment | UI State |
|--------|----------|
| **Payment processing** | Button shows spinner + "PROCESSING PAYMENT 0.1 USDC...", disabled |
| **Payment confirmed** | API call fires (transparent to user) |
| **Generating explanation** | Button shows spinner + "GENERATING EXPLANATION..." |
| **AI explanation ready** | Button replaced by markdown explanation panel |
| **Audio ready** | Audio player appears below the text |
| **Payment failed** | Red error message below button: `{error message}` |
| **API failed** | Red error message: "Error processing payment or explanation" |
| **No wallet connected** | Button disabled — user must connect first |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Player doesn't have 0.1 USDC | Wallet popup shows insufficient balance. Error message: "Error processing payment or explanation" |
| Player rejects the wallet signature | Frontend catches the error, shows red error message below the button. Button remains clickable for retry. |
| ElevenLabs API key not configured | No audio is generated. Text explanation is returned. No error shown to the user. |
| ElevenLabs rate limit exceeded | Backend logs the error, returns text only. User never sees the failure. |
| DeepSeek returns empty explanation | API returns 500. User sees error message. Can retry. |
| Player clicks the button twice | First click disables the button. Second click is ignored. |
| Both players pay for explanation | Each player pays independently. Each gets the same explanation (their own payment is separate). |

---

## Sequence Diagram

```
Player                    Frontend              Backend              Solana / AI
  |                         |                     |                     |
  |  Click "AI EXPLANATION" |                     |                     |
  |------------------------>|                     |                     |
  |                         |                     |                     |
  |                         | usdc.send(0.1 USDC) |                     |
  |                         |─────────────────────|──────x402──────────>|
  |  Wallet popup           |                     |                     |
  |<------------------------|                     |                     |
  |  Sign tx                |                     |                     |
  |------------------------>|                     |                     |
  |                         |  tx confirmed       |                     |
  |                         |─────────────────────|──────on-chain──────>|
  |                         |                     |                     |
  |                         | POST /api/explain   |                     |
  |                         |────────────────────>|                     |
  |                         |                     | POST DeepSeek       |
  |                         |                     |────────────────────>|
  |                         |                     |  markdown response  |
  |                         |                     |<────────────────────|
  |                         |                     |                     |
  |                         |                     | POST ElevenLabs     |
  |                         |                     |────────────────────>|
  |                         |                     |  audio (base64)     |
  |                         |                     |<────────────────────|
  |                         |                     |                     |
  |                         |  { explanation,     |                     |
  |                         |    audio }          |                     |
  |                         |<────────────────────|                     |
  |                         |                     |                     |
  |  Explanation + audio    |                     |                     |
  |<------------------------|                     |                     |
```
