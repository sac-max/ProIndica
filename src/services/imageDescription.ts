import { GoogleGenAI } from "@google/genai";

async function describeImage(base64Image: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Describe this image in detail, focusing on the people and their professions. I need a high-quality description to find a similar stock photo." },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }
    ]
  });
  return response.text;
}
