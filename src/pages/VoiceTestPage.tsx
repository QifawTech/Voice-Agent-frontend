import { useState, useRef, useCallback, useEffect } from "react";
import TenancyPromptModal from "@/components/TenancyPromptModal";
import { useTenancy } from "@/hooks/useTenancy";
import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";
import type { Participant, TranscriptionSegment } from "livekit-client";
import { Mic, MicOff, Phone, PhoneOff, AudioLines, Radio, Bug } from "lucide-react";
import { getLiveKitToken } from "@/api/livekit";
import { listTenants } from "@/api/tenants";
import type { Tenant } from "@/types/tenant";
import type { TranscriptMessage } from "@/types/voice";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import { Card, CardHeader, CardBody } from "@/components/shared/Card";
import SignalOrb, { type OrbState } from "@/components/shared/SignalOrb";
import { Skeleton } from "@/components/shared/Skeleton";
import { LANGUAGES } from "@/lib/constants";
import { voicesForLanguage, DEFAULT_VOICE_BY_LANGUAGE } from "@/lib/voices";
import { cn } from "@/lib/utils";

export default function VoiceTestPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [language, setLanguage] = useState("english");
  const [voice, setVoice] = useState(DEFAULT_VOICE_BY_LANGUAGE["english"] ?? "");
  const [pace, setPace] = useState(1.0);
  const [restaurantId, setRestaurantId] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [debugEvents, setDebugEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Configuring the agent is the point where this question stops being
  // optional: single and multi tenant need different wiring.
  const tenancy = useTenancy();
  const [askTenancy, setAskTenancy] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const loadTenants = useCallback(async () => {
    try {
      const res = await listTenants();
      setTenants(res.tenants ?? []);
      setSelectedTenant((cur) => cur || res.tenants?.[0]?.id || "");
    } catch {
      setError("Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript]);

  // Tear the room down if the page unmounts mid-call, otherwise the mic stays
  // live and the agent keeps talking to a page nobody is looking at.
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
      document.getElementById("agent-audio")?.remove();
    };
  }, []);

  /**
   * Interim and final packets for one turn share an id, so replace in place
   * rather than appending — otherwise every revision of a sentence stacks up
   * as its own bubble.
   */
  const upsertTranscript = useCallback(
    (role: "user" | "agent", text: string, id: string, isFinal: boolean) => {
      setTranscript((prev) => {
        const i = prev.findIndex((m) => m.id === id);
        if (i === -1) {
          return [...prev, { id, role, text, isFinal, timestamp: new Date() }];
        }
        const next = [...prev];
        next[i] = { ...next[i], text, isFinal };
        return next;
      });
    },
    [],
  );

  const connect = useCallback(async () => {
    const tenant = tenants.find((t) => t.id === selectedTenant);
    if (!tenant) {
      setError("Select a tenant first.");
      return;
    }

    // Ask before connecting rather than failing mid-call with a confusing 401.
    if (!tenant.tenancy_type) {
      setAskTenancy(true);
      return;
    }

    setError("");
    setTranscript([]);
    setDebugEvents([]);

    try {
      const tokenRes = await getLiveKitToken(tenant.id, tenant.widget_api_key || "", {
        participant_name: "dashboard-tester",
        language,
        voice: voice || undefined,
        pace,
        restaurant_id: restaurantId || undefined,
      });

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.ConnectionStateChanged, setConnectionState);

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.id = "agent-audio";
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });

      // Transcripts come from LiveKit's own transcription stream, not from
      // data packets. The agent publishes a segment per turn and re-publishes
      // it with more text as it is spoken, so this fires many times per turn.
      room.on(
        RoomEvent.TranscriptionReceived,
        (segments: TranscriptionSegment[], participant?: Participant) => {
          // The agent attributes the caller's speech to the caller, so the
          // publisher identity is what separates the two sides.
          const role =
            participant?.identity === room.localParticipant.identity ? "user" : "agent";
          for (const seg of segments) {
            // seg.text is the full text of the turn so far (cumulative, not a
            // delta), so replacing is correct — appending would duplicate.
            upsertTranscript(role, seg.text, seg.id, seg.final);
          }
        },
      );

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === "debug") {
            setDebugEvents((prev) => [...prev, JSON.stringify(data, null, 2)]);
          }
        } catch {
          // not a JSON packet we own
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnectionState(ConnectionState.Disconnected);
        document.getElementById("agent-audio")?.remove();
      });

      await room.connect(tokenRes.livekit_url, tokenRes.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
      setConnectionState(ConnectionState.Disconnected);
    }
  }, [selectedTenant, tenants, language, voice, pace, restaurantId, upsertTranscript]);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    document.getElementById("agent-audio")?.remove();
  }, []);

  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;
    const next = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!next);
    setIsMuted(next);
  }, [isMuted]);

  const isConnected = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;

  const orbState: OrbState = isConnecting
    ? "connecting"
    : isConnected
      ? isMuted
        ? "muted"
        : "live"
      : "idle";

  const orbCaption = {
    idle: "Ready to call",
    connecting: "Connecting…",
    live: "Listening",
    muted: "Muted",
  }[orbState];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Voice Test" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-[420px] rounded-card" />
          <Skeleton className="h-[420px] rounded-card lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Voice Test"
        subtitle="Call the agent from the browser and watch the conversation as it happens."
        actions={
          <Badge tone={isConnected ? "success" : isConnecting ? "warning" : "neutral"}>
            <Radio size={11} className={isConnected ? "animate-pulse" : undefined} />
            {connectionState}
          </Badge>
        }
      />

      {error && (
        <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Configuration" />
            <CardBody className="space-y-4 pt-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">Tenant</span>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  disabled={isConnected}
                  className="h-10 w-full disabled:opacity-60"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">Language</span>
                <select
                  value={language}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLanguage(next);
                    // Keep the voice valid for the new language.
                    setVoice(
                      voicesForLanguage(next)[0]?.id ??
                        DEFAULT_VOICE_BY_LANGUAGE[next] ??
                        "",
                    );
                  }}
                  disabled={isConnected}
                  className="h-10 w-full disabled:opacity-60"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">Voice</span>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  disabled={isConnected || voicesForLanguage(language).length === 0}
                  className="h-10 w-full disabled:opacity-60"
                >
                  {voicesForLanguage(language).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                      {v.gender ? ` (${v.gender === "female" ? "F" : "M"})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-text-muted">
                  <span>Pace (speed)</span>
                  <span className="tabular text-text-dim">{pace.toFixed(2)}×</span>
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={pace}
                  onChange={(e) => setPace(parseFloat(e.target.value))}
                  disabled={isConnected}
                  className="w-full disabled:opacity-60"
                />
                <span className="mt-1 flex justify-between text-[10px] text-text-dim">
                  <span>Slower</span>
                  <span>Normal (1.0)</span>
                  <span>Faster</span>
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">
                  Restaurant ID <span className="text-text-dim">(optional)</span>
                </span>
                <input
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  disabled={isConnected}
                  placeholder="rest_123"
                  className="h-10 w-full disabled:opacity-60"
                />
              </label>
            </CardBody>
          </Card>

          {/* Call control — the hero of this screen */}
          <Card>
            <CardBody className="flex flex-col items-center gap-5 py-8">
              <SignalOrb state={orbState} />

              <p
                aria-live="polite"
                className={cn(
                  "tabular text-sm font-medium",
                  orbState === "live" && "text-accent-light",
                  orbState === "muted" && "text-warning",
                  orbState === "connecting" && "text-warning",
                  orbState === "idle" && "text-text-dim",
                )}
              >
                {orbCaption}
              </p>

              <div className="flex gap-2.5">
                {!isConnected ? (
                  <Button
                    variant="primary"
                    onClick={connect}
                    loading={isConnecting}
                    disabled={!selectedTenant}
                    icon={!isConnecting ? <Phone size={15} /> : undefined}
                    className="rounded-full px-5"
                  >
                    {isConnecting ? "Connecting…" : "Start call"}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={toggleMute}
                      aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                      className={cn(
                        "w-10 rounded-full px-0",
                        isMuted && "border-warning/30 bg-warning/10 text-warning",
                      )}
                      icon={isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    />
                    <Button
                      variant="danger"
                      onClick={disconnect}
                      icon={<PhoneOff size={15} />}
                      className="rounded-full px-5"
                    >
                      End call
                    </Button>
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Transcript */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="flex h-[360px] flex-col sm:h-[440px] lg:h-[520px]">
            <CardHeader
              title="Live transcript"
              subtitle={
                transcript.length > 0
                  ? `${transcript.length} ${transcript.length === 1 ? "turn" : "turns"}`
                  : undefined
              }
            />
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-5 pb-5">
              {transcript.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg-hover text-text-dim">
                    <AudioLines size={18} />
                  </div>
                  <p className="mt-3 text-sm text-text-muted">
                    {isConnected ? "Listening — start speaking." : "Start a call to see the transcript."}
                  </p>
                  {isConnected && (
                    <p className="mt-1 text-xs text-text-dim">
                      Your words appear as you speak; the agent's replies follow.
                    </p>
                  )}
                </div>
              )}

              {transcript.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm transition-opacity",
                        isUser
                          ? "rounded-br-md bg-accent/15 text-text"
                          : "rounded-bl-md border border-border bg-bg-hover text-text",
                        // Interim text is still being revised — show it, but
                        // signal that it is not settled yet.
                        !msg.isFinal && "opacity-60",
                      )}
                    >
                      <p className="mb-0.5 text-[11px] font-semibold text-text-dim">
                        {isUser ? "You" : "Agent"}
                        {!msg.isFinal && " · hearing…"}
                      </p>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
          </Card>

          {/* Debug */}
          <Card>
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 px-5 py-3.5 text-sm font-medium text-text-muted transition-colors hover:text-text">
                <Bug size={14} />
                Debug events
                <span className="tabular rounded-full border border-border bg-bg-hover px-1.5 py-0.5 text-[11px] text-text-dim">
                  {debugEvents.length}
                </span>
              </summary>
              <div className="max-h-60 space-y-2 overflow-y-auto px-5 pb-5">
                {debugEvents.length === 0 ? (
                  <p className="py-2 text-xs text-text-dim">No debug events yet.</p>
                ) : (
                  debugEvents.map((evt, i) => (
                    <pre
                      key={i}
                      className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-3 text-[11px] leading-relaxed text-text-muted"
                    >
                      {evt}
                    </pre>
                  ))
                )}
              </div>
            </details>
          </Card>
        </div>
      </div>

      <TenancyPromptModal
        open={askTenancy}
        required
        title="One thing first"
        subtitle="The voice agent is wired differently depending on how your product is set up. Tell us which, and we'll continue."
        onChoose={async (t) => {
          await tenancy.choose(t);
          setAskTenancy(false);
          // Pull the updated tenancy_type back so connect() can proceed.
          await loadTenants();
        }}
      />
    </div>
  );
}
