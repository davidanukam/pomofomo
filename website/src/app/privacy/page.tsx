import type { Metadata } from "next";
import Link from "next/link";
import { Card, ContactCard } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "No account. No app tracking. Pomo Fomo keeps settings and focus history on your Windows PC.",
};

const sections = [
  {
    title: "Data collection",
    body: `${SITE.name} does not require an account and does not send focus data to a server. Settings and lightweight focus history are stored locally on your Windows PC.`,
  },
  {
    title: "Local storage",
    body: "App data lives under %LOCALAPPDATA%\\PomoFomo\\ as settings.json and history.json. You can clear history from the app when you want a fresh start.",
  },
  {
    title: "Notifications",
    body: "Optional Windows notifications can signal the end of a focus or break phase. Notification content stays on your device through the normal Windows notification system.",
  },
  {
    title: "App analytics and tracking",
    body: `${SITE.name} does not include third-party analytics SDKs, advertising identifiers, or behavioral tracking inside the desktop app.`,
  },
  {
    title: "Website analytics",
    body: "This marketing website may be served by a host such as Vercel. Standard hosting logs (for example IP-based request logs) may be collected by the host according to their policies. The site does not embed a third-party marketing analytics suite by default.",
  },
  {
    title: "Accounts",
    body: "There are no user accounts, cloud profiles, or sign-in flows in the app.",
  },
  {
    title: "Data retention",
    body: "Local files remain on your machine until you clear history in the app or delete the data folder. Uninstalling the app may leave local data unless you remove it manually.",
  },
  {
    title: "Purchases",
    body: `${SITE.name} is offered as a free Windows download from GitHub Releases. There is no in-app purchase or subscription.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <section className="container-narrow page-hero">
        <p className="eyebrow">Privacy policy</p>
        <h1>No account. No app tracking.</h1>
        <p>
          Effective {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          . {SITE.name} is built to keep your focus rhythm on your PC. By using
          the app, you understand that settings and session history stay local.
          See also the{" "}
          <Link href="/terms" style={{ textDecoration: "underline" }}>
            Terms
          </Link>
          .
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-narrow stack">
          {sections.map((section) => (
            <Card key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </Card>
          ))}
          <ContactCard buttonLabel="Email" />
        </div>
      </section>
    </>
  );
}
