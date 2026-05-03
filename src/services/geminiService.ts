import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

const getApiKey = () => {
  try {
    return process.env.GEMINI_API_KEY || '';
  } catch (e) {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const translateText = async (
  text: string,
  targetLang: string,
  sourceLang: string = 'auto',
  customCategories: string[] = []
) => {
  const categoriesStr = ['Travel', 'Business', 'Dining', 'Emergency', 'Greetings', 'Technical', 'Shopping', 'General', ...customCategories]
    .map(c => `"${c}"`)
    .join(' | ');

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following text to ${targetLang}. If source language is unknown, detect it (likely Urdu, Italian, Pashto, or English).
    
    IMPORTANT: 
    1. Ensure the translated text in ${targetLang} is grammatically correct and free of spelling errors. If the target language is English, apply strict grammar and spell checking.
    2. Analyze the context, tone, and intent of the conversation to determine the most appropriate category.
       - **Travel**: Logistics related to movement or stay.
       - **Business**: Workplace or commercial interaction.
       - **Dining**: Food, restaurants, ordering.
       - **Emergency**: Urgent medical needs, safety.
       - **Greetings**: Introductions, small talk.
       - **Technical**: Engineering, IT, specialized equipment.
       - **Shopping**: Purchases, prices, retail.
       ${customCategories.length > 0 ? `- Custom categories provided by user: ${customCategories.join(', ')}` : ''}
       - **General**: Casual conversation, daily life.
    
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
  return JSON.parse(result.text || '{}');
};

export const transcribeAndTranslateAudio = async (
  base64Audio: string,
  mimeType: string,
  targetLang: string,
  sourceLang: string = 'auto',
  customCategories: string[] = []
) => {
  const categoriesStr = ['Travel', 'Business', 'Dining', 'Emergency', 'Greetings', 'Technical', 'Shopping', 'General', ...customCategories]
    .map(c => `"${c}"`)
    .join(' | ');

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Audio,
          },
        },
        {
          text: `You are an expert audio transcriber and translator.
1. First, accurately transcribe the provided audio in its original spoken language (which is likely either Urdu, Italian, Pashto, or English).
2. Then, translate the transcribed text to ${targetLang}.
3. Detect the source language.
4. Categorize the conversation appropriately into one of these categories: ${categoriesStr}.

Return the response strictly in JSON format:
{
  "originalText": "string",
  "translatedText": "string",
  "detectedSourceLang": "string",
  "category": "string"
}`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalText: { type: Type.STRING },
          translatedText: { type: Type.STRING },
          detectedSourceLang: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ["originalText", "translatedText", "detectedSourceLang", "category"],
      },
    },
  });

  const result = await model;
  return JSON.parse(result.text || '{}');
};

export const detectLanguage = async (text: string) => {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Detect the language of the following text: "${text}". Return only the language name.`,
  });

  const result = await model;
  return result.text?.trim() || 'Unknown';
};
