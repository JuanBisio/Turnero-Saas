import { AIInterpreterResult } from "@/types/whatsapp-session";

const SYSTEM_PROMPT = `Sos un INTÉRPRETE de mensajes para un bot de turnos de una peluquería/barbería. Tu objetivo es analizar el mensaje del usuario y extraer la intención y los datos clave (servicio, profesional, fecha, hora).

RESPONDÉ EXCLUSIVAMENTE EN FORMATO JSON (sin bloques de código markdown, solo el objeto):
{
  "intent": "BOOK" | "CANCEL" | "INFO" | "GREET" | "OTHER",
  "extracted": {
    "service": "nombre exacto del servicio o null",
    "professional": "nombre exacto del profesional o null",
    "date": "YYYY-MM-DD o null",
    "time": "HH:MM:SS o null"
  },
  "naturalResponse": "una respuesta corta y amable (máximo 15 palabras)"
}

REGLAS CRÍTICAS:
1. Si el usuario saluda, intent=GREET.
2. Si el usuario menciona un servicio o profesional de la lista, extraelo exactamente.
3. Si el usuario quiere cancelar un turno existente, intent=CANCEL.
4. Si el usuario quiere reservar o pide turno, intent=BOOK.
5. naturalResponse: debe ser empática pero muy breve. Usar 1 emoji máximo.`;

interface InterpreterInput {
  userMessage: string;
  shopName: string;
  services: string[];
  professionals: string[];
  currentState: string;
  currentIntent: string | null;
  sessionService: string | null;
  sessionProfessional: string | null;
  sessionDate: string | null;
  todayDate: string;
}

/**
 * Utiliza Google Gemini para interpretar el lenguaje natural del usuario.
 * Transforma texto informal en una estructura de datos procesable.
 */
export async function interpretMessage(
  input: InterpreterInput
): Promise<AIInterpreterResult> {
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[AI] GEMINI_API_KEY no configurada.");
  }

  const userPrompt = `MENSAJE DEL USUARIO: "${input.userMessage}"

CONTEXTO DEL NEGOCIO:
- Comercio: ${input.shopName}
- Servicios ofrecidos: ${input.services.join(", ")}
- Profesionales disponibles: ${input.professionals.join(", ")}
- Fecha de hoy: ${input.todayDate}

ESTADO DE LA SESIÓN:
- Estado actual: ${input.currentState}
- Intención previa: ${input.currentIntent || "Ninguna"}
- Datos ya recolectados: ${input.sessionService || "Ninguno"} con ${input.sessionProfessional || "Ninguno"} para el ${input.sessionDate || "Sin fecha"}`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.1, // Baja temperatura para mayor consistencia en el JSON
            maxOutputTokens: 300,
          },
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    
    // Limpieza básica por si Gemini incluye markdown
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se encontró JSON en la respuesta de la IA.");
    
    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error("[AI] Error interpretando mensaje:", error);
    return {
      intent: "OTHER",
      extracted: { service: null, professional: null, date: null, time: null },
      naturalResponse: "Perdón, no te entendí bien. ¿Me podés repetir qué necesitás? 🙏"
    };
  }
}
