import { GoogleGenerativeAI } from '@google/generative-ai';
import { Subject, AIClassificationResult } from '../types';

const getGeminiApiKey = () => {
  return (import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('SN_GEMINI_KEY') || '').trim();
};

export const isGeminiConfigured = () => Boolean(getGeminiApiKey());

export const saveGeminiApiKey = (key: string) => {
  localStorage.setItem('SN_GEMINI_KEY', key.trim());
  window.location.reload();
};

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

// Dynamically discover all active models directly from Google AI Studio
async function discoverAvailableModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const models: Array<{ name: string; supportedGenerationMethods?: string[] }> = data.models || [];
      const contentModels = models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''));

      // Sort with latest Gemini 3.x Flash models at highest priority
      const priorityOrder = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-002',
        'gemini-1.5-flash',
        'gemini-3.8-pro',
        'gemini-3.5-pro',
        'gemini-3-pro',
        'gemini-2.5-pro',
        'gemini-1.5-pro'
      ];

      const ordered: string[] = [];
      for (const pref of priorityOrder) {
        const found = contentModels.find(m => m === pref || m.startsWith(pref));
        if (found && !ordered.includes(found)) {
          ordered.push(found);
        }
      }

      // Add any remaining models that support generateContent
      for (const m of contentModels) {
        if (!ordered.includes(m)) {
          ordered.push(m);
        }
      }

      if (ordered.length > 0) {
        return ordered;
      }
    }
  } catch (err) {
    console.warn('Could not query dynamic models list:', err);
  }

  // Fallback defaults prioritizing 2026 latest models
  return [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest'
  ];
}

export async function classifyAndRenameNote(
  file: File,
  subjects: Subject[]
): Promise<AIClassificationResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Google Gemini API Key is missing. Please configure it in settings (gear icon).');
  }

  // Dynamically resolve models list for this exact key
  const availableModels = await discoverAvailableModels(apiKey);
  console.log('Available Gemini Models discovered:', availableModels);

  // Format syllabus / subject context
  const subjectsContext = subjects.map(s => {
    const unitList = s.units?.map(u => `Unit ${u.unit_number}: ${u.title} (Topics: ${u.keywords?.join(', ') || ''})`).join('\n    ') || 'No specific units provided';
    return `- Subject: "${s.name}" (Code: ${s.code || 'N/A'})\n    ${unitList}`;
  }).join('\n\n');

  const prompt = `
You are an expert college engineering document organizer.
The student has uploaded a PDF file (original name: "${file.name}").
Analyze the document (first 1-3 pages) and classify it against the student's registered subjects and units.

STUDENT'S SYLLABUS / SUBJECTS:
${subjectsContext}

YOUR TASKS:
1. Identify which Subject this document belongs to. (Pick the closest exact subject name from the list. If it doesn't match any, choose the closest or "General").
2. Identify the Unit number (e.g. 1, 2, 3, 4, 5). If unspecified, make your best guess based on the topics.
3. Generate a CLEAN, DESCRIPTIVE, STANDARDIZED filename (ending in .pdf).
   Format: [SubjectAbbr]_[UnitNumber]_[MainTopic].pdf
   Example: "OS_Unit2_CPU_Scheduling.pdf" or "DSA_Unit3_Binary_Trees.pdf".
   Never keep random camera or WhatsApp names like "DOC-2024..." or "IMG...".
4. Provide a 2-sentence summary of what this document covers.
5. List 3 to 5 key topics / keywords detected in this note.
6. Rate your confidence (0.0 to 1.0).

Return ONLY a valid JSON object with this exact structure:
{
  "subjectName": "string",
  "unitNumber": number,
  "cleanTitle": "string",
  "summary": "string",
  "confidence": number,
  "keyTopics": ["string", "string"]
}
`;

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || 'application/pdf';
  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError: any = null;

  // Try each candidate model dynamically until one succeeds
  for (const modelName of availableModels) {
    try {
      console.log(`Executing with Gemini Model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg'
          }
        },
        prompt
      ]);

      const responseText = result.response.text();
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      return JSON.parse(cleanText) as AIClassificationResult;
    } catch (err: any) {
      console.warn(`Model ${modelName} returned error:`, err?.message || err);
      lastError = err;
      // If 404, not found, or 503 high demand / 429 busy, immediately try next model!
      if (
        err?.message?.includes('404') || 
        err?.message?.includes('not found') || 
        err?.message?.includes('not supported') ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('429')
      ) {
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Could not connect to Google Gemini API.');
}
