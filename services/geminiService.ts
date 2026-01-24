import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateSearchClues = async (content: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key is missing. Returning mock response.");
    return "MOCK CLUE: Key algorithms, Historical context, Core definition.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze the following text and generate a concise list of "Search Clues" or keywords that would help users find this content in a knowledge base.
        Focus on concepts, synonyms, and related entities that might not be explicitly in the title.
        Output ONLY the clues, separated by commas.
        
        Text:
        ${content.substring(0, 5000)}
      `,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate clues.");
  }
};
