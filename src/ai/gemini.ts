import { ApiError, GoogleGenAI } from "@google/genai";
import { HttpError } from "../middleware/errors";
import { reviewJsonSchema, reviewSchema, type Review } from "../schemas/review";
import { MODEL, SYSTEM_PROMPT, buildContents } from "./prompt";

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new HttpError(
      500,
      "AI reviews are not configured. Set GEMINI_API_KEY on the backend.",
    );
  }
  client ??= new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } },
  });
  return client;
}

export async function reviewClaim(prompt: string): Promise<Review> {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildContents(prompt),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: reviewJsonSchema,
      },
    });
    if (response.candidates?.[0]?.finishReason !== "STOP" || !response.text) {
      throw new HttpError(
        502,
        "AI could not complete a review. Try a clearer description.",
      );
    }
    const parsed = reviewSchema.safeParse(JSON.parse(response.text));
    if (!parsed.success) {
      throw new HttpError(
        502,
        "AI returned an invalid review. Please try again.",
      );
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof ApiError)
      console.error("Gemini request failed:", error.status);
    if (error instanceof ApiError && error.status === 429) {
      throw new HttpError(
        429,
        "The AI quota is used up for now. Please try again later.",
      );
    }
    // Raw provider errors can contain request details; expose only our own message.
    throw new HttpError(
      502,
      "AI review is unavailable or returned an invalid reply. Please try again later.",
    );
  }
}
