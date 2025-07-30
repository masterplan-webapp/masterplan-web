
import { GoogleGenAI, Type } from "@google/genai";

// Duplicated from constants.ts to ensure bundling
const CHANNEL_FORMATS: Record<string, string[]> = {
    "Google Ads": ["Search", "PMax", "Display", "YouTube", "Demand Gen"],
    "Meta Ads": ["Darkpost", "Faceleads", "Feed", "Stories/Reels", "Feed/Stories", "Carrossel", "Video Views", "Lead Ad"],
    "LinkedIn Ads": ["Sponsored Content", "Sponsored Messaging", "Lead Gen Forms", "Dynamic Ads", "Text Ads"],
    "TikTok Ads": ["In-Feed Ads", "TopView", "Branded Hashtag Challenge", "Branded Effects"],
    "Microsoft Ads": ["Search", "Audience Network"],
    "Pinterest Ads": ["Static Pin", "Video Pin", "Carousel Pin", "Shopping Pin", "Idea Pin"],
    "X Ads": ["Promoted Ads", "Follower Ads", "X Amplify", "X Live"]
};
const OPTIONS = {
    tipoCampanha: ["Awareness", "Alcance", "Tráfego", "Engajamento", "Geração de Leads", "Conversão", "Retargeting"],
    etapaFunil: ["Topo", "Meio", "Fundo"],
    canal: Object.keys(CHANNEL_FORMATS),
    unidadeCompra: ["CPC", "CPM", "CPV"],
};


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
        const { userPrompt, language } = await request.json();

        if (!userPrompt) {
            return createErrorResponse("User prompt is required.", 400);
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const langInstruction = language === 'pt-BR' ?
            'Responda em Português do Brasil. O nome dos meses DEVE estar em português (Janeiro, Fevereiro, etc.).' :
            'Respond in English. Month names MUST be in English (January, February, etc.).';

        const systemInstruction = `You are a senior media planner. Your task is to create a digital media plan from a user's description.
- Analyze the user's prompt to determine the time period for the plan (e.g., "for the next quarter", "for July and August 2024", "for the last quarter of the year").
- If no period is specified, create a plan for the next 3 months starting from the current date.
- The output MUST be a valid JSON object, with no additional text or explanations. Do not use markdown.
- For each campaign, you must provide:
  - 'publicoAlvo': A specific target audience, refining the main 'targetAudience' for that campaign's specific goal.
  - 'kpi': The main Key Performance Indicators (e.g., "Cliques, CPC", "Impressões, Alcance").
  - 'unidadeCompra': Select 'CPC' for performance-oriented campaigns (like Tráfego, Conversão) and 'CPM' for reach/awareness campaigns (like Awareness, Alcance).
- For the campaign's 'formato' field, you MUST select an appropriate value from the predefined list for the chosen 'canal'. Do not invent new formats. The available formats are: ${JSON.stringify(CHANNEL_FORMATS)}.
- For 'logoUrl', use the placehold.co API to generate a placeholder logo. Example: https://placehold.co/400x300/f472b6/ffffff?text=YourBrand
- For 'aiImagePrompt', create a concise text-to-image prompt that captures the brand's essence.
${langInstruction}`;

        const campaignSchema = {
            type: Type.OBJECT,
            properties: {
                tipoCampanha: { type: Type.STRING, enum: OPTIONS.tipoCampanha },
                etapaFunil: { type: Type.STRING, enum: OPTIONS.etapaFunil },
                canal: { type: Type.STRING, enum: OPTIONS.canal },
                formato: { type: Type.STRING },
                objetivo: { type: Type.STRING },
                publicoAlvo: { type: Type.STRING, description: "A specific target audience for this campaign, derived from the main plan audience." },
                kpi: { type: Type.STRING, description: "Key Performance Indicators for the campaign, e.g., 'Cliques, CPC'." },
                budget: { type: Type.NUMBER },
                unidadeCompra: { type: Type.STRING, enum: ["CPC", "CPM", "CPV"], description: "The buying unit. Use 'CPC' for performance goals (Traffic, Conversion) and 'CPM' for awareness goals." }
            },
            required: ["tipoCampanha", "etapaFunil", "canal", "formato", "objetivo", "publicoAlvo", "kpi", "budget", "unidadeCompra"]
        };

        const schema = {
            type: Type.OBJECT,
            properties: {
                campaignName: { type: Type.STRING },
                objective: { type: Type.STRING },
                targetAudience: { type: Type.STRING },
                location: { type: Type.STRING },
                totalInvestment: { type: Type.NUMBER },
                logoUrl: { type: Type.STRING },
                aiImagePrompt: { type: Type.STRING },
                months: {
                    type: Type.ARRAY,
                    description: "An array of monthly plans. Each item must contain the month key and the campaigns for that month.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            month: {
                                type: Type.STRING,
                                description: "The month for this plan segment, in 'YYYY-MonthName' format (e.g., '2024-Janeiro'). Month name must be in the specified language."
                            },
                            campaigns: {
                                type: Type.ARRAY,
                                items: campaignSchema
                            }
                        },
                        required: ["month", "campaigns"]
                    }
                }
            },
            required: ["campaignName", "objective", "targetAudience", "location", "totalInvestment", "months"]
        };

        const stream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: `Business Description: "${userPrompt}"` }] }],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema
            },
        });

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Asynchronously pipe the stream from Gemini to the client
        (async () => {
            try {
                for await (const chunk of stream) {
                    const text = chunk.text;
                    if (text) {
                        await writer.write(encoder.encode(text));
                    }
                }
                // On success, close the writer to signal the end of the stream
                await writer.close();
            } catch (e: any) {
                console.error('Streaming error in generate-plan:', e);
                // On error, abort the writer to propagate the error to the client
                await writer.abort(e);
            }
        })();

        return new Response(readable, {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
            },
        });

    } catch (error: any) {
        console.error("Error in /api/generate-plan:", error);
        return createErrorResponse(error.message || "An internal server error occurred.", 500);
    }
}
