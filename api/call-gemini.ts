import { GoogleGenAI } from "@google/genai";

export const runtime = 'edge';

function createErrorResponse(message: string, status: number) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
}

export default async function POST(request: Request) {
    if (!process.env.API_KEY) {
        return createErrorResponse("API key is not configured.", 500);
    }
    try {
        const { prompt, isJson } = await request.json();
        if (!prompt) {
             return createErrorResponse("Prompt is required.", 400);
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            ...(isJson && { config: { responseMimeType: "application/json" } })
        });
        
        const text = response.text.trim();
        let data;
        if (isJson) {
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : text;
            try {
                 data = JSON.parse(jsonString);
            } catch (e) {
                 return createErrorResponse("AI returned invalid JSON.", 500);
            }
        } else {
            data = text;
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Error in /api/call-gemini:", error);
        return createErrorResponse(error.message || "An internal server error occurred.", 500);
    }
}
