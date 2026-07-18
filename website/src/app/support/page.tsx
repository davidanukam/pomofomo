import type { Metadata } from "next";
import { Card, ContactCard } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: `Help for quiet focus with ${SITE.name}. Contact support and common troubleshooting checks.`,
};

export default function SupportPage() {
  return (
    <>
      <section className="container-narrow page-hero">
        <p className="eyebrow">Support</p>
        <h1>Help for quiet focus.</h1>
        <p>
          {SITE.name} is a calm Windows Pomodoro timer built around a simple tray
          workflow. If something feels off, start with the checks below or email
          support.
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-narrow stack">
          <ContactCard
            title="Contact"
            buttonLabel="Email"
            body={
              <>
                Email{" "}
                <a className="email" href={SITE.mailto}>
                  {SITE.email}
                </a>{" "}
                with the Windows version you are on and what you expected to
                happen.
              </>
            }
          />

          <Card>
            <h2>Common checks</h2>
            <ul>
              <li>
                Quit any other Pomo Fomo instance from the tray (right-click →
                Quit) if shortcuts say they are already registered.
              </li>
              <li>
                Confirm the app is running from the official GitHub Releases
                installer, not an old leftover build.
              </li>
              <li>
                Check Settings for dark mode, open at login, minimize to tray,
                and always on top.
              </li>
              <li>
                Try the global shortcuts: Ctrl+Alt+P start/pause, K skip, R
                reset, O show window.
              </li>
            </ul>
          </Card>

          <Card>
            <h2>App basics</h2>
            <p>
              {SITE.name} keeps a live countdown in the Windows system tray, a
              minimal focus window for the current block, and local insights for
              today and recent days. Presets cover Classic (25·5·15), Deep Work
              (50·10·25), and Sprint (15·3·12). Pause or end early and elapsed
              time is still saved locally under %LOCALAPPDATA%\PomoFomo\.
            </p>
          </Card>

          <Card>
            <h2>What it does not include</h2>
            <ul>
              <li>Accounts, cloud sync, or team workspaces</li>
              <li>Built-in to-do lists or project management</li>
              <li>App analytics, advertising, or telemetry</li>
              <li>Subscriptions or a Pro paywall</li>
            </ul>
          </Card>
        </div>
      </section>
    </>
  );
}
