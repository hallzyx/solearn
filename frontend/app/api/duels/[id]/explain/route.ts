/**
 * POST /api/duels/[id]/explain
 *
 * Generates a detailed explanation of quiz answers using DeepSeek AI,
 * then converts it to speech using ElevenLabs TTS.
 * Returns both text and base64-encoded audio.
 */

import { NextRequest, NextResponse } from "next/server";
import { findDuel } from "@/lib/db";

const DEEPSEEK_BASE = "https://api.deepseek.com";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const duel = await findDuel(id);
    if (!duel) return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    if (!duel.challengerScore && duel.challengerScore !== 0) {
      return NextResponse.json({ error: "Duel not graded yet" }, { status: 400 });
    }

    // 1. Generate text explanation with DeepSeek
    const prompt = buildExplanationPrompt(duel);
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY not set");

    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "Eres un profesor universitario que explica conceptos de forma clara y didáctica. " +
              "Desglosa cada pregunta con su respuesta correcta y explica por qué las otras opciones son incorrectas. " +
              "Usá un tono académico pero accesible. Respondé en español.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DeepSeek error ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const explanation = data?.choices?.[0]?.message?.content;
    if (!explanation) throw new Error("DeepSeek returned empty explanation");

    // 2. Convert to speech with ElevenLabs
    let audioBase64: string | null = null;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
    if (elevenLabsKey) {
      try {
        const ttsVoice = "9BWtsMINqrJLrRacOk9x"; // Aria
        console.log("🎤 Calling ElevenLabs TTS with voice:", ttsVoice);

        const ttsRes = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${ttsVoice}`, {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: explanation.replace(/\*\*/g, "").replace(/[#*_~`]/g, ""), // strip markdown
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (ttsRes.ok) {
          const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
          audioBase64 = audioBuffer.toString("base64");
          console.log("✅ ElevenLabs audio generated, size:", audioBuffer.length, "bytes");
        } else {
          const errBody = await ttsRes.text().catch(() => "unknown");
          console.warn("❌ ElevenLabs TTS failed:", ttsRes.status, errBody.slice(0, 200));
        }
      } catch (e) {
        console.warn("ElevenLabs TTS error:", e);
      }
    } else {
      console.warn("⚠️ No ElevenLabs API key configured");
    }

    return NextResponse.json({ explanation, audio: audioBase64 ?? undefined });
  } catch (error) {
    console.error("POST /api/explain error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

function buildExplanationPrompt(duel: any): string {
  let p = `Curso: ${duel.courseName}\nTema: ${duel.topic}\n\n`;
  p += `RESULTADOS:\nChallenger: ${duel.challengerScore ?? "?"}/${duel.questionCount}\nOpponent: ${duel.opponentScore ?? "?"}/${duel.questionCount}\n\n`;

  for (const q of duel.questions || []) {
    p += `---\nPregunta ${q.id}: ${q.text}\n✅ Correcta [${q.correctIndex}]: ${q.options[q.correctIndex]}\n`;
    p += `❌ Incorrectas:\n`;
    for (let i = 0; i < q.options.length; i++) {
      if (i !== q.correctIndex) p += `   [${i}] ${q.options[i]}\n`;
    }
    const ca = (duel.challengerAnswers || []).find((a: any) => a.questionId === q.id);
    const oa = (duel.opponentAnswers || []).find((a: any) => a.questionId === q.id);
    if (ca) p += `Challenger eligió [${ca.selectedIndex}]${ca.selectedIndex === q.correctIndex ? " ✅" : " ❌"}\n`;
    if (oa) p += `Opponent eligió [${oa.selectedIndex}]${oa.selectedIndex === q.correctIndex ? " ✅" : " ❌"}\n`;
  }
  p += `\nExplicá cada pregunta en detalle.`;
  return p;
}
