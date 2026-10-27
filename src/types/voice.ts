export interface LiveKitTokenRequest {
  participant_name?: string;
  language?: string;
  tts_provider?: string;
  /** Agent voice to speak with: "female" (default) or "male". */
  voice_gender?: string;
  /** Explicit TTS voice id (Sarvam speaker or Deepgram Aura model). */
  voice?: string;
  /** Speaking pace: 1.0 normal, <1 slower, >1 faster. Range 0.5–2.0. */
  pace?: number;
  restaurant_id?: string;
  room?: string;
}

export interface LiveKitTokenResponse {
  token: string;
  room: string;
  livekit_url: string;
  participant_identity: string;
}

export interface DebugEvent {
  type: "debug";
  event: "tool_call" | "tool_result" | "llm_prompt";
  function?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  instructions?: string;
}

export interface TranscriptMessage {
  /** Agent-side item id. Interim and final packets share one, so the client
   *  upserts on it instead of appending a bubble per packet. */
  id: string;
  role: "user" | "agent";
  text: string;
  /** False while speech recognition is still revising this turn. */
  isFinal: boolean;
  timestamp: Date;
}
