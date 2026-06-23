import { listen } from "@tauri-apps/api/event";
import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from "@tauri-apps/plugin-notification";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

import { api } from "./api";
import {
    dayLabelTwo,
    formatMinutes,
    lastSevenDays,
    phaseMessage,
    sessionsUntilLong,
    subtitleForPhase,
} from "./format";
import { icons } from "./icons";
import type {
    AppSettings,
    HourMinutes,
    InsightsData,
    AppSplitEntry,
    StatsRange,
    TimerPreset,
    TimerState,
    TodayStats,
    View,
} from "./types";

const params = new URLSearchParams(window.location.search);
const isTray = params.get("mode") === "tray";

let state: TimerState | null = null;
let settings: AppSettings | null = null;
let presets: TimerPreset[] = [];
let today: TodayStats = { sessions: 0, minutes: 0, streak: 0 };
let insights: InsightsData | null = null;
let appSplit: AppSplitEntry[] = [];
let hourly: HourMinutes[] = [];
let view: View = "timer";
let statsRange: StatsRange = "today";

const uiState = {
    presetDropdownOpen: false,
    addPresetOpen: false,
};

let lastRenderedView: View | null = null;

function captureAppShellScroll(): number {
    return document.querySelector(".app-shell")?.scrollTop ?? 0;
}

function restoreAppShellScroll(top: number) {
    requestAnimationFrame(() => {
        const shell = document.querySelector(".app-shell");
        if (shell) shell.scrollTop = top;
    });
}

const app = document.getElementById("app")!;

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    html?: string
) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
}

function applyTheme(dark: boolean) {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function statusDotClass(phase: string, isRunning: boolean): string {
    if (phase === "idle") return "ready";
    if (!isRunning) return "paused";
    if (phase === "work") return "focus";
    if (phase === "short_break" || phase === "long_break") return "break";
    return "ready";
}

function statusPillLabel(phase: string, isRunning: boolean, phaseLabel: string): string {
    if (phase === "idle") return "Ready";
    if (!isRunning) return "Paused";
    if (phase === "work") return "Focus";
    return phaseLabel;
}

function sessionsLeft(): number {
    if (!state) return 4;
    return sessionsUntilLong(
        state.completed_work_in_cycle,
        state.sessions_before_long_break
    );
}

function rangeDays(): number {
    return statsRange === "today" ? 1 : statsRange === "7d" ? 7 : 30;
}

async function loadAppSplit() {
    appSplit = await api.getAppSplit(rangeDays());
}

function appInitial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
}

function miniWeekBars(days: { day: string; minutes: number }[]) {
    const slice = days.slice(-7);
    const max = Math.max(1, ...slice.map((d) => d.minutes));
    const bars = slice
        .map((d) => {
            const h = Math.max(6, (d.minutes / max) * 36);
            return `<div class="bar" style="height:${h}px" title="${d.day}"></div>`;
        })
        .join("");
    const labels = slice.map((d) => `<span>${dayLabelTwo(d.day)}</span>`).join("");
    return `<div class="mini-chart">${bars}</div><div class="mini-chart-labels">${labels}</div>`;
}

async function refresh() {
    state = await api.getTimerState();
    today = await api.getTodayStats();
    render();
}

async function loadSettings() {
    settings = await api.getSettings();
    applyTheme(settings.dark_mode);
}

async function persistSettings() {
    if (!settings) return;
    settings = await api.saveSettings(settings);
}

let presetDropdownDismissHandler: ((e: MouseEvent) => void) | null = null;

function bindPresetDropdownDismiss() {
    if (presetDropdownDismissHandler) {
        document.removeEventListener("mousedown", presetDropdownDismissHandler);
        presetDropdownDismissHandler = null;
    }
    if (!uiState.presetDropdownOpen || view !== "timer") return;

    presetDropdownDismissHandler = (e: MouseEvent) => {
        const chip = document.querySelector(".preset-chip");
        if (chip?.contains(e.target as Node)) return;
        uiState.presetDropdownOpen = false;
        if (presetDropdownDismissHandler) {
            document.removeEventListener("mousedown", presetDropdownDismissHandler);
            presetDropdownDismissHandler = null;
        }
        render();
    };

    requestAnimationFrame(() => {
        if (presetDropdownDismissHandler) {
            document.addEventListener("mousedown", presetDropdownDismissHandler);
        }
    });
}

async function closeTrayPopup() {
    if (isTray) {
        await getCurrentWindow().hide();
    }
}

async function openMainApp() {
    await closeTrayPopup();
    const main = await WebviewWindow.getByLabel("main");
    if (main) {
        await main.show();
        await main.unminimize();
        await main.setFocus();
    }
}

function updateLiveElements() {
    if (!state) return;

    const brandSub = document.querySelector(".brand p");
    if (brandSub) brandSub.textContent = subtitleForPhase(state.phase);

    const statusDot = document.querySelector(".status-dot");
    if (statusDot) {
        statusDot.className = `status-dot ${statusDotClass(state.phase, state.is_running)}`;
    }

    const statusLabel = document.querySelector(".status-pill span:last-child");
    if (statusLabel) {
        statusLabel.textContent = statusPillLabel(state.phase, state.is_running, state.phase_label);
    }

    const phaseTag = document.querySelector(".phase-tag");
    if (phaseTag) phaseTag.textContent = state.phase_label;

    const timer = document.querySelector(".hero-timer, .tray-timer");
    if (timer) timer.textContent = state.time_text;

    const message = document.querySelector(".hero-message, .tray-caption");
    if (message) message.textContent = phaseMessage(state.phase, state.is_running);

    const primaryBtn = document.querySelector(
        ".hero-actions .btn-primary, .tray-actions .btn-primary"
    ) as HTMLButtonElement | null;
    if (primaryBtn && state.phase !== "idle") {
        primaryBtn.textContent = state.is_running ? "Pause" : "Resume";
    }

    const progressFill = document.querySelector(".timer-progress-fill") as HTMLElement | null;
    if (progressFill && state.phase !== "idle") {
        progressFill.style.width = `${Math.min(100, Math.max(0, state.progress * 100))}%`;
    }
}

function shouldSkipFullRender(): boolean {
    if (view === "stats" || view === "settings") return true;
    return view === "timer" && uiState.presetDropdownOpen;
}

function topAppEntry(): AppSplitEntry | null {
    return appSplit.length > 0 ? appSplit[0] : null;
}

function niceChartMax(value: number): number {
    const max = Math.max(1, value);
    if (max <= 60) return Math.ceil(max / 20) * 20 || 20;
    if (max <= 120) return 60;
    if (max <= 240) return 120;
    return Math.ceil(max / 60) * 60;
}

function yAxisTicks(maxValue: number): number[] {
    const niceMax = niceChartMax(maxValue);
    const step = niceMax / 3;
    return [niceMax, step * 2, step, 0];
}

function formatAxisMinutes(m: number): string {
    if (m >= 60 && m % 60 === 0) return `${m / 60}h`;
    return `${Math.round(m)}m`;
}

function focusChartShell(maxMinutes: number, plotHtml: string, xLabelsHtml = ""): string {
    const ticks = yAxisTicks(maxMinutes);
    const yLabels = ticks.map((t) => `<span>${formatAxisMinutes(t)}</span>`).join("");
    const gridLines = ticks.map(() => `<div class="grid-line"></div>`).join("");
    return `
    <div class="focus-chart">
      <div class="focus-chart-y">${yLabels}</div>
      <div class="focus-chart-main">
        <div class="focus-chart-plot">
          <div class="focus-chart-grid">${gridLines}</div>
          ${plotHtml}
        </div>
        ${xLabelsHtml}
      </div>
    </div>
  `;
}

function renderDailyBars(slice: { day: string; minutes: number }[]): [string, string] {
    const max = Math.max(1, ...slice.map((d) => d.minutes));
    const chartMax = niceChartMax(max);
    const plotHeight = 120;
    const bars = slice
        .map((d) => {
            const height = Math.max(6, (d.minutes / chartMax) * plotHeight);
            return `<div class="bar-wrap"><div class="bar" style="height:${height}px" title="${d.day} · ${formatMinutes(d.minutes)}"></div></div>`;
        })
        .join("");
    const labels = slice
        .map(
            (d) =>
                `<span class="focus-chart-x-col"><span class="focus-chart-date">${d.day.slice(5)}</span><span class="focus-chart-weekday">${dayLabelTwo(d.day)}</span></span>`
        )
        .join("");
    return [`<div class="range-chart">${bars}</div>`, `<div class="focus-chart-x focus-chart-x--dated">${labels}</div>`];
}

function lineDotTipAlign(x: number): string {
    if (x <= 8) return "line-dot-tip--align-start";
    if (x >= 92) return "line-dot-tip--align-end";
    return "";
}

function renderLineSeries(slice: { day: string; minutes: number }[]): [string, string] {
    const max = Math.max(1, ...slice.map((d) => d.minutes));
    const chartMax = niceChartMax(max);
    const coords = slice.map((d, i) => {
        const x = slice.length <= 1 ? 50 : (i / (slice.length - 1)) * 100;
        const y = 100 - (d.minutes / chartMax) * 100;
        return { x, y, day: d.day, minutes: d.minutes };
    });
    const linePoints = coords.map((p) => `${p.x},${p.y}`).join(" ");
    const dots = coords
        .map(
            (p) =>
                `<span class="line-dot" style="left:${p.x}%;top:${p.y}%"><span class="line-dot-tip ${lineDotTipAlign(p.x)}" role="tooltip"><strong>${formatMinutes(p.minutes)}</strong><span>${p.day.slice(5)} · ${dayLabelTwo(p.day)}</span></span></span>`
        )
        .join("");
    const plot = `
      <div class="line-chart-wrap">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="line-chart" aria-hidden="true">
          <polyline points="${linePoints}" />
        </svg>
        <div class="line-chart-dots">${dots}</div>
      </div>
    `;
    return [plot, ""];
}

function renderHourlyBars(): [string, string] {
    const max = Math.max(1, ...hourly.map((h) => h.minutes));
    const chartMax = niceChartMax(max);
    const plotHeight = 120;
    const sampled = hourly.filter((_, i) => i % 3 === 0);
    const bars = sampled
        .map((h) => {
            const height = Math.max(6, (h.minutes / chartMax) * plotHeight);
            return `<div class="bar-wrap"><div class="bar" style="height:${height}px"></div></div>`;
        })
        .join("");
    const labels = sampled
        .map((h) => {
            const label =
                h.hour === 0 ? "12a" : h.hour < 12 ? `${h.hour}a` : h.hour === 12 ? "12p" : `${h.hour - 12}p`;
            return `<span>${label}</span>`;
        })
        .join("");
    return [`<div class="hourly-chart">${bars}</div>`, `<div class="focus-chart-x hourly-chart-x">${labels}</div>`];
}

function showConfirmCard(options: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
    destructive?: boolean;
}) {
    const overlay = el("div", "confirm-overlay");
    const card = el("div", "confirm-card");
    card.innerHTML = `
    <h3>${options.title}</h3>
    <p>${options.message}</p>
  `;
    const actions = el("div", "confirm-actions");
    const cancel = el("button", "btn-secondary") as HTMLButtonElement;
    cancel.type = "button";
    cancel.textContent = "Cancel";
    const confirm = el("button", `btn-primary${options.destructive === false ? "" : " danger"}`) as HTMLButtonElement;
    confirm.type = "button";
    confirm.textContent = options.confirmLabel;

    const close = () => overlay.remove();

    cancel.addEventListener("click", close);
    confirm.addEventListener("click", async () => {
        await options.onConfirm();
        close();
    });
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    actions.append(cancel, confirm);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}

async function init() {
    document.body.classList.add(isTray ? "tray-mode" : "main-mode");
    if (isTray) document.documentElement.classList.add("tray-mode-root");
    await loadSettings();
    state = await api.getTimerState();
    today = await api.getTodayStats();
    insights = await api.getInsights();
    await loadAppSplit();
    hourly = await api.getHourlyToday();
    presets = await api.getPresets();

    await listen<TimerState>("timer-state", (e) => {
        state = e.payload;
        if (shouldSkipFullRender()) {
            updateLiveElements();
            return;
        }
        render();
    });

    await listen<AppSettings>("settings-changed", async (e) => {
        settings = e.payload;
        applyTheme(settings.dark_mode);
        if (shouldSkipFullRender()) return;
        render();
    });

    await listen("phase-completed", async (e) => {
        const { title, body } = e.payload as { title: string; body: string };
        let granted = await isPermissionGranted();
        if (!granted) {
            const perm = await requestPermission();
            granted = perm === "granted";
        }
        if (granted) {
            sendNotification({ title, body });
        }
        if (settings?.sound_enabled) playChime();
        today = await api.getTodayStats();
        hourly = await api.getHourlyToday();
        await loadAppSplit();
        insights = await api.getInsights();
        if (view === "timer") render();
    });

    render();
}

function playChime() {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch {
        /* audio unavailable */
    }
}

function navPill() {
    const nav = el("nav", "top-nav");
    const pill = el("div", "nav-pill");
    const tabs: { id: View; label: string; icon: string }[] = [
        { id: "timer", label: "Timer", icon: icons.timer },
        { id: "stats", label: "Stats", icon: icons.stats },
        { id: "settings", label: "Settings", icon: icons.settings },
    ];
    tabs.forEach((t) => {
        const btn = el("button", `nav-tab ${view === t.id ? "active" : ""}`) as HTMLButtonElement;
        btn.type = "button";
        btn.innerHTML = `${t.icon}<span>${t.label}</span>`;
        btn.addEventListener("click", async () => {
            view = t.id;
            uiState.presetDropdownOpen = false;
            uiState.addPresetOpen = false;
            if (view === "stats") {
                insights = await api.getInsights();
                hourly = await api.getHourlyToday();
                await loadAppSplit();
            }
            if (view === "settings") {
                settings = await api.getSettings();
                presets = await api.getPresets();
            }
            render();
        });
        pill.appendChild(btn);
    });
    nav.appendChild(pill);
    return nav;
}

function appHeader() {
    const header = el("div", "app-header");
    const brand = el("div", "brand");
    brand.innerHTML = `
    <h1>Pomo Fomo</h1>
    <p>${subtitleForPhase(state?.phase ?? "idle")}</p>
  `;
    const right = el("div", "header-right");
    const phase = state?.phase ?? "idle";
    const running = state?.is_running ?? false;
    const status = el("div", "status-pill");
    status.innerHTML = `
    <span class="status-dot ${statusDotClass(phase, running)}"></span>
    <span>${statusPillLabel(phase, running, state?.phase_label ?? "Ready")}</span>
  `;
    right.appendChild(status);
    header.append(brand, right);
    return header;
}

function renderTray() {
    if (!state) return;
    app.innerHTML = "";
    const shell = el("div", "tray-shell");
    const phase = state.phase;
    const isBreak = phase === "short_break" || phase === "long_break";

    const top = el("div", "tray-top");
    const topLeft = el("div", "tray-top-left");
    const status = el("div", "status-pill");
    status.innerHTML = `
    <span class="status-dot ${statusDotClass(phase, state.is_running)}"></span>
    <span>${statusPillLabel(phase, state.is_running, state.phase_label)}</span>
  `;
    topLeft.appendChild(status);

    const openBtn = el("button", "tray-open-btn") as HTMLButtonElement;
    openBtn.type = "button";
    openBtn.innerHTML = icons.openApp;
    openBtn.title = "Open Pomo Fomo";
    openBtn.addEventListener("click", () => openMainApp());

    const closeBtn = el("button", "tray-close-btn") as HTMLButtonElement;
    closeBtn.type = "button";
    closeBtn.innerHTML = icons.close;
    closeBtn.title = "Close";
    closeBtn.addEventListener("click", () => closeTrayPopup());

    const topActions = el("div", "tray-top-actions");
    topActions.append(openBtn, closeBtn);

    top.append(topLeft, topActions);

    const center = el("div", "tray-center");
    const caption = el("p", "tray-caption");
    caption.textContent = phaseMessage(phase, state.is_running);
    const timer = el("div", "tray-timer");
    timer.textContent = state.time_text;
    center.append(caption, timer);

    const actions = el("div", "tray-actions");
    if (phase === "idle") {
        const start = el("button", "btn-primary") as HTMLButtonElement;
        start.textContent = "Start Focus";
        start.addEventListener("click", () => api.startOrPause());
        actions.appendChild(start);
    } else {
        const primary = el("button", "btn-primary") as HTMLButtonElement;
        primary.textContent = state.is_running ? "Pause" : "Resume";
        primary.addEventListener("click", () => api.startOrPause());
        const secondary = el("button", "btn-secondary") as HTMLButtonElement;
        secondary.textContent = isBreak ? "Skip Break" : "Skip";
        secondary.addEventListener("click", () => api.skip());
        actions.append(primary, secondary);
    }

    const stats = el("div", "tray-stats");
    stats.innerHTML = `
    <div class="tray-stat">
      <div class="label">Today</div>
      <div class="value">${formatMinutes(today.minutes)}</div>
      <div class="sub">${today.sessions} sessions</div>
    </div>
    <div class="tray-stat">
      <div class="label">Streak</div>
      <div class="value">${today.streak}</div>
      <div class="sub">days</div>
    </div>
    <div class="tray-stat">
      <div class="label">Long</div>
      <div class="value">${sessionsLeft()}</div>
      <div class="sub">sessions left</div>
    </div>
  `;

    shell.append(top, center, actions, stats);
    app.appendChild(shell);
}

function renderTimerPage() {
    const phase = state!.phase;
    const active = phase !== "idle";
    const isBreak = phase === "short_break" || phase === "long_break";
    const progressPct = Math.min(100, Math.max(0, state!.progress * 100));

    const hero = el("div", `hero-card ${active ? "active" : ""}`);

    const chip = el("div", `preset-chip ${uiState.presetDropdownOpen ? "open" : ""}`);
    const presetBtn = el("button", "preset-dropdown-btn") as HTMLButtonElement;
    presetBtn.type = "button";
    presetBtn.textContent = state!.preset_name;
    presetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        uiState.presetDropdownOpen = !uiState.presetDropdownOpen;
        render();
    });
    chip.appendChild(presetBtn);

    if (uiState.presetDropdownOpen) {
        const menu = el("div", "preset-dropdown-menu");
        presets.forEach((p) => {
            const item = el("button", `preset-dropdown-item ${p.name === state!.preset_name ? "active" : ""}`) as HTMLButtonElement;
            item.type = "button";
            item.textContent = p.name;
            item.addEventListener("click", async () => {
                uiState.presetDropdownOpen = false;
                await api.selectPreset(p.name);
                await refresh();
            });
            menu.appendChild(item);
        });
        chip.appendChild(menu);
    }

    const left = el("div", "hero-left");

    const tag = el("div", "phase-tag");
    tag.textContent = state!.phase_label;
    const timer = el("div", "hero-timer");
    timer.textContent = state!.time_text;

    if (active) {
        const progress = el("div", "timer-progress");
        const fill = el("div", "timer-progress-fill");
        fill.style.width = `${progressPct}%`;
        progress.appendChild(fill);
        left.append(tag, timer, progress);
    } else {
        left.append(tag, timer);
    }

    const message = el("p", "hero-message");
    message.textContent = phaseMessage(phase, state!.is_running);
    left.appendChild(message);

    const actions = el("div", "hero-actions");
    if (!active) {
        const start = el("button", "btn-primary btn-primary--wide") as HTMLButtonElement;
        start.textContent = "Start Focus";
        start.addEventListener("click", () => api.startOrPause());
        const takeBreak = el("button", "btn-secondary btn-secondary--wide") as HTMLButtonElement;
        takeBreak.textContent = "Take Break";
        takeBreak.addEventListener("click", () => api.startBreak());
        actions.append(start, takeBreak);
    } else {
        const primary = el("button", "btn-primary") as HTMLButtonElement;
        primary.textContent = state!.is_running ? "Pause" : "Resume";
        primary.addEventListener("click", () => api.startOrPause());
        const secondary = el("button", "btn-secondary") as HTMLButtonElement;
        secondary.textContent = isBreak ? "Skip Break" : "Skip";
        secondary.addEventListener("click", () => api.skip());
        const end = el("button", "btn-secondary btn-secondary--wide") as HTMLButtonElement;
        end.textContent = "End session";
        end.addEventListener("click", () => {
            showConfirmCard({
                title: "End session?",
                message:
                    "This stops the current block and returns you to Ready. Time in this session won't count as completed.",
                confirmLabel: "End session",
                onConfirm: async () => {
                    await api.endSession();
                },
            });
        });
        const reset = el("button", "btn-secondary btn-secondary--wide") as HTMLButtonElement;
        reset.textContent = "Reset";
        reset.addEventListener("click", () => {
            showConfirmCard({
                title: "Reset timer?",
                message: "This restarts the current phase from the beginning. Your session stays active.",
                confirmLabel: "Reset",
                destructive: false,
                onConfirm: async () => {
                    await api.reset();
                },
            });
        });
        actions.append(primary, secondary, end, reset);
    }
    left.appendChild(actions);

    hero.append(chip, left);

    const weekDays = lastSevenDays(insights?.last_days ?? []);
    const statRow = el("div", "stat-row");
    statRow.innerHTML = `
    <div class="stat-card">
      <div class="label">Today</div>
      <div class="value">${formatMinutes(today.minutes)}</div>
      <div class="sub">${today.sessions} sessions</div>
    </div>
    <div class="stat-card">
      <div class="label">Streak</div>
      <div class="value">${today.streak}</div>
      <div class="sub">days</div>
    </div>
    <div class="stat-card">
      <div class="label">Long break</div>
      <div class="value">${sessionsLeft()}</div>
      <div class="sub">sessions left</div>
    </div>
    <div class="stat-card">
      <div class="label">Last 7 days</div>
      ${miniWeekBars(weekDays)}
    </div>
  `;

    const wrap = el("div", "timer-page");
    wrap.append(hero, statRow);
    return wrap;
}

function rangeMinutes(): number {
    if (!insights) return today.minutes;
    const slice = insights.last_days.slice(-rangeDays());
    return slice.reduce((s, d) => s + d.minutes, 0);
}

function rangeSessions(): number {
    if (!insights) return today.sessions;
    const slice = insights.last_days.slice(-rangeDays());
    return slice.filter((d) => d.minutes > 0).length;
}

function clearHistoryWithConfirm() {
    showConfirmCard({
        title: "Clear history?",
        message: "This removes all saved focus sessions from this device. This cannot be undone.",
        confirmLabel: "Clear history",
        onConfirm: async () => {
            await api.clearHistory();
            insights = await api.getInsights();
            hourly = await api.getHourlyToday();
            today = await api.getTodayStats();
            await loadAppSplit();
            render();
        },
    });
}

function renderStatsPage() {
    const wrap = el("div", "stats-page");
    const header = el("div", "stats-header");
    header.innerHTML = `
    <div>
      <h2>Focus Analytics</h2>
      <p>Local patterns, session rhythm, and app split.</p>
    </div>
  `;
    const range = el("div", "range-pill");
    (["today", "7d", "30d"] as StatsRange[]).forEach((r) => {
        const label = r === "today" ? "Today" : r === "7d" ? "7 Days" : "30 Days";
        const btn = el("button", `range-btn ${statsRange === r ? "active" : ""}`) as HTMLButtonElement;
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", async () => {
            statsRange = r;
            await loadAppSplit();
            render();
        });
        range.appendChild(btn);
    });
    header.appendChild(range);

    const topApp = topAppEntry();
    const cards = el("div", "stats-grid");
    cards.innerHTML = `
    <div class="stat-card">
      <div class="label">Focus time</div>
      <div class="value">${formatMinutes(rangeMinutes())}</div>
      <div class="sub">${statsRange === "today" ? "today" : `last ${statsRange === "7d" ? "7" : "30"} days`}</div>
    </div>
    <div class="stat-card">
      <div class="label">Sessions</div>
      <div class="value">${statsRange === "today" ? today.sessions : rangeSessions()}</div>
      <div class="sub">focus blocks</div>
    </div>
    <div class="stat-card">
      <div class="label">Streak</div>
      <div class="value">${insights?.streak ?? 0}</div>
      <div class="sub">days</div>
    </div>
    <div class="stat-card">
      <div class="label">Top app</div>
      <div class="value value--text">${topApp?.app_name ?? "—"}</div>
      <div class="sub">${topApp ? formatMinutes(topApp.minutes) : "no tracked apps"}</div>
    </div>
  `;

    const panels = el("div", "analytics-panels");

    const chartPanel = el("div", "panel-card");
    if (statsRange === "today") {
        const max = Math.max(1, ...hourly.map((h) => h.minutes));
        chartPanel.innerHTML = `
      <h3>Focused Time <span class="panel-total">${formatMinutes(today.minutes)} today</span></h3>
      <p class="panel-sub">Minutes by time of day</p>
      ${focusChartShell(max, ...renderHourlyBars())}
    `;
    } else if (statsRange === "7d") {
        const slice = insights!.last_days.slice(-7);
        const max = Math.max(1, ...slice.map((d) => d.minutes));
        chartPanel.innerHTML = `
      <h3>Focused Time <span class="panel-total">${formatMinutes(rangeMinutes())}</span></h3>
      <p class="panel-sub">Daily focus minutes</p>
      ${focusChartShell(max, ...renderDailyBars(slice))}
    `;
    } else {
        const slice = insights!.last_days.slice(-30);
        const max = Math.max(1, ...slice.map((d) => d.minutes));
        chartPanel.innerHTML = `
      <h3>Focused Time <span class="panel-total">${formatMinutes(rangeMinutes())}</span></h3>
      <p class="panel-sub">Daily focus trend</p>
      ${focusChartShell(max, ...renderLineSeries(slice))}
    `;
    }

    const listPanel = el("div", "panel-card panel-card--apps");
    listPanel.innerHTML = `<h3>App Split <span class="panel-total">tracked apps</span></h3>`;
    const list = el("div", "app-split-list");
    if (appSplit.length === 0) {
        list.innerHTML = `<p class="panel-sub session-empty">Start a focus session with session history enabled to track which apps you use.</p>`;
    } else {
        appSplit.forEach((entry) => {
            const row = el("div", "app-split-item");
            const icon = el("div", `app-split-icon${entry.icon ? " has-image" : ""}`);
            if (entry.icon) {
                const img = document.createElement("img");
                img.src = entry.icon;
                img.alt = "";
                icon.appendChild(img);
            } else {
                icon.textContent = appInitial(entry.app_name);
            }
            const body = el("div", "app-split-body");
            body.innerHTML = `
          <div class="app-split-name">${entry.app_name}</div>
          <div class="app-split-bar"><span style="width:${Math.max(4, entry.percent)}%"></span></div>
        `;
            const meta = el("div", "app-split-meta");
            meta.innerHTML = `
          <div class="dur">${formatMinutes(entry.minutes)}</div>
          <div class="pct">${Math.round(entry.percent)}%</div>
        `;
            row.append(icon, body, meta);
            list.appendChild(row);
        });
    }
    listPanel.appendChild(list);

    panels.append(chartPanel, listPanel);

    const footer = el("div", "stats-footer");
    const clear = el("button", "btn-danger") as HTMLButtonElement;
    clear.textContent = "Clear history";
    clear.addEventListener("click", clearHistoryWithConfirm);
    footer.appendChild(clear);

    wrap.append(header, cards, panels, footer);
    return wrap;
}

function toggle(label: string, value: boolean, onChange: (v: boolean) => void | Promise<void>) {
    const row = el("div", "setting-row");
    const lbl = el("span");
    lbl.textContent = label;
    const input = el("input") as HTMLInputElement;
    input.type = "checkbox";
    input.checked = value;
    input.addEventListener("change", () => {
        void onChange(input.checked);
    });
    row.append(lbl, input);
    return row;
}

function numberInput(label: string, value: number) {
    const wrap = el("label", "field");
    const span = el("span");
    span.textContent = label;
    const input = el("input") as HTMLInputElement;
    input.type = "number";
    input.min = "1";
    input.value = String(value);
    wrap.append(span, input);
    return { wrap, input };
}

function renderSettingsPage() {
    const wrap = el("div", "settings-page");
    wrap.innerHTML = `<h2 class="settings-title">Settings</h2><p class="settings-sub">Timers, behaviour, and appearance.</p>`;
    if (!settings) return wrap;

    const appearance = el("section", "settings-section");
    appearance.innerHTML = `<h3>Appearance</h3>`;
    appearance.appendChild(
        toggle("Dark mode", settings.dark_mode, async (v) => {
            settings!.dark_mode = v;
            applyTheme(v);
            await persistSettings();
        })
    );

    const shortcuts = el("section", "settings-section");
    shortcuts.innerHTML = `
    <div class="shortcuts-hero">
      <div class="shortcut-keys"><span>Ctrl</span><span>Alt</span><span>⌨</span></div>
      <h3>Global Shortcuts</h3>
      <p>Start focus, take a break, or open Pomo Fomo from anywhere on your PC.</p>
    </div>
    <div class="shortcut-list">
      <div class="shortcut-row"><span>Start / Pause</span><kbd>Ctrl + Alt + P</kbd></div>
      <div class="shortcut-row"><span>Skip</span><kbd>Ctrl + Alt + K</kbd></div>
      <div class="shortcut-row"><span>Reset</span><kbd>Ctrl + Alt + R</kbd></div>
      <div class="shortcut-row"><span>Show window</span><kbd>Ctrl + Alt + O</kbd></div>
    </div>
  `;

    const timers = el("section", "settings-section");
    timers.innerHTML = `<h3>Timers</h3>`;
    const presetList = el("div", "preset-list");
    presets.forEach((p) => {
        const item = el("button", `preset-item ${p.name === settings!.selected_preset_name ? "active" : ""}`) as HTMLButtonElement;
        item.type = "button";
        item.innerHTML = `<strong>${p.name}</strong><span>${p.work_minutes} · ${p.short_break_minutes} · ${p.long_break_minutes}</span>`;
        item.addEventListener("click", async () => {
            settings!.selected_preset_name = p.name;
            await api.saveSettings(settings!);
            await api.selectPreset(p.name);
            settings = await api.getSettings();
            render();
        });
        presetList.appendChild(item);
    });
    timers.appendChild(presetList);

    const addForm = el("div", "add-preset");
    const addToggle = el("button", "add-preset-toggle") as HTMLButtonElement;
    addToggle.type = "button";
    addToggle.textContent = "Add a preset";
    addToggle.setAttribute("aria-expanded", String(uiState.addPresetOpen));
    addToggle.addEventListener("click", () => {
        uiState.addPresetOpen = !uiState.addPresetOpen;
        render();
    });
    addForm.appendChild(addToggle);

    const form = el("div", `add-preset-form ${uiState.addPresetOpen ? "open" : ""}`);
    const nameInput = el("input") as HTMLInputElement;
    nameInput.placeholder = "Name";
    const workInput = numberInput("Focus (min)", 25);
    const shortInput = numberInput("Short break", 5);
    const longInput = numberInput("Long break", 15);
    const sessionsInput = numberInput("Sessions before long", 4);
    const saveBtn = el("button", "text-btn") as HTMLButtonElement;
    saveBtn.textContent = "Save preset";
    saveBtn.addEventListener("click", async () => {
        if (!nameInput.value.trim()) return;
        presets = await api.addPreset({
            name: nameInput.value.trim(),
            work_minutes: parseInt(workInput.input.value, 10) || 25,
            short_break_minutes: parseInt(shortInput.input.value, 10) || 5,
            long_break_minutes: parseInt(longInput.input.value, 10) || 15,
            sessions_before_long_break: parseInt(sessionsInput.input.value, 10) || 4,
        });
        settings = await api.getSettings();
        uiState.addPresetOpen = false;
        render();
    });
    form.append(nameInput, workInput.wrap, shortInput.wrap, longInput.wrap, sessionsInput.wrap, saveBtn);
    addForm.appendChild(form);
    timers.appendChild(addForm);

    const behaviour = el("section", "settings-section");
    behaviour.innerHTML = `<h3>Behaviour</h3>`;
    behaviour.append(
        toggle("Auto-start breaks", settings.auto_start_breaks, async (v) => {
            settings!.auto_start_breaks = v;
            await persistSettings();
        }),
        toggle("Auto-start next focus", settings.auto_start_next_work, async (v) => {
            settings!.auto_start_next_work = v;
            await persistSettings();
        }),
        toggle("Minimize to tray on close", settings.minimize_to_tray_on_close, async (v) => {
            settings!.minimize_to_tray_on_close = v;
            await persistSettings();
        }),
        toggle("Open at login", settings.open_at_login, async (v) => {
            settings!.open_at_login = v;
            await persistSettings();
        }),
        toggle("Always on top", settings.always_on_top, async (v) => {
            settings!.always_on_top = v;
            await persistSettings();
        })
    );

    const feedback = el("section", "settings-section");
    feedback.innerHTML = `<h3>Feedback</h3>`;
    feedback.append(
        toggle("Smart nudges (notifications)", settings.notifications_enabled, async (v) => {
            settings!.notifications_enabled = v;
            await persistSettings();
        }),
        toggle("Sound on phase change", settings.sound_enabled, async (v) => {
            settings!.sound_enabled = v;
            await persistSettings();
        }),
        toggle("Save session history", settings.analytics_enabled, async (v) => {
            settings!.analytics_enabled = v;
            await persistSettings();
        })
    );

    const footer = el("div", "settings-footer");
    const save = el("button", "btn-primary") as HTMLButtonElement;
    save.textContent = "Save settings";
    save.addEventListener("click", async () => {
        await persistSettings();
        view = "timer";
        render();
    });

    footer.appendChild(save);
    wrap.append(appearance, shortcuts, timers, behaviour, feedback, footer);
    return wrap;
}

async function render() {
    if (!state) return;
    const previousView = lastRenderedView;
    const scrollTop = captureAppShellScroll();
    app.innerHTML = "";

    if (isTray) {
        applyTheme(settings?.dark_mode ?? false);
        renderTray();
        return;
    }

    const shell = el("div", "app-shell");
    shell.appendChild(navPill());
    if (view === "timer") {
        shell.appendChild(appHeader());
    }

    if (view === "stats") {
        if (!insights) insights = await api.getInsights();
        await loadAppSplit();
        shell.appendChild(renderStatsPage());
    } else if (view === "settings") {
        if (!settings) settings = await api.getSettings();
        if (!presets.length) presets = await api.getPresets();
        shell.appendChild(renderSettingsPage());
    } else {
        if (!insights) insights = await api.getInsights();
        shell.appendChild(renderTimerPage());
    }

    app.appendChild(shell);
    bindPresetDropdownDismiss();
    lastRenderedView = view;

    if (previousView === view) {
        restoreAppShellScroll(scrollTop);
    }
}

init().catch(console.error);
