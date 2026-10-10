// Ports (hexagonal architecture): the core in src/lib/core/ depends only on these interfaces.
// Each outside service has an adapter in src/lib/adapters/; swapping a vendor is one new file.
import type { z } from "zod";

export interface HealthResult {
  ok: boolean;
  detail: string;
}

// ---- Discovery (kit engine today; official Places API later) ----
export interface Place {
  placeKey: string;
  name: string;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  website: string | null;
  status: string | null;
  raw?: Record<string, unknown>;
}
export interface DiscoveryProvider {
  name: string;
  search(q: { keywords: string[]; lat: number; lon: number; radiusM: number; depth?: number; maxTimeS?: number }): Promise<Place[]>;
  health(): Promise<HealthResult>;
}

// ---- LLM (Gemini · Groq · OpenRouter · Ollama, through one router) ----
export interface LlmCall<T> {
  agent: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
  leadId?: number | null;
  campaignId?: number | null;
  temperature?: number;
}
export interface LlmResult<T> {
  output: T;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}
export interface LLM {
  generate<T>(call: LlmCall<T>): Promise<LlmResult<T>>;
}

// ---- Mailer (Gmail SMTP + IMAP today; any SMTP later) ----
export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}
export interface Mailer {
  send(mail: OutgoingMail): Promise<{ messageId: string }>;
  health(): Promise<HealthResult>;
}

// ---- Notifier (Telegram) ----
export interface Notifier {
  text(message: string): Promise<void>;
  audio(mp3: Buffer, caption: string, filename?: string): Promise<void>;
  health(): Promise<HealthResult>;
}

// ---- Voice (ElevenLabs text-to-speech) ----
export interface Voice {
  speak(text: string, opts?: { language?: string }): Promise<Buffer>;
  health(): Promise<HealthResult>;
}
