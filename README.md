# Pomo Fomo

A calm, intentional **Pomodoro timer for Windows** that is built with **Tauri (Rust)** for a lightweight native shell and a clean, minimal interface.

> *It's a timer, not another to-do app.* Always-visible countdown in the system tray, a bright minimal focus view, and just the features that matter.

---

## Features

- **Live tray countdown** - tooltip shows phase and remaining time; left-click opens a compact popover, right-click opens controls.
- **Focus view** - large centered timer, minimal controls, and session illustrations.
- **Savable presets** - Classic (25·5·15), Deep Work (50·10·25), Sprint (15·3·12), plus custom rhythms.
- **Honest sessions** - pause or end early and elapsed time is still saved locally.
- **Insights** - hours this week, day streak, and daily charts. Nothing leaves your PC.
- **Global shortcuts** - `Ctrl+Alt+P` start/pause, `Ctrl+Alt+K` skip, `Ctrl+Alt+R` reset, `Ctrl+Alt+O` show window.
- **Tray-friendly** - minimize to tray on close, open at login, always on top.

---

## Requirements

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)

---

## Run it

From the **project root** (not `src-tauri`):

```powershell
npm install
npm start          # or: npm run tauri dev
```

> **Don't use `cargo run` in `src-tauri`** for day-to-day development - it skips the Vite dev server and can conflict with a release build still running in the tray. If you see `HotKey already registered`, quit any other Pomo Fomo instance from the system tray first (right-click tray icon → Quit).

### Production build

```powershell
npm run tauri build
```

The installer and executable land in `src-tauri/target/release/bundle/`.

---

## Project layout

```
src/                  Vite + TypeScript frontend
src-tauri/src/
├─ engine.rs          Pomodoro state machine
├─ settings.rs        settings.json persistence
├─ history.rs         history.json + insights
├─ commands.rs        Tauri IPC commands
└─ lib.rs             Tray, shortcuts, tick loop
```

User data: `%LOCALAPPDATA%\PomoFomo\` (`settings.json`, `history.json`).

---

Made for Windows.
