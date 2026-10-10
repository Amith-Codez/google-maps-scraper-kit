// Voice writer: turns the pitch into a 20-second voice-note script in the language the owner actually speaks.
// Owners who speak Hindi won't listen to English, and textbook Hindi sounds fake: so we write desi, spoken Hindi.
import { z } from "zod";
import type { LLM } from "../ports";

export const VOICE_LANGS = {
  en: {
    label: "English",
    style: `Simple Indian English, the way a friendly young freelancer in Hyderabad talks. Short sentences.`,
  },
  hi: {
    label: "Hindi (desi)",
    style: `Desi spoken Hindi (Hindustani), exactly how people talk in Hyderabad or any Indian city — NOT textbook or shuddh Hindi.
Write in Devanagari, but keep everyday English words in English as people say them: website, online, menu, booking, order, demo, WhatsApp, link, photo, customers.
Use casual words: "aapka", "dekhiye", "bas", "ekdum", "badiya", "ho jayega", "kya bolte ho", "ji". Never use formal words like उपलब्ध, प्रस्ताव, सुविधा, अनुरोध, ग्राहक (say customers), संपर्क.
Start with "Namaste ji".
Example of the exact style and script: "नमस्ते जी, मैं Amith हूँ, ये एक AI voice note है। आपके customers के लिए एक मस्त idea है, बस एक बार demo देख लीजिए।"`,
  },
  te: {
    label: "Telugu",
    style: `Colloquial spoken Telugu as people talk in Hyderabad, in Telugu script, NOT formal/bookish Telugu.
Keep everyday English words in English: website, online, menu, booking, order, demo, WhatsApp, link, customers.
Start with "Namaskaram andi".
Example of the exact style and script: "నమస్కారం అండి, నేను Amith, ఇది ఒక AI voice note. మీ customers కోసం ఒక మంచి idea ఉంది, ఒక్కసారి demo చూడండి."`,
  },
} as const;
export type VoiceLang = keyof typeof VOICE_LANGS;

export const VoiceOut = z.object({ script: z.string().describe("the spoken script, at most 55 words") });

const SCRIPT_RE: Partial<Record<VoiceLang, RegExp>> = { hi: /[\u0900-\u097F]/g, te: /[\u0C00-\u0C7F]/g };

/** True if at least 40% of the letters are in the language's own script (TTS pronounces it far better). */
export function inNativeScript(text: string, lang: VoiceLang): boolean {
  const re = SCRIPT_RE[lang];
  if (!re) return true;
  const native = (text.match(re) ?? []).length;
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  return letters > 0 && native / letters >= 0.4;
}

export async function writeVoiceScript(
  llm: LLM,
  input: { lang: VoiceLang; senderName: string; ideaTitle: string; idea: string; why: string; service: string; campaignId: number },
) {
  const L = VOICE_LANGS[input.lang];
  const system = `You write a 20-second WhatsApp voice note from ${input.senderName}, a local freelancer (${input.service}), to a business owner.
Language and style: ${L.style}
Content, in this order: greet; say this is an AI-made voice note from ${input.senderName}; the one idea and what their customers get; why it helps (one line); offer a free 2-minute demo, they just reply on WhatsApp.
Hard rules: at most 55 words. NO business name, NO ratings, NO review counts, NO addresses, NO prices, NO dates. Warm, not salesy.`;
  const prompt = `Idea: ${input.ideaTitle}: ${input.idea}\nWhy it helps: ${input.why}`;
  const first = await llm.generate({ agent: "voice", system, prompt, schema: VoiceOut, campaignId: input.campaignId, maxOutputTokens: 350, temperature: 0.7 });
  if (inNativeScript(first.output.script, input.lang)) return first;
  // Roman-letter Hindi/Telugu: ask once more, explicitly for the native script.
  const script = input.lang === "hi" ? "Devanagari (देवनागरी)" : "Telugu script (తెలుగు)";
  return llm.generate({
    agent: "voice",
    system: `${system}\nIMPORTANT: write it in ${script}, keeping only the English words (website, menu, demo, WhatsApp, online, booking, customers) in English letters.`,
    prompt: `${prompt}\nYour last draft was in Roman letters; rewrite it in ${script}:\n${first.output.script}`,
    schema: VoiceOut,
    campaignId: input.campaignId,
    maxOutputTokens: 400,
    temperature: 0.4,
  });
}
