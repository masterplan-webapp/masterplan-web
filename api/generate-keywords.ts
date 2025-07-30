import { GoogleGenAI, Type } from "@google/genai";

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
        const { plan, mode, input, language } = await request.json();

        if (!plan || !mode || !input || !language) {
            return createErrorResponse("Missing required parameters.", 400);
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const langInstruction = language === 'pt-BR' ? 'Responda em Português do Brasil.' : 'Respond in English.';
        const systemInstruction = `You are an SEO and SEM expert. Your task is to generate a list of relevant keywords. For each keyword, provide an estimated monthly search volume (integer), click potential (integer), and a min/max CPC (float). The result MUST be a valid JSON array of keyword objects. Do not include additional text or markdown. ${langInstruction}`;
        const prompt = `Generate 20 keywords for the following context:\n- Plan Objective: ${plan.objective}\n- Target Audience: ${plan.targetAudience}\n- ${mode === 'seed' ? 'Seed Keywords' : 'Description'}: ${input}`;
        const schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, volume: { type: Type.INTEGER }, clickPotential: { type: Type.INTEGER }, minCpc: { type: Type.NUMBER }, maxCpc: { type: Type.NUMBER } }, required: ["keyword", "volume", "clickPotential", "minCpc", "maxCpc"] } };
        
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: [{ parts: [{ text: prompt }] }], config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema } });
        
        const text = response.text.trim();
        const keywords = JSON.parse(text);

        return new Response(JSON.stringify(keywords), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Error in /api/generate-keywords:", error);
        return createErrorResponse(error.message || "An internal server error occurred.", 500);
    }
}
