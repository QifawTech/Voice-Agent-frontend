/**
 * Catalog of selectable TTS voices, keyed by language.
 *
 * Voices are provider- and language-specific:
 *   - English  → Deepgram Aura voices (model ids like "aura-asteria-en").
 *   - Tamil    → Sarvam bulbul:v3 speakers (lowercase ids like "priya").
 *
 * The `id` is sent to the backend verbatim and passed straight to the TTS
 * engine, so it MUST be a valid voice/speaker id for that provider. `label`
 * is display-only. Keep this list in sync with the backend's expectations.
 */

export type Voice = {
  id: string;
  label: string;
  gender?: "female" | "male";
};

// English — Deepgram Aura (same family the agent already uses).
const ENGLISH_VOICES: Voice[] = [
  { id: "aura-asteria-en", label: "Asteria", gender: "female" },
  { id: "aura-luna-en", label: "Luna", gender: "female" },
  { id: "aura-stella-en", label: "Stella", gender: "female" },
  { id: "aura-athena-en", label: "Athena", gender: "female" },
  { id: "aura-hera-en", label: "Hera", gender: "female" },
  { id: "aura-orion-en", label: "Orion", gender: "male" },
  { id: "aura-arcas-en", label: "Arcas", gender: "male" },
  { id: "aura-perseus-en", label: "Perseus", gender: "male" },
  { id: "aura-angus-en", label: "Angus", gender: "male" },
  { id: "aura-orpheus-en", label: "Orpheus", gender: "male" },
  { id: "aura-helios-en", label: "Helios", gender: "male" },
  { id: "aura-zeus-en", label: "Zeus", gender: "male" },
];

// Tamil — Sarvam bulbul:v3 speakers (ids are lowercase and case-sensitive).
const TAMIL_VOICES: Voice[] = [
  { id: "shubh", label: "Shubh" },
  { id: "aditya", label: "Aditya" },
  { id: "ritu", label: "Ritu" },
  { id: "priya", label: "Priya" },
  { id: "neha", label: "Neha" },
  { id: "rahul", label: "Rahul" },
  { id: "pooja", label: "Pooja" },
  { id: "rohan", label: "Rohan" },
  { id: "simran", label: "Simran" },
  { id: "kavya", label: "Kavya" },
  { id: "amit", label: "Amit" },
  { id: "dev", label: "Dev" },
  { id: "ishita", label: "Ishita" },
  { id: "shreya", label: "Shreya" },
  { id: "ratan", label: "Ratan" },
  { id: "varun", label: "Varun" },
  { id: "manan", label: "Manan" },
  { id: "sumit", label: "Sumit" },
  { id: "roopa", label: "Roopa" },
  { id: "kabir", label: "Kabir" },
  { id: "aayan", label: "Aayan" },
  { id: "ashutosh", label: "Ashutosh" },
  { id: "advait", label: "Advait" },
  { id: "anand", label: "Anand" },
  { id: "tanya", label: "Tanya" },
  { id: "tarun", label: "Tarun" },
  { id: "sunny", label: "Sunny" },
  { id: "mani", label: "Mani" },
  { id: "gokul", label: "Gokul" },
  { id: "vijay", label: "Vijay" },
  { id: "shruti", label: "Shruti" },
  { id: "suhani", label: "Suhani" },
  { id: "mohit", label: "Mohit" },
  { id: "kavitha", label: "Kavitha" },
  { id: "rehan", label: "Rehan" },
  { id: "soham", label: "Soham" },
  { id: "rupali", label: "Rupali" },
];

export const VOICES_BY_LANGUAGE: Record<string, Voice[]> = {
  english: ENGLISH_VOICES,
  tamil: TAMIL_VOICES,
};

/** The voice shown by default for a language before the tenant picks one. */
export const DEFAULT_VOICE_BY_LANGUAGE: Record<string, string> = {
  english: "aura-asteria-en",
  tamil: "shreya",
};

/** Voices offered for a language, or an empty list for an unknown one. */
export function voicesForLanguage(language: string): Voice[] {
  return VOICES_BY_LANGUAGE[language?.toLowerCase()] ?? [];
}

// ──────────────────────────────────────────────────────────────
// TTS provider selection
// ──────────────────────────────────────────────────────────────

/**
 * Which TTS provider the agent uses.
 *   - "auto": the built-in routing — Deepgram for English, Sarvam for the
 *     Indian languages (the original behaviour).
 *   - "elevenlabs": ElevenLabs for EVERY language (its models are multilingual),
 *     using one voice id + model picked below.
 */
export type TtsProvider = "auto" | "elevenlabs";

export const TTS_PROVIDERS: { id: TtsProvider; label: string }[] = [
  { id: "auto", label: "Auto (Deepgram / Sarvam)" },
  { id: "elevenlabs", label: "ElevenLabs" },
];

/**
 * Static fallback list of ElevenLabs TTS models. The dashboard loads the live
 * list from the account at runtime; this is only used until that resolves or if
 * it fails. The `id` is sent to the backend verbatim.
 */
export const ELEVENLABS_MODELS: { id: string; label: string }[] = [
  { id: "eleven_multilingual_v2", label: "Multilingual v2 — best quality" },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5 — low latency" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5 — fastest" },
  { id: "eleven_turbo_v2", label: "Turbo v2 — English" },
  { id: "eleven_flash_v2", label: "Flash v2 — English" },
];

export const DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2";
