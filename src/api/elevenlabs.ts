import client from "./client";

/** An ElevenLabs TTS model, as returned by the backend proxy. */
export interface ElevenLabsModel {
  model_id: string;
  name: string;
}

/** An ElevenLabs voice (account voice or a looked-up id). */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string | null;
}

/** TTS-capable ElevenLabs models for the dropdown (live, with server fallback). */
export async function listElevenLabsModels(): Promise<ElevenLabsModel[]> {
  const { data } = await client.get<{ models: ElevenLabsModel[] }>(
    "/api/v1/elevenlabs/models",
  );
  return data.models ?? [];
}

/** The account's ElevenLabs voices for the dropdown. */
export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const { data } = await client.get<{ voices: ElevenLabsVoice[] }>(
    "/api/v1/elevenlabs/voices",
  );
  return data.voices ?? [];
}

/** Look up a single voice by id — powers the "search by Voice ID" box. */
export async function lookupElevenLabsVoice(
  voiceId: string,
): Promise<ElevenLabsVoice> {
  const { data } = await client.get<ElevenLabsVoice>(
    `/api/v1/elevenlabs/voices/${encodeURIComponent(voiceId)}`,
  );
  return data;
}
