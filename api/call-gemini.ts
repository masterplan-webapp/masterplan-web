
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
        
        if (isJson) {
            // Keep original non-streaming logic for JSON requests
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
                config: { responseMimeType: "application/json" }
            });
            const text = response.text.trim();
            let data;
            try {
                 data = JSON.parse(text);
            } catch (e) {
                 return createErrorResponse("AI returned invalid JSON.", 500);
            }
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Handle text streaming
        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
        });

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        (async () => {
            try {
                for await (const chunk of stream) {
                    const text = chunk.text;
                    if (text) {
                        await writer.write(encoder.encode(text));
                    }
                }
            } catch (e) {
                console.error('Streaming error in call-gemini:', e);
                await writer.abort(e as any);
            } finally {
                await writer.close();
            }
        })();

        return new Response(readable, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
            },
        });

    } catch (error: any) {
        console.error("Error in /api/call-gemini:", error);
        return createErrorResponse(error.message || "An internal server error occurred.", 500);
    }
}
