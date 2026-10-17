import { GoogleGenerativeAI } from '@google/generative-ai';
import { Subject, AIClassificationResult } from '../types';

export type AIProvider = 'gemini' | 'groq' | 'openai' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
}

// Storage helpers
export const getAIConfig = (): AIConfig => {
  const provider = (localStorage.getItem('SN_AI_PROVIDER') as AIProvider) || 'gemini';
  const apiKey = localStorage.getItem('SN_AI_KEY') || localStorage.getItem('SN_GEMINI_KEY') || '';
  const model = localStorage.getItem('SN_AI_MODEL') || (
    provider === 'gemini' ? 'gemini-2.5-flash' :
    provider === 'groq' ? 'llama-3.3-70b-versatile' :
    provider === 'openai' ? 'gpt-4o-mini' : 'default'
  );
  const customBaseUrl = localStorage.getItem('SN_AI_BASEURL') || '';

  return { provider, apiKey: apiKey.trim(), model: model.trim(), customBaseUrl: customBaseUrl.trim() };
};

export const saveAIConfig = (config: AIConfig) => {
  localStorage.setItem('SN_AI_PROVIDER', config.provider);
  localStorage.setItem('SN_AI_KEY', config.apiKey.trim());
  localStorage.setItem('SN_AI_MODEL', config.model.trim());
  if (config.customBaseUrl) {
    localStorage.setItem('SN_AI_BASEURL', config.customBaseUrl.trim());
  } else {
    localStorage.removeItem('SN_AI_BASEURL');
  }
};

export const isAIConfigured = (): boolean => {
  const config = getAIConfig();
  return Boolean(config.apiKey.length > 5);
};

// Helper: Convert File to Base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Helper: Quick client-side text extractor for PDFs (first ~3000 chars)
export async function extractPdfTextSample(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.slice(0, 150000).arrayBuffer(); // Read first 150KB
    const text = new TextDecoder('latin1').decode(arrayBuffer);
    
    // Extract readable ascii strings from PDF text streams
    const matches = text.match(/\(([^()]{3,})\)|\[([^\[\]]{3,})\]/g);
    if (matches && matches.length > 0) {
      const cleaned = matches
        .map(m => m.replace(/[\(\)\[\]]/g, ' ').trim())
        .filter(m => m.length > 2 && !m.startsWith('/'))
        .slice(0, 80)
        .join(' ');
      if (cleaned.length > 50) return cleaned;
    }
  } catch (e) {
    console.warn('Could not extract raw text sample from PDF:', e);
  }
  return `File Name: "${file.name}"`;
}

// Build Prompt for any LLM
function buildSystemPrompt(fileName: string, subjects: Subject[], textSample: string): string {
  const subjectsContext = subjects.map(s => {
    const unitList = s.units?.map(u => `Unit ${u.unit_number}: ${u.title}`).join(', ') || 'General';
    return `- ${s.name} (Code: ${s.code || 'N/A'}) [Units: ${unitList}]`;
  }).join('\n');

  return `
You are a university engineering notes classifier and organizer.
The student uploaded a document with filename: "${fileName}".
Document text sample: "${textSample}"

STUDENT'S SUBJECTS & UNITS:
${subjectsContext}

TASK:
1. Identify which Subject this document belongs to from the list.
2. Identify the Unit number (1 to 5).
3. Create a clean, professional renamed filename: [Subject]_[UnitX]_[Topic].pdf
   Example: "OS_Unit2_CPU_Scheduling.pdf"
4. Write a 1-sentence summary of the topics.
5. List 3 key keywords.

Return ONLY raw JSON with no markdown wrapping:
{
  "subjectName": "string",
  "unitNumber": 1,
  "cleanTitle": "string",
  "summary": "string",
  "confidence": 0.95,
  "keyTopics": ["topic1", "topic2"]
}
`;
}

// Universal Classifier executing against the user's chosen provider
export async function universalClassifyNote(
  file: File,
  subjects: Subject[]
): Promise<AIClassificationResult> {
  const config = getAIConfig();
  if (!config.apiKey) {
    throw new Error('No AI API Key found. Please add your key in Settings (gear icon).');
  }

  const textSample = await extractPdfTextSample(file);
  const prompt = buildSystemPrompt(file.name, subjects, textSample);

  // 1. GROQ (Blazing Fast Llama 3.3 70B - completely free API)
  if (config.provider === 'groq') {
    const model = config.model || 'llama-3.3-70b-versatile';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Groq error: ${res.statusText}`);
    }
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    return parseAIResponse(rawContent);
  }

  // 2. OPENAI (GPT-4o-mini / GPT-4o)
  if (config.provider === 'openai') {
    const model = config.model || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `OpenAI error: ${res.statusText}`);
    }
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    return parseAIResponse(rawContent);
  }

  // 3. CUSTOM OPENAI-COMPATIBLE / OPENROUTER / DEEPSEEK
  if (config.provider === 'custom') {
    const endpoint = (config.customBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '') + '/chat/completions';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Custom AI provider error: ${res.statusText}`);
    }
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    return parseAIResponse(rawContent);
  }

  // 4. GOOGLE GEMINI (Default)
  const base64Data = await fileToBase64(file);
  const genAI = new GoogleGenerativeAI(config.apiKey);
  
  // Try candidate models in order: 2.5 flash, 2.0 flash, 3.5 flash, flash-latest
  const geminiCandidates = [
    config.model || 'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-1.5-flash-latest'
  ];

  let lastErr: any = null;
  for (const mName of geminiCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: mName,
        generationConfig: { responseMimeType: 'application/json' }
      });
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type || 'application/pdf'
          }
        },
        prompt
      ]);
      return parseAIResponse(result.response.text());
    } catch (err: any) {
      lastErr = err;
      if (err?.message?.includes('404') || err?.message?.includes('503') || err?.message?.includes('429')) {
        continue;
      }
      break;
    }
  }

  throw lastErr || new Error('Could not connect to Gemini API. Check your API key.');
}

function parseAIResponse(raw: string): AIClassificationResult {
  let clean = raw.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
  }
  const parsed = JSON.parse(clean);
  return {
    subjectName: parsed.subjectName || 'General',
    unitNumber: Number(parsed.unitNumber) || 1,
    cleanTitle: parsed.cleanTitle || 'Notes.pdf',
    summary: parsed.summary || '',
    confidence: Number(parsed.confidence) || 0.95,
    keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : []
  };
}
