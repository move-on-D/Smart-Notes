import { GoogleGenerativeAI } from '@google/generative-ai';
import { Subject, AIClassificationResult } from '../types';

export type AIProvider = 'gemini' | 'groq' | 'openai' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
}

export interface CreditTracker {
  total: number;
  used: number;
  remaining: number;
  resetDate: string;
}

// Default system-baked API Key (Reads from environment or client fallback)
const DEFAULT_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof window !== 'undefined' ? window.atob('QVEuQWI4Uk42SlZ2ZlExRi01c2lPbWNveWg5V1czTGdmbm9fS19CVEFwUE8zTDFaVXNpbkE=') : '');

// Daily quota tracking (e.g., 1500 daily requests for Gemini Flash / Groq)
const DAILY_QUOTA = 1500;

export const getCreditTracker = (): CreditTracker => {
  const todayStr = new Date().toISOString().split('T')[0];
  const storedReset = localStorage.getItem('SN_CREDIT_RESET_DATE') || '';
  let used = Number(localStorage.getItem('SN_CREDIT_USED') || 0);

  if (storedReset !== todayStr) {
    // Reset counter for new day
    used = 0;
    localStorage.setItem('SN_CREDIT_RESET_DATE', todayStr);
    localStorage.setItem('SN_CREDIT_USED', '0');
  }

  const remaining = Math.max(0, DAILY_QUOTA - used);
  return {
    total: DAILY_QUOTA,
    used,
    remaining,
    resetDate: todayStr
  };
};

export const recordCreditUsage = () => {
  const current = getCreditTracker();
  const newUsed = current.used + 1;
  localStorage.setItem('SN_CREDIT_USED', String(newUsed));
  // Dispatch custom event for real-time reactive UI update
  window.dispatchEvent(new CustomEvent('sn_credits_updated'));
};

// Storage helpers
export const getAIConfig = (): AIConfig => {
  const provider = (localStorage.getItem('SN_AI_PROVIDER') as AIProvider) || 'gemini';
  const apiKey = localStorage.getItem('SN_AI_KEY') || DEFAULT_GEMINI_KEY;
  const model = localStorage.getItem('SN_AI_MODEL') || (
    provider === 'gemini' ? 'gemini-3.1-flash-lite' :
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
  window.dispatchEvent(new CustomEvent('sn_ai_config_updated'));
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

// Client-side text extractor for PDFs & text search
export async function extractPdfTextSample(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.slice(0, 250000).arrayBuffer(); // Read first 250KB
    const text = new TextDecoder('latin1').decode(arrayBuffer);
    
    // Extract readable ascii strings from PDF text streams
    const matches = text.match(/\(([^()]{3,})\)|\[([^\[\]]{3,})\]/g);
    if (matches && matches.length > 0) {
      const cleaned = matches
        .map(m => m.replace(/[\(\)\[\]]/g, ' ').trim())
        .filter(m => m.length > 2 && !m.startsWith('/'))
        .slice(0, 150)
        .join(' ');
      if (cleaned.length > 50) return cleaned;
    }
  } catch (e) {
    console.warn('Could not extract text sample from PDF:', e);
  }
  return `File Name: "${file.name}"`;
}

// Full-length text extractor for Voice Reading & MOVE ON bot
export async function extractFullReadableText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(arrayBuffer);
    const matches = text.match(/\(([^()]{3,})\)/g);
    if (matches && matches.length > 0) {
      const readable = matches
        .map(m => m.replace(/[\(\)]/g, ' ').trim())
        .filter(m => m.length > 2 && !m.startsWith('/') && !m.startsWith('\\'))
        .join(' ');
      if (readable.length > 30) return readable;
    }
  } catch (e) {
    console.warn('Could not extract full readable text:', e);
  }
  return file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

// Build Prompt for notes classification
function buildSystemPrompt(fileName: string, subjects: Subject[], textSample: string): string {
  const subjectsContext = subjects.map(s => {
    return `- ${s.name} (Code: ${s.code || 'N/A'})`;
  }).join('\n');

  return `
You are a university college notes organizer.
The student uploaded a document with filename: "${fileName}".
Document text sample: "${textSample}"

STUDENT'S REGISTERED SUBJECTS:
${subjectsContext}

TASK:
1. Identify which Subject this document belongs to from the list.
2. Create a clean, professional renamed title: [Topic or Chapter Name].pdf
   Example: "Deadlocks and Process Synchronization.pdf" or "Binary Search Trees.pdf"
3. Write a 1-sentence summary of the topics covered strictly in this document.
4. List 3 key keywords.

Return ONLY raw JSON with no markdown wrapping:
{
  "subjectName": "string",
  "cleanTitle": "string",
  "summary": "string",
  "confidence": 0.95,
  "keyTopics": ["topic1", "topic2"]
}
`;
}

// MOVE ON Bot - Strictly explains only from the student's uploaded notes
export async function askMoveOnBot(
  question: string,
  noteTitle: string,
  subjectName: string,
  notesContent: string
): Promise<string> {
  const config = getAIConfig();
  if (!config.apiKey) {
    return "Please configure the AI API Key or notify your admin to reload credits.";
  }

  const systemInstructions = `
You are "MOVE ON", an intelligent university study companion.
The student is studying: "${noteTitle}" in "${subjectName}".

STRICT RULES:
1. You must answer the student's question STRICTLY and ONLY using the provided lecture notes text below.
2. Do NOT hallucinate or bring in outside textbook theories unless explicitly requested by the student.
3. If the topic or answer is not mentioned in the notes text, politely state: "This topic is not covered in your uploaded notes for this chapter."
4. Keep explanations clear, structured, and easy for an engineering college student to understand for exams.

LECTURE NOTES TEXT:
"""
${notesContent.slice(0, 15000)}
"""
`;

  recordCreditUsage();

  if (config.provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: question }
        ],
        temperature: 0.2
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "No response received.";
  }

  if (config.provider === 'openai' || config.provider === 'custom') {
    const url = config.customBaseUrl 
      ? `${config.customBaseUrl.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: question }
        ],
        temperature: 0.2
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "No response received.";
  }

  // Google Gemini default
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model || 'gemini-3.1-flash-lite',
    systemInstruction: systemInstructions
  });

  const chat = await model.generateContent(question);
  return chat.response.text();
}

// Universal Classifier executing against the chosen provider
export async function universalClassifyNote(
  file: File,
  subjects: Subject[]
): Promise<AIClassificationResult> {
  const config = getAIConfig();
  if (!config.apiKey) {
    throw new Error('No AI API Key found. Please add or notify admin.');
  }

  recordCreditUsage();
  const textSample = await extractPdfTextSample(file);
  const prompt = buildSystemPrompt(file.name, subjects, textSample);

  // 1. GROQ
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
    if (!res.ok) throw new Error(`Groq error: ${res.statusText}`);
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    return parseAIResponse(rawContent);
  }

  // 2. OPENAI & CUSTOM
  if (config.provider === 'openai' || config.provider === 'custom') {
    const url = config.customBaseUrl 
      ? `${config.customBaseUrl.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || (config.provider === 'openai' ? 'gpt-4o-mini' : 'meta-llama/llama-3.3-70b-instruct'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) throw new Error(`AI error: ${res.statusText}`);
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    return parseAIResponse(rawContent);
  }

  // 3. GOOGLE GEMINI (Default - Optimized Lightweight Text Analysis)
  const genAI = new GoogleGenerativeAI(config.apiKey);
  
  // Fast model: gemini-3.1-flash-lite
  const targetModel = config.model || 'gemini-3.1-flash-lite';

  try {
    const model = genAI.getGenerativeModel({
      model: targetModel,
      generationConfig: { 
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    // Send concise text snippet directly (10x faster than full PDF base64 binary)
    const result = await model.generateContent(prompt);
    return parseAIResponse(result.response.text());
  } catch (err: any) {
    console.warn('Fast text model error, trying fallback:', err);
    // If text fails, try with small file slice
    try {
      const base64Data = await fileToBase64(file);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.1-flash-lite',
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
    } catch (fallbackErr: any) {
      throw fallbackErr || err;
    }
  }
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
