import { Link } from "react-router-dom";
import {
  AudioLines,
  PhoneCall,
  Globe,
  ShoppingCart,
  IndianRupee,
  BarChart3,
  Code2,
  ArrowRight,
  Check,
  Clock,
  Headphones,
} from "lucide-react";
import Button from "@/components/shared/Button";

const LANGUAGES = ["English", "தமிழ் Tamil", "తెలుగు Telugu", "ಕನ್ನಡ Kannada", "മലയാളം Malayalam"];

const FEATURES = [
  {
    icon: PhoneCall,
    title: "Answers every call, 24/7",
    body: "No busy tone, no missed order, no hold music. The agent picks up the first ring, every hour of every day.",
  },
  {
    icon: Globe,
    title: "Speaks your customer's language",
    body: "English, Tamil, Telugu, Kannada and Malayalam — the caller is understood and answered in their own tongue.",
  },
  {
    icon: ShoppingCart,
    title: "Knows your menu",
    body: "Connects to your ordering system, answers questions about items, and places real orders — not a message to call back.",
  },
  {
    icon: IndianRupee,
    title: "Collects payment",
    body: "Confirms the order and takes a UPI payment in the same call, so the kitchen gets a paid ticket.",
  },
  {
    icon: BarChart3,
    title: "Every conversation, measured",
    body: "Live analytics for orders, revenue, conversion and your top items — with the full transcript of each call.",
  },
  {
    icon: Code2,
    title: "Add it anywhere",
    body: "A drop-in website widget or a phone number. One API key per tenant, multi-tenant from day one.",
  },
];

const STEPS = [
  {
    k: "01",
    title: "A customer calls",
    body: "They speak naturally, in their own language — no menus to press, no app to download.",
  },
  {
    k: "02",
    title: "The agent takes the order",
    body: "It understands your menu, answers questions, confirms each item and reads back the running total.",
  },
  {
    k: "03",
    title: "It lands in your system",
    body: "The order and payment are pushed to your backend and logged in your dashboard, ready for the kitchen.",
  },
];

const STATS = [
  { value: "5", label: "Indian languages" },
  { value: "24/7", label: "Always answering" },
  { value: "<1s", label: "To pick up" },
  { value: "100%", label: "Calls transcribed" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-accent/25 bg-accent/10">
              <AudioLines size={18} strokeWidth={2} className="text-accent-light" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">Voice Agent</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-text">Features</a>
            <a href="#how" className="transition-colors hover:text-text">How it works</a>
            <a href="#languages" className="transition-colors hover:text-text">Languages</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register" className="hidden sm:block">
              <Button variant="primary" size="sm" icon={<ArrowRight size={14} />}>
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-accent/[0.08] to-transparent" />
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60" />

        <div className="animate-fade-up relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-chip border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-light">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Voice ordering for restaurants
            </span>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Your restaurant's phone,
              <br />
              answered by AI.
            </h1>

            <p className="mt-5 max-w-md text-lg leading-relaxed text-text-muted">
              A voice agent that takes orders over the phone — in your customer's language, around
              the clock — and drops them straight into your system, paid.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register">
                <Button variant="primary" className="h-11 px-5" icon={<ArrowRight size={16} />}>
                  Get started
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" className="h-11 px-5" icon={<Headphones size={16} />}>
                  See the dashboard
                </Button>
              </Link>
            </div>

            <p className="mt-4 flex items-center gap-2 text-sm text-text-dim">
              <Check size={15} className="text-accent-light" />
              Works with your existing ordering backend
            </p>
          </div>

          {/* Signature artifact: a live call in progress */}
          <div className="relative">
            <div className="sheen rounded-card border border-border bg-bg-card p-5 shadow-pop">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Live call
                </span>
                <span className="flex items-center gap-2">
                  <span className="rounded-chip border border-accent/25 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-light">
                    தமிழ் Tamil
                  </span>
                  <span className="tabular flex items-center gap-1 text-xs text-text-dim">
                    <Clock size={12} /> 00:42
                  </span>
                </span>
              </div>

              <div className="space-y-3 py-4">
                <Bubble side="agent">Welcome to Spice Garden! What can I get started for you?</Bubble>
                <Bubble side="customer">Two butter naan and one paneer tikka masala.</Bubble>
                <Bubble side="agent">
                  Added — 2 butter naan and 1 paneer tikka masala. That's ₹340. Anything else?
                </Bubble>
              </div>

              {/* Order forming + agent speaking */}
              <div className="flex items-center justify-between rounded-ctl border border-border bg-bg-subtle px-3.5 py-3">
                <div>
                  <p className="text-xs text-text-dim">Order total</p>
                  <p className="tabular font-display text-lg font-semibold leading-none">₹340.00</p>
                </div>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  <span aria-hidden className="flex h-4 items-end gap-[2px]">
                    {["-0.6s", "-0.2s", "-0.45s", "-0.1s", "-0.5s"].map((d, i) => (
                      <span key={i} className="eq-bar h-full" style={{ animationDelay: d }} />
                    ))}
                  </span>
                  Agent speaking
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capability stats ────────────────────────────────────────── */}
      <section className="border-y border-border bg-bg-card/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 sm:px-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-4 py-8 text-center">
              <p className="tabular font-display text-3xl font-semibold tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm text-text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a good order-taker does. On every call.
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            Not a voicemail, not a callback — a working order-taker that understands your menu and
            your customers.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="sheen rounded-card border border-border bg-bg-card p-6 transition-colors hover:border-border-light"
            >
              <div className="grid h-10 w-10 place-items-center rounded-ctl border border-accent/25 bg-accent/10 text-accent-light">
                <Icon size={18} />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how" className="border-y border-border bg-bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">From ring to kitchen ticket</h2>
          <p className="mt-4 max-w-xl text-lg text-text-muted">
            Three steps, no app for the customer and no new hardware for you.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.k} className="relative">
                <span className="tabular font-display text-sm font-semibold text-accent-light">{s.k}</span>
                <div className="mt-2 h-px w-full bg-border" />
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Languages ───────────────────────────────────────────────── */}
      <section id="languages" className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <Globe size={28} className="mx-auto text-accent-light" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Your customers don't switch to English. Neither should you.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-text-muted">
          The agent listens and replies in the language the caller chose — natively, not translated.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {LANGUAGES.map((l) => (
            <span
              key={l}
              className="rounded-chip border border-border bg-bg-card px-4 py-2 text-sm font-medium"
            >
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA band ────────────────────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-lg bg-accent px-6 py-14 text-center text-on-accent sm:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-on-accent sm:text-4xl">
            Let your phone take orders.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-on-accent/80">
            Set up a voice agent for your restaurant and watch the first order come in.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/register">
              <button className="inline-flex h-11 items-center gap-2 rounded-ctl bg-bg px-6 text-sm font-semibold text-text transition-transform active:scale-[0.98]">
                Get started <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <AudioLines size={16} className="text-accent-light" />
            Voice Agent
          </div>
          <p className="text-xs text-text-dim">
            © {new Date().getFullYear()} Voice Agent · Voice ordering for restaurants
          </p>
        </div>
      </footer>
    </div>
  );
}

function Bubble({ side, children }: { side: "agent" | "customer"; children: React.ReactNode }) {
  const isAgent = side === "agent";
  return (
    <div className={isAgent ? "flex justify-start" : "flex justify-end"}>
      <div
        className={
          isAgent
            ? "max-w-[85%] rounded-card rounded-bl-md border border-border bg-bg-subtle px-3.5 py-2.5 text-sm"
            : "max-w-[85%] rounded-card rounded-br-md bg-accent/10 px-3.5 py-2.5 text-sm text-text"
        }
      >
        <p className="mb-0.5 text-[11px] font-semibold text-text-dim">{isAgent ? "Agent" : "Customer"}</p>
        {children}
      </div>
    </div>
  );
}
