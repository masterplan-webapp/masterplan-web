import { GoogleGenAI } from "@google/genai";

export const runtime = 'edge';

// AspectRatio type duplicated from types.ts
type AspectRatio = '1:1' | '16:9' | '9:16' | '3:4';

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
        const { prompt } = await request.json();
        if (!prompt) {
            return createErrorResponse("Prompt is required.", 400);
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '3:4'];
        const imagePromises = aspectRatios.map(aspectRatio =>
            ai.models.generateImages({ model: 'imagen-3.0-generate-002', prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio } })
        );
        const responses = await Promise.all(imagePromises);
        const generatedImages = responses.map((response, index) => ({
            base64: response.generatedImages[0].image.imageBytes,
            aspectRatio: aspectRatios[index],
        }));

        return new Response(JSON.stringify(generatedImages), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error("Error in /api/generate-images:", error);
        return createErrorResponse(error.message || "An internal server error occurred.", 500);
    }
}
