






import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import { Database, PlanData, Campaign, User, LanguageCode, KeywordSuggestion, CreativeTextData, AdGroup, UTMLink, GeneratedImage, AspectRatio, SummaryData, MonthlySummary } from './types';
import { MONTHS_LIST, OPTIONS, CHANNEL_FORMATS, DEFAULT_METRICS_BY_OBJECTIVE } from "./constants";


// --- Supabase Client ---
const supabaseUrl = 'https://mcboqzwalxvcebpkxwgv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYm9xendhbHh2Y2VicGt4d2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NTQzMjgsImV4cCI6MjA2ODQzMDMyOH0.wRFq3uPO0SsEvH-NZEIGjvnB3OejCEFiOcrbDkJcUac';

if (supabaseUrl.includes('YOUR_SUPABASE_URL_HERE')) {
    console.error("******************************************************************************");
    console.error("ATENÇÃO: As credenciais do Supabase precisam ser configuradas no arquivo `services.ts`.");
    console.error("Substitua 'YOUR_SUPABASE_URL_HERE' e 'YOUR_SUPABASE_ANON_KEY_HERE' pelas suas chaves reais.");
    console.error("O aplicativo não funcionará corretamente até que isso seja feito.");
    console.error("******************************************************************************");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);


// --- Gemini API Helper ---
// Lazy-initialize the AI client to prevent a crash on load if API_KEY is missing.
let ai: GoogleGenAI | null = null;
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        // This will only be called when an AI function is used for the first time.
        // It assumes process.env.API_KEY is available at that point.
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


// --- UTILITY FUNCTIONS ---
export const formatCurrency = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numberValue);
};

export const formatPercentage = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return `${numberValue.toFixed(2)}%`;
};

export const formatNumber = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR').format(Math.round(numberValue));
};

export const sortMonthKeys = (a: string, b: string): number => {
    const [yearA, monthNameA] = a.split('-');
    const [yearB, monthNameB] = b.split('-');
    
    const monthIndexA = MONTHS_LIST.indexOf(monthNameA);
    const monthIndexB = MONTHS_LIST.indexOf(monthNameB);

    if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
    }
    return monthIndexA - monthIndexB;
};

const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// Helper to convert from DB Row to application PlanData
const planFromDb = (dbPlan: any): PlanData => {
  const { customFormats, utmLinks, months, creatives, adGroups, ...rest } = dbPlan;
  return {
    ...rest,
    customFormats: customFormats ?? [],
    utmLinks: utmLinks ?? [],
    months: months ?? {},
    creatives: creatives ?? {},
    adGroups: adGroups ?? [],
  };
};

// --- Supabase Data Services ---
export const getPlans = async (userId: string): Promise<PlanData[]> => {
    // To prevent a "Type instantiation is excessively deep" error, we cast the
    // query builder to `any` to disable deep type inspection for this complex query.
    const plansTable: any = supabase.from('plans');
    const { data, error } = await plansTable
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching plans:", error);
        return [];
    }
    return data ? data.map(planFromDb) : [];
};

export const savePlan = async (plan: PlanData): Promise<PlanData | null> => {
    // To prevent a "Type instantiation is excessively deep" error, we cast the
    // query builder to `any` to disable deep type inspection for this complex query.
    const plansTable: any = supabase.from('plans');
    
    const { data, error } = await plansTable
        .upsert(plan)
        .select()
        .single();
    
    if (error) {
        console.error("Error saving plan:", error);
        return null;
    }
    return data ? planFromDb(data as any) : null;
};

export const deletePlan = async (planId: string): Promise<void> => {
    // To prevent a "Type instantiation is excessively deep" error, we cast the
    // query builder to `any` to disable deep type inspection for this complex query.
    const plansTable: any = supabase.from('plans');
    const { error } = await plansTable
        .delete()
        .eq('id', planId);

    if (error) {
        console.error("Error deleting plan:", error);
    }
};

export const getPlanById = async (planId: string): Promise<PlanData | null> => {
    // To prevent a "Type instantiation is excessively deep" error, we cast the
    // query builder to `any` to disable deep type inspection for this complex query.
    const plansTable: any = supabase.from('plans');

    const { data, error } = await plansTable
        .select('*')
        .eq('id', planId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
             console.error("Error fetching plan by ID:", error);
        }
        return null;
    }
    return data ? planFromDb(data as any) : null;
};

export const getPublicPlanById = async (planId: string): Promise<PlanData | null> => {
    // This RPC call requires a `get_public_plan` SECURITY DEFINER function in Supabase.
    // The function should take a `plan_id TEXT` argument and select from `plans`
    // where `id = plan_id` AND `is_public = true`.
    const { data, error } = await supabase
        .rpc('get_public_plan', { plan_id: planId })
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // PGRST116: No rows found
             console.error("Error fetching public plan via RPC:", error);
        }
        return null;
    }
    return data ? planFromDb(data as any) : null;
};

export const getPublicProfileByUserId = async (userId: string): Promise<{ display_name: string | null, photo_url: string | null } | null> => {
    // This RPC call requires a `get_public_profile` SECURITY DEFINER function in Supabase.
    // The function should take a `user_id_in UUID` argument and select from `profiles`
    // where `id = user_id_in`.
    const { data, error } = await supabase
        .rpc('get_public_profile', { user_id_in: userId })
        .single();

    if (error) {
         if (error.code !== 'PGRST116') { // PGRST116: No rows found
            console.error("Error fetching public profile via RPC:", error);
        }
        return null;
    }
    return data;
};


// --- Core Business Logic ---
export const recalculateCampaignMetrics = (campaign: Partial<Campaign>): Campaign => {
    const newCampaign: Partial<Campaign> = { ...campaign };
    
    let budget = Number(newCampaign.budget) || 0;
    let ctr = (Number(newCampaign.ctr) || 0) / 100;
    let taxaConversao = (Number(newCampaign.taxaConversao) || 0) / 100;
    let connectRate = (Number(newCampaign.connectRate) || 0) / 100;
    let cpc = Number(newCampaign.cpc) || 0;
    let cpm = Number(newCampaign.cpm) || 0;
    let impressoes = Number(newCampaign.impressoes) || 0;
    let cliques = Number(newCampaign.cliques) || 0;

    if (cpc > 0 && ctr > 0 && cpm === 0) {
        cpm = cpc * ctr * 1000;
    } else if (cpm > 0 && ctr > 0 && cpc === 0) {
        cpc = (cpm / 1000) / ctr;
    }

    if (budget > 0) {
        if (newCampaign.unidadeCompra === 'CPM' && cpm > 0) {
            impressoes = (budget / cpm) * 1000;
            cliques = impressoes * ctr;
            if(cliques > 0) cpc = budget / cliques; else if(ctr === 0 && cpc === 0) cpc = 0;
        } else if (newCampaign.unidadeCompra === 'CPC' && cpc > 0) {
            cliques = budget / cpc;
            if(ctr > 0) {
                impressoes = cliques / ctr;
                cpm = (budget / impressoes) * 1000;
            }
        } else {
            if(cpm > 0) {
                impressoes = (budget / cpm) * 1000;
                cliques = impressoes * ctr;
            } else if (cpc > 0) {
                cliques = budget / cpc;
                if(ctr > 0) impressoes = cliques / ctr;
            }
        }
    } else if (impressoes > 0) {
        cliques = impressoes * ctr;
        if (cpm > 0) budget = (impressoes / 1000) * cpm;
        else if (cpc > 0) budget = cliques * cpc;
    } else if (cliques > 0) {
        if(ctr > 0) impressoes = cliques / ctr;
        if (cpc > 0) budget = cliques * cpc;
        else if (cpm > 0 && impressoes > 0) budget = (impressoes / 1000) * cpm;
    }

    const conversoes = cliques * taxaConversao;
    const cpa = conversoes > 0 ? budget / conversoes : 0;
    const visitas = cliques * connectRate;
    const orcamentoDiario = budget / 30.4;
    
    // Estimate reach based on impressions and a typical frequency for the campaign type.
    const getFrequency = (campaignType?: string): number => {
        switch(campaignType) {
            case "Awareness": return 4.0;
            case "Alcance": return 3.5;
            case "Tráfego": return 1.8;
            case "Engajamento": return 2.5;
            case "Geração de Leads": return 2.2;
            case "Conversão": return 2.0;
            case "Retargeting": return 5.0; // Higher frequency for retargeting
            default: return 3.0; // A general average
        }
    };
    const frequency = getFrequency(newCampaign.tipoCampanha);
    const alcance = impressoes > 0 && frequency > 0 ? impressoes / frequency : 0;

    return {
        ...newCampaign,
        budget,
        cpc,
        cpm,
        ctr: ctr * 100,
        taxaConversao: taxaConversao * 100,
        connectRate: connectRate * 100,
        impressoes: Math.round(impressoes),
        cliques: Math.round(cliques),
        conversoes: Math.round(conversoes),
        alcance: Math.round(alcance),
        cpa,
        visitas: Math.round(visitas),
        orcamentoDiario,
    } as Campaign;
};

export const calculateKPIs = (campaign: Partial<Campaign>): Campaign => {
    return recalculateCampaignMetrics(campaign);
};

export const calculatePlanSummary = (planData: PlanData): { summary: SummaryData; monthlySummary: MonthlySummary } => {
    const allCampaigns: Campaign[] = Object.values(planData.months || {}).flat();

    const summary: SummaryData = allCampaigns.reduce((acc, campaign) => {
        const budget = Number(campaign.budget) || 0;
        acc.budget += budget;
        acc.impressoes += Number(campaign.impressoes) || 0;
        acc.alcance += Number(campaign.alcance) || 0;
        acc.cliques += Number(campaign.cliques) || 0;
        acc.conversoes += Number(campaign.conversoes) || 0;
        if(campaign.canal) {
            acc.channelBudgets[campaign.canal] = (acc.channelBudgets[campaign.canal] || 0) + budget;
        }
        return acc;
    }, { budget: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, channelBudgets: {} } as SummaryData);

    summary.ctr = summary.impressoes > 0 ? (summary.cliques / summary.impressoes) * 100 : 0;
    summary.cpc = summary.cliques > 0 ? summary.budget / summary.cliques : 0;
    summary.cpm = summary.impressoes > 0 ? (summary.budget / summary.impressoes) * 1000 : 0;
    summary.cpa = summary.conversoes > 0 ? summary.budget / summary.conversoes : 0;
    summary.taxaConversao = summary.cliques > 0 ? (summary.conversoes / summary.cliques) * 100 : 0;
    
    const numMonths = Object.keys(planData.months || {}).length;
    summary.orcamentoDiario = numMonths > 0 ? summary.budget / (numMonths * 30.4) : 0;
    
    const monthlySummary: MonthlySummary = {};
    Object.entries(planData.months || {}).forEach(([month, campaigns]) => {
        monthlySummary[month] = campaigns.reduce((acc, c) => {
            const budget = Number(c.budget) || 0;
            acc.budget += budget;
            acc.impressoes += Number(c.impressoes) || 0;
            acc.alcance += Number(c.alcance) || 0;
            acc.cliques += Number(c.cliques) || 0;
            acc.conversoes += Number(c.conversoes) || 0;
            return acc;
        }, { budget: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, channelBudgets: {}} as SummaryData);
        monthlySummary[month].taxaConversao = monthlySummary[month].cliques > 0 ? (monthlySummary[month].conversoes / monthlySummary[month].cliques) * 100 : 0;
    });

    return { summary, monthlySummary };
};

// --- PLAN CREATION ---

export const createNewEmptyPlan = async (userId: string): Promise<PlanData> => {
    const newPlan: PlanData = {
        id: `plan_${new Date().getTime()}`,
        user_id: userId,
        campaignName: 'Novo Plano em Branco',
        objective: '',
        targetAudience: '',
        location: '',
        totalInvestment: 10000,
        logoUrl: '',
        customFormats: [],
        utmLinks: [],
        months: {},
        creatives: {},
        adGroups: []
    };
    const savedPlan = await savePlan(newPlan);
    if (!savedPlan) throw new Error("Could not create empty plan");
    return savedPlan;
};

export const createNewPlanFromTemplate = async (userId: string): Promise<PlanData> => {
    const currentYear = new Date().getFullYear();
    const newPlan: PlanData = {
        id: `plan_${new Date().getTime()}`,
        user_id: userId,
        campaignName: 'Plano de Lançamento (Modelo)',
        objective: 'Lançar novo produto de skincare e gerar 100 vendas iniciais.',
        targetAudience: 'Mulheres de 25-45 anos interessadas em beleza, bem-estar e produtos sustentáveis.',
        location: 'Brasil',
        totalInvestment: 50000,
        logoUrl: 'https://placehold.co/400x300/f472b6/ffffff?text=BeautyCo',
        customFormats: [],
        utmLinks: [],
        creatives: {},
        adGroups: [],
        months: {
            [`${currentYear}-Janeiro`]: [
                calculateKPIs({
                    id: `c_tpl_1_${new Date().getTime()}`,
                    tipoCampanha: 'Tráfego', etapaFunil: 'Topo', canal: 'Google Ads', formato: 'Search',
                    objetivo: 'Atrair visitantes qualificados para o novo site.',
                    kpi: 'Cliques, CPC', publicoAlvo: 'Pessoas buscando por "skincare sustentável".',
                    budget: 5000, unidadeCompra: 'CPC', cpc: 1.5, ctr: 2.5, taxaConversao: 1, connectRate: 80,
                }),
                calculateKPIs({
                    id: `c_tpl_2_${new Date().getTime()}`,
                    tipoCampanha: 'Awareness', etapaFunil: 'Topo', canal: 'Meta Ads', formato: 'Feed/Stories',
                    objetivo: 'Gerar reconhecimento da nova marca.',
                    kpi: 'Alcance, Impressões, CPM', publicoAlvo: 'Mulheres de 25-45 no Instagram/Facebook.',
                    budget: 7500, unidadeCompra: 'CPM', cpm: 18.00, ctr: 1.2, taxaConversao: 0.2, connectRate: 60,
                }),
            ],
            [`${currentYear}-Fevereiro`]: [
                 calculateKPIs({
                    id: `c_tpl_3_${new Date().getTime()}`,
                    tipoCampanha: 'Geração de Leads', etapaFunil: 'Meio', canal: 'Meta Ads', formato: 'Lead Ad',
                    objetivo: 'Capturar leads para newsletter.',
                    kpi: 'Leads, CPL', publicoAlvo: 'Público que interagiu com campanhas de topo.',
                    budget: 6000, unidadeCompra: 'CPC', cpc: 2.0, ctr: 1.8, taxaConversao: 7, connectRate: 85,
                }),
                 calculateKPIs({
                    id: `c_tpl_4_${new Date().getTime()}`,
                    tipoCampanha: 'Conversão', etapaFunil: 'Fundo', canal: 'Google Ads', formato: 'PMax',
                    objetivo: 'Gerar vendas do produto.',
                    kpi: 'Vendas, CPA', publicoAlvo: 'Retargeting de visitantes do site.',
                    budget: 10000, unidadeCompra: 'CPC', cpc: 3.50, ctr: 3.0, taxaConversao: 5, connectRate: 90,
                })
            ]
        }
    };
    const savedPlan = await savePlan(newPlan);
    if (!savedPlan) throw new Error("Could not create template plan");
    return savedPlan;
};

// --- AI & Generation Services ---

export const callGeminiAPI = async (prompt: string, isJson: boolean = false): Promise<any> => {
    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            ...(isJson && { config: { responseMimeType: "application/json" } })
        });
        
        const text = response.text.trim();

        if (isJson) {
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : text;
            return JSON.parse(jsonString);
        }
        return text;
    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error("Failed to get response from AI.");
    }
};

export const generateAIPlan = async (userPrompt: string, language: LanguageCode): Promise<Partial<PlanData>> => {
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

    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: `Business Description: "${userPrompt}"` }] }],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema
            },
        });
        const text = response.text.trim();
        const aiData = JSON.parse(text);

        // Transform the months array into a Record<string, Campaign[]>
        const transformedMonths = (aiData.months || []).reduce((acc: Record<string, Campaign[]>, item: { month: string; campaigns: Campaign[] }) => {
            if (item.month && item.campaigns) {
                 acc[item.month] = item.campaigns;
            }
            return acc;
        }, {});
        
        // Return the plan data with the transformed months structure
        const { months, ...restOfAiData } = aiData;
        return { ...restOfAiData, months: transformedMonths };

    } catch (error) {
        console.error("Error generating AI plan:", error);
        if (error instanceof Error && (error.message.includes('responseSchema') || error.message.includes('JSON'))) {
            throw new Error("The AI response did not match the required format. Please try again.");
        }
        throw new Error("Failed to parse AI response or call API.");
    }
};


export const generateAIKeywords = async (plan: PlanData, mode: 'seed' | 'prompt', input: string, language: LanguageCode): Promise<KeywordSuggestion[]> => {
    const langInstruction = language === 'pt-BR' ? 'Responda em Português do Brasil.' : 'Respond in English.';
    const systemInstruction = `You are an SEO and SEM expert. Your task is to generate a list of relevant keywords. For each keyword, provide an estimated monthly search volume (integer), click potential (integer), and a min/max CPC (float). The result MUST be a valid JSON array of keyword objects. Do not include additional text or markdown. ${langInstruction}`;
    const prompt = `Generate 20 keywords for the following context:\n- Plan Objective: ${plan.objective}\n- Target Audience: ${plan.targetAudience}\n- ${mode === 'seed' ? 'Seed Keywords' : 'Description'}: ${input}`;
    const schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, volume: { type: Type.INTEGER }, clickPotential: { type: Type.INTEGER }, minCpc: { type: Type.NUMBER }, maxCpc: { type: Type.NUMBER } }, required: ["keyword", "volume", "clickPotential", "minCpc", "maxCpc"] } };

    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({ model: "gemini-2.5-flash", contents: [{ parts: [{ text: prompt }] }], config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema } });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error generating keywords:", error);
        throw new Error("Failed to generate keywords from AI.");
    }
};

export const generateAIImages = async (prompt: string): Promise<GeneratedImage[]> => {
    try {
        const aiClient = getAiClient();
        const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '3:4'];
        const imagePromises = aspectRatios.map(aspectRatio =>
            aiClient.models.generateImages({ model: 'imagen-3.0-generate-002', prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio } })
        );
        const responses = await Promise.all(imagePromises);
        return responses.map((response, index) => ({
            base64: response.generatedImages[0].image.imageBytes,
            aspectRatio: aspectRatios[index],
        }));
    } catch (error) {
        console.error("Error generating images:", error);
        throw new Error("Failed to generate images from AI.");
    }
};

// --- Export Services ---

const toCSV = (headers: string[], data: any[][]): string => {
    const headerRow = headers.join(',');
    const dataRows = data.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    return [headerRow, ...dataRows].join('\n');
};

export const exportCreativesAsCSV = (plan: PlanData, t: (key: string) => string) => {
    const headers = [t('Canal'), t('Nome do Grupo de Criativos'), t('Contexto para a IA'), t('Tipo'), t('Texto')];
    const data: any[][] = [];
    Object.entries(plan.creatives || {}).forEach(([channel, groups]) => {
        groups.forEach(group => {
            group.headlines.forEach(h => data.push([channel, group.name, group.context, t('Títulos (Headlines)'), h]));
            (group.longHeadlines || []).forEach(lh => data.push([channel, group.name, group.context, t('Títulos Longos (Long Headlines)'), lh]));
            group.descriptions.forEach(d => data.push([channel, group.name, group.context, t('Descrições (Descriptions)'), d]));
        });
    });
    const csv = toCSV(headers, data);
    downloadFile(`${plan.campaignName}_creatives.csv`, csv, 'text/csv;charset=utf-8;');
};

export const exportCreativesAsTXT = (plan: PlanData, t: (key: string) => string) => {
    let content = `${t('copy_builder')} - ${plan.campaignName}\n\n`;
    Object.entries(plan.creatives || {}).forEach(([channel, groups]) => {
        content += `--- ${t('Canal')}: ${channel} ---\n\n`;
        groups.forEach(group => {
            content += `> ${t('Nome do Grupo de Criativos')}: ${group.name}\n`;
            content += `> ${t('Contexto para a IA')}: ${group.context}\n\n`;
            content += `${t('Títulos (Headlines)')}:\n${group.headlines.map(h => `- ${h}`).join('\n')}\n\n`;
            content += `${t('Títulos Longos (Long Headlines)')}:\n${(group.longHeadlines || []).map(h => `- ${h}`).join('\n')}\n\n`;
            content += `${t('Descrições (Descriptions)')}:\n${group.descriptions.map(d => `- ${d}`).join('\n')}\n\n`;
            content += `-------------------------\n\n`;
        });
    });
    downloadFile(`${plan.campaignName}_creatives.txt`, content, 'text/plain;charset=utf-8;');
};

export const exportUTMLinksAsCSV = (plan: PlanData, t: (key: string) => string) => {
    const headers = [t('Data'), t('URL Completa'), 'URL', 'Source', 'Medium', t('Campanha'), 'Term', 'Content'];
    const data = (plan.utmLinks || []).map(link => [link.createdAt, link.fullUrl, link.url, link.source, link.medium, link.campaign, link.term, link.content]);
    const csv = toCSV(headers, data);
    downloadFile(`${plan.campaignName}_utm_links.csv`, csv, 'text/csv;charset=utf-8;');
};

export const exportUTMLinksAsTXT = (plan: PlanData, t: (key: string) => string) => {
    let content = `${t('utm_builder')} - ${plan.campaignName}\n\n`;
    (plan.utmLinks || []).forEach(link => {
        content += `${t('Data')}: ${new Date(link.createdAt).toLocaleString()}\n`;
        content += `${t('Campanha')}: ${link.campaign}\n`;
        content += `URL: ${link.fullUrl}\n\n`;
    });
    downloadFile(`${plan.campaignName}_utm_links.txt`, content, 'text/plain;charset=utf-8;');
};

export const exportGroupedKeywordsAsCSV = (plan: PlanData, t: (key: string) => string) => {
    const headers = [t('ad_group_column'), t('keyword'), t('search_volume'), t('estimated_clicks'), t('min_cpc'), t('max_cpc')];
    const data: any[][] = [];
    (plan.adGroups || []).forEach(group => {
        group.keywords.forEach(kw => {
            data.push([group.name, kw.keyword, kw.volume, kw.clickPotential, kw.minCpc, kw.maxCpc]);
        });
    });
    const csv = toCSV(headers, data);
    downloadFile(`${plan.campaignName}_keywords.csv`, csv, 'text/csv;charset=utf-8;');
};

export const exportGroupedKeywordsAsTXT = (plan: PlanData, t: (key: string) => string) => {
    let content = `${t('keyword_builder')} - ${plan.campaignName}\n\n`;
    (plan.adGroups || []).forEach(group => {
        content += `--- ${t('ad_group_column')}: ${group.name} ---\n\n`;
        group.keywords.forEach(kw => {
            content += `${kw.keyword}\n`;
        });
        content += `\n`;
    });
    downloadFile(`${plan.campaignName}_keywords.txt`, content, 'text/plain;charset=utf-8;');
};