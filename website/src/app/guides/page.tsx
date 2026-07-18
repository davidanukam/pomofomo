import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "How to use Pomo Fomo on Windows — tray workflow, presets, breaks, and private focus history.",
};

const points = [
  {
    title: "Stay in flow",
    body: "Start a focus block, keep the countdown in the tray, and return when the phase changes.",
  },
  {
    title: "Keep it yours",
    body: "Presets, shortcuts, and history stay on your PC. No account and no cloud sync required.",
  },
  {
    title: "Start quickly",
    body: "Classic, Deep Work, and Sprint cover most days. Custom rhythms are there when you need them.",
  },
  {
    title: "Go deeper only when wanted",
    body: "Open Stats for streaks and charts. Close it when you just want another clean block.",
  },
];

const featureCards = [
  {
    title: "Tray countdown",
    body: "See phase and remaining time from the system tray. Left-click for a compact popover; right-click for controls.",
  },
  {
    title: "Clean break rhythm",
    body: "Short breaks between focus sessions, then a longer break after a set number of sessions.",
  },
  {
    title: "Private focus history",
    body: "Today, streak, and last-seven-days charts stay in local files under %LOCALAPPDATA%\\PomoFomo\\.",
  },
];

const comparisons = [
  {
    title: "Phone timer",
    body: "Easy to grab, hard to ignore. Notifications and other apps pull you out of desk work.",
  },
  {
    title: "Browser timer",
    body: "Gets buried under tabs. Closing the tab can lose the rhythm you were building.",
  },
  {
    title: "Pomo Fomo",
    body: "Windows-native tray countdown, calm focus view, and local history that does not leave your PC.",
  },
];

const topics = [
  {
    title: "Tray timer for Windows",
    desc: "Always-visible countdown workflow",
    href: "/support",
  },
  {
    title: "Pomodoro presets",
    desc: "Classic, Deep Work, and Sprint",
    href: "/guides",
  },
  {
    title: "Focus history",
    desc: "Local charts without accounts",
    href: "/privacy",
  },
  {
    title: "Global shortcuts",
    desc: "Ctrl+Alt start, skip, reset, show",
    href: "/support",
  },
  {
    title: "Download for Windows",
    desc: "Installers on GitHub Releases",
    href: SITE.downloadUrl,
    external: true,
  },
  {
    title: "Privacy overview",
    desc: "No tracking, no account",
    href: "/privacy",
  },
];

const faqs = [
  {
    q: "How do I keep the timer visible?",
    a: "Use the system tray countdown and optional always-on-top window. Minimize to tray on close so the rhythm stays nearby.",
  },
  {
    q: "What happens if I pause or end early?",
    a: "Elapsed time is still saved locally. Sessions stay honest without forcing you to finish a block you abandoned.",
  },
  {
    q: "Can I change focus and break lengths?",
    a: "Yes. Use built-in presets or set custom focus, short break, and long break durations in Settings.",
  },
  {
    q: "Does Pomo Fomo replace a to-do app?",
    a: "No. It is a timer — not another productivity system. Pair it with whatever task tool you already use.",
  },
];

export default function GuidesPage() {
  return (
    <>
      <section className="container page-hero">
        <p className="eyebrow">Guides</p>
        <h1>A calm Pomodoro workflow for Windows.</h1>
        <p>
          Keep the countdown in your tray, move into clean breaks, and understand
          your focus rhythm without sending the day off your PC. Pomo Fomo is
          built for Windows desk work.
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <h2>Built for getting back to the work</h2>
            <p>
              {SITE.tagline} These guides cover the habits the app is designed
              around — not a new methodology to learn.
            </p>
          </div>
          <div className="point-list">
            {points.map((point) => (
              <div key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </div>
            ))}
          </div>
          <div className="grid-3">
            {featureCards.map((card) => (
              <Card key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <h2>Pomo Fomo vs phone timers and browser timers</h2>
            <p>
              Desk work needs a timer that stays nearby without becoming another
              distraction.
            </p>
          </div>
          <div className="grid-3">
            {comparisons.map((item) => (
              <Card key={item.title} className="comparison-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <h2>Looking for a Windows Pomodoro timer?</h2>
            <p>Related pages and topics for tray-first focus on Windows.</p>
          </div>
          <div className="topic-grid">
            {topics.map((topic) =>
              topic.external ? (
                <a
                  key={topic.title}
                  href={topic.href}
                  className="topic-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <strong>{topic.title}</strong>
                  <span>{topic.desc}</span>
                </a>
              ) : (
                <Link key={topic.title} href={topic.href} className="topic-link">
                  <strong>{topic.title}</strong>
                  <span>{topic.desc}</span>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
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
    </>
  );
}
