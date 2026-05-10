/**
 * AI quiz generator using DeepSeek API (OpenAI-compatible).
 *
 * Generates N multiple-choice questions with 4 options each
 * based on a course name and topic.
 */

const DEEPSEEK_BASE = "https://api.deepseek.com";

interface GeneratedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

interface GeneratedQuiz {
  questions: GeneratedQuestion[];
}

const SYSTEM_PROMPT = `Eres un profesor universitario experto generando exámenes de opción múltiple.
Tu tarea es generar preguntas conceptuales sobre temas académicos de nivel universitario.

REGLAS:
1. Genera exactamente {questionCount} preguntas.
2. Cada pregunta debe tener 4 opciones (A, B, C, D).
3. Solo UNA opción es correcta.
4. Las opciones incorrectas deben ser plausibles (no absurdas).
5. Las preguntas deben evaluar comprensión conceptual, no memorización.
6. Cubrí diferentes subtemas del tema principal.
7. Varía la dificultad: 1 fácil, 2-3 intermedias, 1 difícil.
8. Usá lenguaje técnico preciso pero accesible.

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "questions": [
    {
      "text": "¿Pregunta conceptual sobre el tema?",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctIndex": 0
    }
  ]
}`;

/**
 * Generates a quiz using DeepSeek AI.
 * @param courseName - The course name (e.g. "Tecnologías Emergentes")
 * @param topic - The specific topic (e.g. "Teoría básica de blockchain")
 * @param questionCount - Number of questions (3, 5, or 10)
 * @returns Generated quiz with questions and correct answers
 */
export async function generateQuiz(
  courseName: string,
  topic: string,
  questionCount: number,
): Promise<GeneratedQuiz> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY not set in .env");
  }

  const userMessage = `Curso: "${courseName}"
Tema del examen: "${topic}"
Cantidad de preguntas: ${questionCount}`;

  const prompt = SYSTEM_PROMPT.replace("{questionCount}", String(questionCount));

  const response = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 4096,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("DeepSeek API error:", response.status, err);
    throw new Error(`DeepSeek API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  console.log("DeepSeek response keys:", Object.keys(data));

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    console.error("Empty DeepSeek response:", JSON.stringify(data).slice(0, 200));
    throw new Error("DeepSeek returned empty response");
  }

  // Parse JSON — handle possible markdown wrapping
  const jsonText = content.replace(/```json\s*|\s*```/g, "").trim();
  const quiz: GeneratedQuiz = JSON.parse(jsonText);

  // Validate
  if (!quiz.questions || !Array.isArray(quiz.questions)) {
    throw new Error("AI response missing 'questions' array");
  }
  if (quiz.questions.length !== questionCount) {
    console.warn(`Expected ${questionCount} questions, got ${quiz.questions.length}`);
  }

  for (const q of quiz.questions) {
    if (!q.text || !q.options || q.options.length !== 4 || q.correctIndex === undefined) {
      throw new Error("Invalid question format from AI");
    }
  }

  return quiz;
}
