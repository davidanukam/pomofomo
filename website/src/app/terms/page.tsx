import type { Metadata } from "next";
import Link from "next/link";
import { Card, ContactCard } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `Simple terms for using ${SITE.name}, a Windows Pomodoro timer.`,
};

const sections = [
  {
    title: "Use of the app",
    body: `${SITE.name} is provided as a Windows focus timer. By using the app, you agree to use it lawfully and as intended — as a personal productivity timer, not as a service that stores or processes other people's data on our servers.`,
  },
  {
    title: "Local data",
    body: `${SITE.name} stores settings, lightweight focus history, and related preferences on your device. You are responsible for backing up or deleting that local data as needed.`,
  },
  {
    title: "Privacy",
    body: (
      <>
        {SITE.name}&apos;s{" "}
        <Link href="/privacy" style={{ textDecoration: "underline" }}>
          privacy policy
        </Link>{" "}
        explains the app&apos;s local data storage and the absence of app
        tracking and accounts.
      </>
    ),
  },
  {
    title: "Downloads",
    body: `${SITE.name} is offered as a free download via GitHub Releases. Installers are provided as-is for personal use on Windows.`,
  },
  {
    title: "No warranty",
    body: `${SITE.name} is provided as is, without warranties of any kind. We do not guarantee uninterrupted operation, fitness for a particular purpose, or that the timer will meet every workflow need.`,
  },
  {
    title: "Limitation of liability",
    body: "To the fullest extent permitted by law, the author is not liable for indirect, incidental, or consequential damages arising from use of the app or this website.",
  },
  {
    title: "Changes",
    body: "These terms may be updated when the app or website changes. Continued use after an update means you accept the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <>
      <section className="container-narrow page-hero">
        <p className="eyebrow">Terms</p>
        <h1>Simple use, simple terms.</h1>
        <p>
          These terms cover the use of {SITE.name}. By using the app, you agree
          to use it lawfully and as intended.
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
          <ContactCard
            title="Questions"
            buttonLabel="Email"
            body={
              <>
                For questions about these terms, email{" "}
                <a className="email" href={SITE.mailto}>
                  {SITE.email}
                </a>
                .
              </>
            }
          />
        </div>
      </section>
    </>
  );
}
