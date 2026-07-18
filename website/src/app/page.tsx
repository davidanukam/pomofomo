import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card, DownloadButtons } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "A calm Pomodoro timer for Windows",
  description: SITE.description,
};

const features = [
  {
    eyebrow: "Always in sight",
    title: "Your timer, still in the tray",
    body: "Keep the countdown in the Windows system tray. Left-click opens a compact popover; right-click gives you quick controls without another window fighting for focus.",
    image: "/images/app-light.png",
    alt: "Pomo Fomo timer in light mode",
  },
  {
    eyebrow: "Clean rhythm",
    title: "Stay in the flow when the phase changes",
    body: "Move from focus into short and long breaks with a calm UI. Honest sessions still save elapsed time if you pause or end early — nothing forced, nothing lost.",
    image: "/images/app-dark.png",
    alt: "Pomo Fomo timer in dark mode",
    reverse: true,
  },
  {
    eyebrow: "Private insights",
    title: "See where the block went",
    body: "Hours this week, day streak, and daily charts live on your PC. Insights help you understand your focus rhythm without sending the day off your machine.",
    image: "/images/app-stats.png",
    alt: "Pomo Fomo focus analytics",
  },
  {
    eyebrow: "Appearance",
    title: "Light or dark, still calm",
    body: "Warm cream light mode and a soft peach accent in dark mode — the same quiet look as the desktop app, built for long sessions instead of loud productivity chrome.",
    image: "/images/app-dark.png",
    alt: "Pomo Fomo dark mode interface",
    reverse: true,
  },
];

const details = [
  {
    title: "Live tray countdown",
    body: "Tooltip shows phase and remaining time so you never lose the block.",
  },
  {
    title: "Savable presets",
    body: "Classic 25·5·15, Deep Work 50·10·25, Sprint 15·3·12, plus custom rhythms.",
  },
  {
    title: "Global shortcuts",
    body: "Ctrl+Alt+P start/pause, K skip, R reset, O show window.",
  },
  {
    title: "Tray-friendly",
    body: "Minimize to tray on close, open at login, and keep the window on top when you want.",
  },
  {
    title: "Local-only history",
    body: "Settings and session history stay in %LOCALAPPDATA%\\PomoFomo\\.",
  },
  {
    title: "Lightweight native shell",
    body: "Built with Tauri (Rust) for a small Windows installer and a clean focus view.",
  },
];

const faqs = [
  {
    q: "Does Pomo Fomo collect analytics?",
    a: "No. Focus history and settings stay on your PC. There is no account and no app tracking.",
  },
  {
    q: "Is there a Pro plan or subscription?",
    a: "No. Download the Windows installer from GitHub Releases — it is free, with no in-app purchase wall.",
  },
  {
    q: "Where is my data stored?",
    a: "Locally under %LOCALAPPDATA%\\PomoFomo\\ as settings.json and history.json.",
  },
  {
    q: "What platforms are supported?",
    a: "Windows. Pomo Fomo is built as a native tray-first desktop app for Windows.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="container hero-home">
        <div className="hero-copy">
          <p className="eyebrow">Pomodoro timer for Windows</p>
          <h1>A calmer Pomodoro timer for Windows.</h1>
          <p className="lede">
            Keep the countdown in your system tray, move into clean breaks, and
            understand your focus rhythm — without sending the day off your PC.
          </p>
          <DownloadButtons />
          <p className="hero-note">
            Free download · Local-only data · No account required
          </p>
        </div>
        <div className="shot-frame">
          <Image
            src="/images/app-light.png"
            alt="Pomo Fomo app screenshot"
            width={960}
            height={720}
            priority
          />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="eyebrow">Why it exists</p>
            <h2>Built for getting back to the work</h2>
            <p>
              {SITE.tagline} Always-visible countdown, a bright minimal focus
              view, and just the features that matter.
            </p>
          </div>
          <div className="point-list">
            <div>
              <h3>Stay in flow</h3>
              <p>
                Tray countdown and quiet controls keep the rhythm nearby without
                another tab or phone distraction.
              </p>
            </div>
            <div>
              <h3>Keep it yours</h3>
              <p>
                Presets, shortcuts, and history stay local. Nothing leaves your
                machine.
              </p>
            </div>
            <div>
              <h3>Start quickly</h3>
              <p>
                Pick Classic, Deep Work, or Sprint and start a clean block in
                seconds.
              </p>
            </div>
            <div>
              <h3>Go deeper only when wanted</h3>
              <p>
                Insights and charts are there when you want them — not as another
                productivity system to maintain.
              </p>
            </div>
          </div>
          <div className="grid-3">
            <Card>
              <h3>Tray countdown</h3>
              <p>
                Phase and remaining time in the system tray, with a compact
                popover for quick control.
              </p>
            </Card>
            <Card>
              <h3>Clean break rhythm</h3>
              <p>
                Short breaks and long breaks after a set number of focus
                sessions, without cluttered ceremony.
              </p>
            </Card>
            <Card>
              <h3>Private focus history</h3>
              <p>
                Daily charts and streaks that help you see the week — stored only
                on your PC.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`feature-row${feature.reverse ? " reverse" : ""}`}
            >
              <div className="shot-frame">
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  width={900}
                  height={680}
                />
              </div>
              <div className="feature-copy">
                <p className="eyebrow">{feature.eyebrow}</p>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <p className="eyebrow">Details</p>
            <h2>And the useful details</h2>
            <p>
              A small set of native Windows habits — not another bloated
              productivity suite.
            </p>
          </div>
          <div className="detail-grid">
            {details.map((item) => (
              <div key={item.title} className="detail-item">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <p className="eyebrow">FAQ</p>
            <h2>Pomodoro timer for Windows FAQ</h2>
          </div>
          <div className="faq-grid">
            {faqs.map((item) => (
              <div key={item.q} className="faq-item">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-banner">
            <h2>Ready to try {SITE.name}?</h2>
            <p>Start a clean block. Keep the countdown close. Stay local.</p>
            <div className="cta-row" style={{ justifyContent: "center" }}>
              <a
                href={SITE.downloadUrl}
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download for Windows
              </a>
              <Link href="/support" className="btn btn-secondary">
                Get support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
