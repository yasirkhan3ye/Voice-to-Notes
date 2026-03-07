import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

const getApiKey = () => {
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
};

let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai) {
    const key = getApiKey();
    if (!key) {
      console.warn('Gemini API key is missing. AI features will not work.');
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
};

export const translateText = async (
  text: string,
  targetLang: string,
  sourceLang: string = 'auto',
  customCategories: string[] = []
) => {
  const categoriesStr = ['Travel', 'Business', 'Dining', 'Emergency', 'Greetings', 'Technical', 'Shopping', 'General', ...customCategories]
    .map(c => `"${c}"`)
    .join(' | ');

  console.log(`Translating to ${targetLang}: "${text.substring(0, 30)}..."`);
  
  try {
    const aiClient = getAI();
    const model = aiClient.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Translate the following text to ${targetLang}. If source language is unknown, detect it (likely Urdu, Italian, Pashto, or English).
      
      IMPORTANT: 
      1. Ensure the translated text in ${targetLang} is grammatically correct.
      2. Analyze the context to determine the best category.
      ${customCategories.length > 0 ? `- Custom categories: ${customCategories.join(', ')}` : ''}
      
      Text: "${text}"
      
      Return the response in JSON format:
      {
        "translatedText": "string",
        "detectedSourceLang": "string",
        "category": ${categoriesStr}
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            detectedSourceLang: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["translatedText", "detectedSourceLang", "category"],
        },
      },
    });

    const result = await model;
    const responseText = result.text;
    console.log("Gemini Response:", responseText);
    
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return {
      translatedText: "Translation unavailable. Please check your connection.",
      detectedSourceLang: "Unknown",
      category: "General" as Category
    };
  }
};

export const detectLanguage = async (text: string) => {
  try {
    const model = getAI().models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Detect the language of the following text: "${text}". Return only the language name.`,
    });

    const result = await model;
    return result.text?.trim() || 'Unknown';
  } catch (error) {
    console.error("Language detection failed:", error);
    return 'Unknown';
  }
};
