"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import LoginScreen from "./login-form";

type Channel = {
  id: number;
  title: string;
  chatId: string;
  username: string | null;
  type: string;
  active: boolean;
  createdAt: string;
};

type Campaign = {
  id: number;
  title: string;
  body: string;
  status: string;
  targetIds: number[];
  startTime: string;
  endTime: string;
  postsPerDay: number;
  timezone: string;
  nextRunAt: string | null;
  sentCount: number;
  createdAt: string;
};

type Delivery = {
  id: number;
  campaignId: number;
  channelId: number | null;
  channelTitle: string;
  status: string;
  telegramMessageId: string | null;
  error: string | null;
  sentAt: string;
};

type DashboardData = {
  channels: Channel[];
  campaigns: Campaign[];
  deliveries: Delivery[];
  telegram: {
    tokenConfigured: boolean;
    webhookUrl: string;
    webhookConfigured: boolean;
    botUsername: string;
  };
  appUrl: string;
  accessProtected: boolean;
};

type View = "overview" | "campaigns" | "channels" | "history" | "settings";
type Toast = { message: string; tone: "success" | "error" } | null;

const SAMPLE_AD = `🕋 Telefoningizda minglab suratlar bor… Ammo Ka’ba oldida tushgan suratingiz-chi?

✨ Balki aynan shu noyabr hayotingizdagi eng unutilmas oylardan biriga aylanar!

Safa Marva bilan Umra ziyoratiga yo‘l oling! 🤍

📅 Safar sanalari: 10, 14, 17 va 24-noyabr

🏨 Mehmonxona: Elaf

🤲 Muqaddas zamin sari ilk qadamingizni biz bilan qo‘ying!

⚡️ Joylar soni oz qolmoqda!

Hoziroq izohlarda «+» qoldiring yoki biz bilan bog‘laning!

📞 +998 (91) 182-02-00
📞 +998 (33) 508-00-01

#SafaMarva #Umra2026 #UmraZiyorati #UmraNoyabr #Makkah #Madinah #UmraSafari`;

const iconPaths: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  send: <><path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z" /><path d="M10.1 13.9 21 3" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  pause: <><path d="M8 5h3v14H8zM15 5h3v14h-3z" /></>,
  play: <path d="m8 5 12 7-12 7V5Z" />,
  trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" /></>,
  sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
  message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
};

function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name] ?? iconPaths.grid}
    </svg>
  );
}

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: "overview", label: "Umumiy ko‘rinish", icon: "grid" },
  { id: "campaigns", label: "E’lonlar", icon: "send" },
  { id: "channels", label: "Kanallar", icon: "users" },
  { id: "history", label: "Jo‘natmalar tarixi", icon: "history" },
  { id: "settings", label: "Sozlamalar", icon: "settings" },
];

const headings: Record<View, { title: string; subtitle: string }> = {
  overview: { title: "Xush kelibsiz 👋", subtitle: "E’lonlaringiz va bugungi rejangiz bir joyda." },
  campaigns: { title: "E’lonlar", subtitle: "Matnlarni yarating, jadvalga qo‘ying yoki vaqtincha to‘xtating." },
  channels: { title: "Kanallar va guruhlar", subtitle: "E’lon yuboriladigan Telegram manzillarini boshqaring." },
  history: { title: "Jo‘natmalar tarixi", subtitle: "Har bir kanalga yuborilgan e’lonlar holati." },
  settings: { title: "Ulanish va sozlamalar", subtitle: "Telegram bot va GitHub avtomatik ishga tushirishini sozlang." },
};

function apiErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") return payload.error;
  return "So‘rov bajarilmadi. Qaytadan urinib ko‘ring.";
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) throw new Error(apiErrorMessage(payload));
  return payload as T;
}

function formatDate(value: string | Date | null | undefined, withTime = true) {
  if (!value) return "Hozircha belgilanmagan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Tashkent",
  }).format(date);
}

function dayKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shortText(text: string, length = 170) {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === "active" || status === "sent";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive ? "bg-[#e7f3ed] text-[#277756]" : status === "failed" ? "bg-rose-50 text-rose-600" : "bg-[#f0f1f1] text-[#697470]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#45a477]" : status === "failed" ? "bg-rose-500" : "bg-[#97a19d]"}`} />
      {status === "active" ? "Faol" : status === "paused" ? "To‘xtatilgan" : status === "sent" ? "Yuborildi" : status === "failed" ? "Xatolik" : status}
    </span>
  );
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-[15px] font-bold tracking-[-0.02em] text-[#1b2824]">{title}</h2>{action}</div>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dfe6e2] bg-[#fbfcfb] px-5 py-9 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#edf4f0] text-[#4d8071]"><Icon name="sparkle" size={20} /></div>
      <h3 className="mt-3 text-sm font-semibold text-[#28332f]">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#7d8783]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", disabled, type = "button", className = "" }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger" | "white";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants = {
    primary: "bg-[#155b50] text-white shadow-sm hover:bg-[#0f4b42]",
    secondary: "border border-[#dfe6e2] bg-white text-[#25332e] hover:bg-[#f7f9f8]",
    quiet: "text-[#64716c] hover:bg-[#f2f5f3] hover:text-[#23312c]",
    danger: "border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100",
    white: "bg-white text-[#174d44] shadow-sm hover:bg-[#f4f6f5]",
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}>{children}</button>;
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState<"campaign" | "channel" | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);

  const refresh = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const result = await requestJson<DashboardData>("/api/dashboard", { cache: "no-store" });
      setData(result);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Ma’lumotlarni yuklab bo‘lmadi.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const status = await requestJson<{ required: boolean; authenticated: boolean }>("/api/auth/status", { cache: "no-store" });
        if (cancelled) return;
        setAuthRequired(status.required);
        setAuthenticated(status.authenticated);
        if (status.authenticated) await refresh(true);
        else setLoading(false);
      } catch {
        if (!cancelled) await refresh(true);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [refresh]);

  useEffect(() => {
    if (authChecking || !authenticated) return;
    const timer = window.setInterval(() => void refresh(false), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh, authChecking, authenticated]);

  const activeChannels = useMemo(() => data?.channels.filter((channel) => channel.active) ?? [], [data?.channels]);
  const activeCampaigns = useMemo(() => data?.campaigns.filter((campaign) => campaign.status === "active") ?? [], [data?.campaigns]);
  const todayDeliveries = useMemo(() => {
    const today = dayKey(new Date());
    return (data?.deliveries ?? []).filter((delivery) => delivery.status === "sent" && dayKey(delivery.sentAt) === today).length;
  }, [data?.deliveries]);
  const nextCampaign = useMemo(() => {
    return activeCampaigns
      .filter((campaign) => campaign.nextRunAt)
      .sort((a, b) => new Date(a.nextRunAt as string).getTime() - new Date(b.nextRunAt as string).getTime())[0];
  }, [activeCampaigns]);
  const dateLabel = new Intl.DateTimeFormat("uz-UZ", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tashkent" }).format(new Date());

  const notify = (message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4200);
  };

  const runAction = async (key: string, url: string, method: string, body?: unknown, successMessage?: string) => {
    setBusy(key);
    try {
      await requestJson(url, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      await refresh(false);
      if (successMessage) notify(successMessage);
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Amal bajarilmadi.", "error");
      return false;
    } finally {
      setBusy("");
    }
  };

  const connectWebhook = async () => {
    setBusy("webhook");
    try {
      const result = await requestJson<{ webhookUrl: string }>("/api/telegram/setup", { method: "POST" });
      await refresh(false);
      notify(`Webhook ulandi: ${result.webhookUrl}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Webhook ulanmagan.", "error");
    } finally {
      setBusy("");
    }
  };

  const heading = headings[view];
  const activeNav = (item: View) => setView(item);
  const completeLogin = async (password: string) => {
    await requestJson("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) });
    setAuthenticated(true);
    await refresh(true);
    notify("Panelga muvaffaqiyatli kirdingiz.");
  };
  const logout = async () => {
    await requestJson("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    notify("Paneldan chiqdingiz.");
  };

  if (authChecking) return <div className="grid min-h-screen place-items-center bg-[#f5f6f8] p-6"><div className="w-full max-w-sm rounded-3xl border border-[#e8ece9] bg-white p-8 text-center shadow-sm"><Brand /><div className="mt-8 h-2 overflow-hidden rounded-full bg-[#edf2ef]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#4f9378]" /></div><p className="mt-3 text-xs text-[#87928d]">Xavfsiz ulanish tekshirilmoqda…</p></div></div>;
  if (authRequired && !authenticated) return <LoginScreen onLogin={completeLogin} />;

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#17221f]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-[#e9ece9] bg-white px-5 py-6 md:flex">
        <Brand />
        <div className="mt-9 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a0aaa6]">Boshqaruv</div>
        <nav className="mt-3 space-y-1">
          {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => activeNav(item.id)} />)}
        </nav>
        <div className="mt-auto">
          <div className="mb-4 rounded-2xl border border-[#e9efeb] bg-[#f7faf8] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#31564b]"><span className={`h-2 w-2 rounded-full ${data?.telegram.tokenConfigured ? "bg-[#54ae7d]" : "bg-[#e5a94e]"}`} />Telegram holati</div>
            <p className="mt-2 text-[11px] leading-5 text-[#7b8782]">{data?.telegram.webhookConfigured ? "Bot ulangan va ishlayapti." : data?.telegram.tokenConfigured ? "Bot tokeni bor, webhookni ulang." : "Bot tokenini sozlash kutilmoqda."}</p>
            <button onClick={() => setView("settings")} className="mt-2 text-xs font-semibold text-[#196354] hover:underline">Sozlash <span aria-hidden="true">→</span></button>
          </div>
          <div className="flex items-center gap-3 border-t border-[#edf0ee] pt-4">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f0ec] text-sm font-bold text-[#286553]">SM</div>
            <div className="min-w-0"><div className="truncate text-xs font-semibold text-[#26342f]">Safa Marva</div><div className="mt-0.5 text-[10px] text-[#8b9591]">E’lonlar boshqaruvi</div></div>
            <span className="ml-auto h-2 w-2 rounded-full bg-[#5db481]" />
          </div>
        </div>
      </aside>

      <div className="min-h-screen md:ml-[252px]">
        <header className="sticky top-0 z-10 border-b border-[#e9ece9] bg-[#f8f9fa]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <div className="md:hidden"><Brand compact /></div>
              <div className="hidden h-8 w-px bg-[#e4e9e6] sm:block md:hidden" />
              <div className="hidden sm:block"><div className="text-xs font-semibold text-[#303d38]">{heading.title}</div><div className="mt-1 text-[10px] capitalize text-[#929c98]">{dateLabel}</div></div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-[#e6ebe8] bg-white px-3 py-2 text-[11px] text-[#66736e] lg:flex"><span className={`h-1.5 w-1.5 rounded-full ${data?.telegram.webhookConfigured ? "bg-[#45a477]" : "bg-[#e5a94e]"}`} />{data?.telegram.webhookConfigured ? "Bot online" : "Bot sozlanmagan"}</div>
              <Button onClick={() => setModal("campaign")} className="min-h-10 px-3 text-xs sm:px-4 sm:text-sm"><Icon name="plus" size={16} /><span className="hidden sm:inline">Yangi e’lon</span><span className="sm:hidden">E’lon</span></Button>
            </div>
          </div>
        </header>

        <main className="mobile-safe-bottom mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-7 sm:pt-8 lg:px-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div><div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a9791]">SAFAMARVA <span className="px-1.5 text-[#c5ccc8]">/</span> BOSHQARUV PANELI</div><h1 className="text-[25px] font-bold tracking-[-0.04em] text-[#1d2a25] sm:text-[30px]">{heading.title}</h1><p className="mt-1 text-xs text-[#87928d] sm:text-sm">{heading.subtitle}</p></div>
            <div className="hidden items-center gap-2 rounded-xl border border-[#e8ece9] bg-white px-3 py-2 text-xs font-medium text-[#718079] md:flex"><Icon name="clock" size={15} className="text-[#688a7b]" />{dateLabel}</div>
          </div>

          {loadError ? <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{loadError}</span><button onClick={() => void refresh(true)} className="inline-flex items-center gap-1.5 font-semibold"><Icon name="refresh" size={15} /> Qayta yuklash</button></div> : null}

          {loading ? <LoadingState /> : data ? <>
            {view === "overview" && <OverviewView data={data} activeChannels={activeChannels} activeCampaigns={activeCampaigns} todayDeliveries={todayDeliveries} nextCampaign={nextCampaign} onCreate={() => setModal("campaign")} onGo={activeNav} onWebhook={connectWebhook} busy={busy} onCampaignAction={runAction} />}
            {view === "campaigns" && <CampaignsView data={data} onCreate={() => setModal("campaign")} onAction={runAction} busy={busy} />}
            {view === "channels" && <ChannelsView data={data} onAdd={() => setModal("channel")} onAction={runAction} busy={busy} />}
            {view === "history" && <HistoryView deliveries={data.deliveries} campaigns={data.campaigns} />}
            {view === "settings" && <SettingsView data={data} onWebhook={connectWebhook} busy={busy === "webhook"} onLogout={logout} />}
          </> : null}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e6ebe8] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_28px_rgba(23,47,38,0.06)] backdrop-blur md:hidden">
        {navItems.map((item) => <button key={item.id} onClick={() => activeNav(item.id)} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-semibold ${view === item.id ? "text-[#176052]" : "text-[#8c9792]"}`}><span className={`grid h-7 w-8 place-items-center rounded-lg ${view === item.id ? "bg-[#eaf3ef]" : ""}`}><Icon name={item.icon} size={17} /></span><span className="max-w-full truncate">{item.id === "overview" ? "Umumiy" : item.id === "history" ? "Tarix" : item.id === "campaigns" ? "E’lonlar" : item.id === "channels" ? "Kanallar" : "Sozlama"}</span></button>)}
      </nav>

      {modal === "campaign" && <CampaignComposer channels={activeChannels} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await refresh(false); notify("E’lon jadvalga muvaffaqiyatli qo‘shildi."); }} />}
      {modal === "channel" && <ChannelComposer onClose={() => setModal(null)} onSaved={async () => { setModal(null); await refresh(false); notify("Kanal muvaffaqiyatli qo‘shildi."); }} />}
      {toast ? <div role="status" className={`fixed bottom-24 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl md:bottom-6 ${toast.tone === "error" ? "bg-[#9e3d43]" : "bg-[#155b50]"}`}><Icon name={toast.tone === "error" ? "alert" : "check"} size={17} />{toast.message}</div> : null}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#155b50] text-white shadow-[0_6px_14px_rgba(21,91,80,0.18)]">
        <span className="absolute left-[11px] top-[10px] h-[13px] w-[13px] rotate-45 rounded-[3px] border-[1.5px] border-[#e5bd7a]" />
        <span className="absolute left-[15px] top-[14px] h-[7px] w-[7px] rotate-45 rounded-[1px] bg-[#f6dfb5]" />
      </div>
      {!compact ? <div><div className="text-[17px] font-bold tracking-[-0.04em] text-[#173b33]">Safa<span className="text-[#c78d43]">Flow</span></div><div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#9aa6a0]">Safa Marva</div></div> : <div><div className="text-[15px] font-bold tracking-[-0.04em] text-[#173b33]">Safa<span className="text-[#c78d43]">Flow</span></div><div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#9aa6a0]">Safa Marva</div></div>}
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: { id: View; label: string; icon: string }; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${active ? "bg-[#eaf3ef] text-[#155b50]" : "text-[#73807a] hover:bg-[#f6f8f7] hover:text-[#26332e]"}`}><Icon name={item.icon} size={17} className={active ? "text-[#347465]" : "text-[#a0aaa5] group-hover:text-[#71847b]"} />{item.label}{active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#4b927b]" /> : null}</button>;
}

function LoadingState() {
  return <div className="animate-soft-in space-y-5"><div className="h-[148px] animate-pulse rounded-3xl bg-[#e7ece9]" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[96px] animate-pulse rounded-2xl bg-[#e8ecea]" />)}</div><div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]"><div className="h-[260px] animate-pulse rounded-3xl bg-[#e8ecea]" /><div className="h-[260px] animate-pulse rounded-3xl bg-[#e8ecea]" /></div></div>;
}

function OverviewView({ data, activeChannels, activeCampaigns, todayDeliveries, nextCampaign, onCreate, onGo, onWebhook, busy, onCampaignAction }: {
  data: DashboardData;
  activeChannels: Channel[];
  activeCampaigns: Campaign[];
  todayDeliveries: number;
  nextCampaign?: Campaign;
  onCreate: () => void;
  onGo: (view: View) => void;
  onWebhook: () => void;
  busy: string;
  onCampaignAction: (key: string, url: string, method: string, body?: unknown, message?: string) => Promise<boolean>;
}) {
  return <div className="animate-soft-in space-y-5">
    {!data.telegram.tokenConfigured ? <ConnectionNotice onClick={() => onGo("settings")} /> : !data.telegram.webhookConfigured ? <ConnectionNotice connectedToken onClick={onWebhook} busy={busy === "webhook"} /> : <div className="flex items-center gap-2 rounded-2xl border border-[#d9ece1] bg-[#eff8f2] px-4 py-3 text-xs text-[#417259]"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#3e966d]"><Icon name="check" size={14} /></span><span><b>Telegram bot ulangan.</b> {data.telegram.botUsername ? `@${data.telegram.botUsername} tayyor.` : "E’lonlar reja bo‘yicha yuboriladi."}</span></div>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard icon="send" label="Faol e’lonlar" value={activeCampaigns.length} note="jadvalda" accent="green" />
      <MetricCard icon="users" label="Faol kanallar" value={activeChannels.length} note="kanal va guruh" accent="sand" />
      <MetricCard icon="check" label="Bugun yuborildi" value={todayDeliveries} note="muvaffaqiyatli" accent="blue" />
      <MetricCard icon="clock" label="Keyingi e’lon" value={nextCampaign?.nextRunAt ? formatDate(nextCampaign.nextRunAt) : "—"} note={nextCampaign?.title ? shortText(nextCampaign.title, 20) : "jadval yo‘q"} accent="lavender" />
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.32fr_0.88fr]">
      <section className="relative min-h-[220px] overflow-hidden rounded-[24px] bg-[#15554b] p-5 text-white shadow-[0_14px_34px_rgba(20,74,63,0.12)] sm:p-7">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border border-white/10" /><div className="absolute -right-1 top-[-30px] h-36 w-36 rounded-full border border-white/10" /><div className="absolute bottom-[-64px] right-[19%] h-36 w-36 rounded-full bg-[#c7964e]/15 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div><div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#dceee6]"><Icon name="clock" size={12} /> Avtomatik jadval</div><h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em] sm:text-[23px]">E’lonlar o‘z vaqtida yetsin</h2><p className="mt-1.5 max-w-md text-xs leading-5 text-[#c3ddd2]">Tanlangan kanallarga bir xil e’lonni kun davomida avtomatik tarqating.</p></div>
          <div className="hidden h-[68px] w-[68px] rotate-[-8deg] items-center justify-center rounded-[22px] border border-white/15 bg-white/10 sm:flex"><Icon name="send" size={30} className="text-[#e8c17e]" /></div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2"><span className="text-[10px] text-[#bbd4c9]">ORALIQ</span><b className="text-[13px]">{nextCampaign ? `${nextCampaign.startTime} — ${nextCampaign.endTime}` : "12:00 — 24:00"}</b></div>
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2"><span className="text-[10px] text-[#bbd4c9]">KUNIGA</span><b className="text-[13px]">{nextCampaign?.postsPerDay ?? 10} marta</b></div>
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2"><span className="text-[10px] text-[#bbd4c9]">KEYINGISI</span><b className="text-[13px]">{nextCampaign?.nextRunAt ? formatDate(nextCampaign.nextRunAt) : "Yangi jadval kerak"}</b></div>
          <Button onClick={onCreate} variant="white" className="ml-auto min-h-9 px-3 text-xs"><Icon name="plus" size={15} /> Reja yaratish</Button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e8ece9] bg-white p-5 shadow-[0_4px_18px_rgba(27,47,38,0.025)] sm:p-6">
        <SectionTitle title="Ulangan kanallar" action={<button onClick={() => onGo("channels")} className="text-[11px] font-semibold text-[#387568] hover:underline">Barchasi <span aria-hidden="true">→</span></button>} />
        {activeChannels.length ? <div className="space-y-1">{activeChannels.slice(0, 4).map((channel) => <ChannelRow key={channel.id} channel={channel} compact />)}{activeChannels.length > 4 ? <button onClick={() => onGo("channels")} className="w-full pt-2 text-center text-[11px] font-semibold text-[#7b8882]">+ yana {activeChannels.length - 4} ta kanal</button> : null}</div> : <EmptyState title="Hali kanal ulanmagan" description="Botni administrator qilib qo‘shing, so‘ng kanal manzilini kiriting." action={<Button variant="secondary" onClick={() => onGo("channels")}><Icon name="plus" size={15} /> Kanal qo‘shish</Button>} />}
      </section>
    </div>

    <div className="grid items-start gap-5 lg:grid-cols-[1.32fr_0.88fr]">
      <section className="rounded-[24px] border border-[#e8ece9] bg-white p-5 shadow-[0_4px_18px_rgba(27,47,38,0.025)] sm:p-6">
        <SectionTitle title="Faol e’lonlar" action={<button onClick={() => onGo("campaigns")} className="text-[11px] font-semibold text-[#387568] hover:underline">Barchasini ko‘rish <span aria-hidden="true">→</span></button>} />
        {activeCampaigns.length ? <div className="space-y-3">{activeCampaigns.slice(0, 3).map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} channels={data.channels} onAction={onCampaignAction} busy={busy} compact />)}</div> : <EmptyState title="Birinchi e’loningizni yarating" description="Matnni kiriting, kanallarni tanlang va kuniga nechta marta ketishini belgilang." action={<Button onClick={onCreate}><Icon name="plus" size={15} /> E’lon yaratish</Button>} />}
      </section>

      <section className="rounded-[24px] border border-[#e8ece9] bg-white p-5 shadow-[0_4px_18px_rgba(27,47,38,0.025)] sm:p-6">
        <SectionTitle title="Oxirgi jo‘natmalar" action={<button onClick={() => onGo("history")} className="text-[11px] font-semibold text-[#387568] hover:underline">Tarix <span aria-hidden="true">→</span></button>} />
        <RecentActivity deliveries={data.deliveries.slice(0, 5)} campaigns={data.campaigns} />
      </section>
    </div>

    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#ece9df] bg-[#fcfaf5] px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-2.5"><span className="mt-0.5 text-[#bd8f48]"><Icon name="shield" size={17} /></span><p className="text-[11px] leading-5 text-[#786f5c]"><b className="text-[#665c49]">Muhim:</b> Telegram bot foydalanuvchi profilingizdan post qila olmaydi. Botni kanalga administrator qiling; guruhda xabar yozish huquqini bering.</p></div>
      <button onClick={() => onGo("settings")} className="shrink-0 text-[11px] font-semibold text-[#8b6d38] hover:underline">Ulanish yo‘riqnomasi →</button>
    </div>
  </div>;
}

function ConnectionNotice({ connectedToken = false, onClick, busy = false }: { connectedToken?: boolean; onClick: () => void; busy?: boolean }) {
  return <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${connectedToken ? "border-[#eadfca] bg-[#fbf7ef]" : "border-[#f0e4ca] bg-[#fffaf0]"}`}>
    <div className="flex items-start gap-3"><div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#b98a42]"><Icon name={connectedToken ? "link" : "alert"} size={17} /></div><div><div className="text-xs font-bold text-[#635235]">{connectedToken ? "Bot token tayyor — webhookni ulang" : "Telegram bot hali ulanmagan"}</div><p className="mt-1 text-[11px] leading-5 text-[#8b7b5c]">{connectedToken ? "Bir tugma bilan Telegram webhook’ni ulab, bot buyruqlarini faollashtiring." : "BotFather’dan token olib, TELEGRAM_BOT_TOKEN ni serverga kiriting. Keyin sozlamalarda webhook’ni ulang."}</p></div></div>
    <Button variant="secondary" onClick={onClick} disabled={busy} className="min-h-9 shrink-0 text-xs">{connectedToken ? <><Icon name="link" size={14} />{busy ? "Ulanmoqda…" : "Webhook ulash"}</> : "Sozlamalarga o‘tish"}</Button>
  </div>;
}

function MetricCard({ icon, label, value, note, accent }: { icon: string; label: string; value: string | number; note: string; accent: string }) {
  const colors: Record<string, string> = { green: "bg-[#e9f3ee] text-[#3d806a]", sand: "bg-[#f8f1e6] text-[#ba8b46]", blue: "bg-[#edf2f7] text-[#65809c]", lavender: "bg-[#f1eef7] text-[#8579a0]" };
  return <div className="rounded-[20px] border border-[#e8ece9] bg-white p-4 shadow-[0_4px_18px_rgba(27,47,38,0.02)] sm:p-5"><div className="flex items-center justify-between gap-2"><div className="text-[10px] font-semibold text-[#87918d] sm:text-[11px]">{label}</div><span className={`grid h-8 w-8 place-items-center rounded-xl ${colors[accent]}`}><Icon name={icon} size={15} /></span></div><div className={`mt-2 font-bold tracking-[-0.04em] text-[#1f2c27] ${typeof value === "string" && value.length > 8 ? "text-[17px] sm:text-[18px]" : "text-[25px] sm:text-[28px]"}`}>{value}</div><div className="mt-0.5 truncate text-[10px] text-[#9aa39f]">{note}</div></div>;
}

function ChannelRow({ channel, compact = false }: { channel: Channel; compact?: boolean }) {
  const isGroup = channel.type === "group" || channel.type === "supergroup";
  return <div className={`flex items-center gap-3 rounded-xl ${compact ? "px-1 py-2" : "border border-[#edf0ee] px-3 py-3"}`}>
    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${isGroup ? "bg-[#eef1f8] text-[#7182a5]" : "bg-[#e8f3ef] text-[#3f816e]"}`}>{isGroup ? "G" : "C"}</div>
    <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-[#35413c]">{channel.title}</div><div className="mt-0.5 truncate text-[10px] text-[#98a19d]">{channel.username ? `@${channel.username}` : channel.chatId} · {isGroup ? "Guruh" : "Kanal"}</div></div>
    <span className={`h-2 w-2 shrink-0 rounded-full ${channel.active ? "bg-[#5db481]" : "bg-[#c7ceca]"}`} title={channel.active ? "Faol" : "To‘xtatilgan"} />
  </div>;
}

function CampaignCard({ campaign, channels, onAction, busy, compact = false }: { campaign: Campaign; channels: Channel[]; onAction: (key: string, url: string, method: string, body?: unknown, message?: string) => Promise<boolean>; busy: string; compact?: boolean }) {
  const targets = channels.filter((channel) => campaign.targetIds.includes(channel.id));
  return <article className={`rounded-2xl border border-[#e9eeeb] bg-[#fcfdfc] ${compact ? "p-4" : "p-5"}`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[13px] font-bold text-[#26342f]">{campaign.title}</h3><StatusPill status={campaign.status} /></div><p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-[#75817b]">{shortText(campaign.body, compact ? 160 : 230)}</p></div></div>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#edf0ee] pt-3 text-[10px] text-[#7c8982]"><span className="inline-flex items-center gap-1"><Icon name="clock" size={12} />{campaign.startTime}–{campaign.endTime} · {campaign.postsPerDay} marta/kun</span><span className="inline-flex items-center gap-1"><Icon name="users" size={12} />{campaign.targetIds.length} ta kanal</span>{campaign.nextRunAt ? <span>Keyingi: {formatDate(campaign.nextRunAt)}</span> : null}</div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 flex-wrap gap-1.5">{targets.slice(0, 3).map((channel) => <span key={channel.id} className="max-w-[135px] truncate rounded-full bg-[#f0f4f2] px-2 py-1 text-[9px] font-medium text-[#718079]">{channel.title}</span>)}{targets.length > 3 ? <span className="rounded-full bg-[#f0f4f2] px-2 py-1 text-[9px] text-[#718079]">+{targets.length - 3}</span> : null}</div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button disabled={busy === `publish-${campaign.id}`} onClick={() => void onAction(`publish-${campaign.id}`, `/api/campaigns/${campaign.id}/publish`, "POST", undefined, "E’lon tanlangan kanallarga yuborildi.")} className="rounded-lg border border-[#dfeae4] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#31705f] hover:bg-[#edf6f1] disabled:opacity-50">{busy === `publish-${campaign.id}` ? "Yuborilmoqda…" : "Hozir yuborish"}</button>
        <button title={campaign.status === "active" ? "To‘xtatish" : "Davom ettirish"} disabled={busy === `toggle-${campaign.id}`} onClick={() => void onAction(`toggle-${campaign.id}`, `/api/campaigns/${campaign.id}`, "PATCH", { action: campaign.status === "active" ? "pause" : "resume" }, campaign.status === "active" ? "E’lon vaqtincha to‘xtatildi." : "E’lon jadvalga qaytarildi.")} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e5eae7] bg-white text-[#697770] hover:bg-[#f5f8f6] disabled:opacity-50"><Icon name={campaign.status === "active" ? "pause" : "play"} size={13} /></button>
        <button title="E’lonni o‘chirish" disabled={busy === `delete-${campaign.id}`} onClick={() => { if (window.confirm("Bu e’lon va uning tarixini o‘chirasizmi?")) void onAction(`delete-${campaign.id}`, `/api/campaigns/${campaign.id}`, "DELETE", undefined, "E’lon o‘chirildi."); }} className="grid h-8 w-8 place-items-center rounded-lg border border-[#f0e4e4] bg-white text-[#aa7373] hover:bg-[#fff4f3] disabled:opacity-50"><Icon name="trash" size={13} /></button>
      </div></div>
    </article>;
}

function RecentActivity({ deliveries, campaigns }: { deliveries: Delivery[]; campaigns: Campaign[] }) {
  if (!deliveries.length) return <EmptyState title="Jo‘natmalar hali yo‘q" description="Rejalashtirilgan yoki qo‘lda yuborilgan e’lonlar tarixi shu yerda ko‘rinadi." />;
  return <div className="space-y-1">{deliveries.map((delivery) => {
    const campaign = campaigns.find((item) => item.id === delivery.campaignId);
    return <div key={delivery.id} className="flex items-center gap-2.5 border-b border-[#f0f2f1] py-2.5 last:border-0"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${delivery.status === "sent" ? "bg-[#eaf4ee] text-[#4d926e]" : "bg-rose-50 text-rose-500"}`}><Icon name={delivery.status === "sent" ? "check" : "alert"} size={13} /></span><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold text-[#3b4742]">{delivery.channelTitle}</div><div className="mt-0.5 truncate text-[10px] text-[#98a19d]">{campaign?.title ?? "E’lon"}</div></div><div className="shrink-0 text-right"><StatusPill status={delivery.status} /><div className="mt-1 text-[9px] text-[#a2aaa6]">{formatDate(delivery.sentAt)}</div></div></div>;
  })}</div>;
}

function CampaignsView({ data, onCreate, onAction, busy }: { data: DashboardData; onCreate: () => void; onAction: (key: string, url: string, method: string, body?: unknown, message?: string) => Promise<boolean>; busy: string }) {
  return <div className="animate-soft-in space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-[#83908a]">Jami <b className="text-[#33413b]">{data.campaigns.length}</b> ta e’lon · <b className="text-[#31725d]">{data.campaigns.filter((item) => item.status === "active").length} faol</b></div><Button onClick={onCreate}><Icon name="plus" size={16} /> Yangi e’lon</Button></div>
    {data.campaigns.length ? <div className="space-y-3">{data.campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} channels={data.channels} onAction={onAction} busy={busy} />)}</div> : <EmptyState title="E’lonlaringiz hali yo‘q" description="Namunaviy Safa Marva e’lon matni tayyor turibdi. Yangi e’lon tugmasini bosing." action={<Button onClick={onCreate}><Icon name="plus" size={15} /> Birinchi e’lon</Button>} />}
  </div>;
}

function ChannelsView({ data, onAdd, onAction, busy }: { data: DashboardData; onAdd: () => void; onAction: (key: string, url: string, method: string, body?: unknown, message?: string) => Promise<boolean>; busy: string }) {
  return <div className="animate-soft-in space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfeae4] bg-[#f1f7f3] px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#4d866e]"><Icon name="shield" size={17} /></div><div><div className="text-xs font-bold text-[#315848]">Botga post yozish huquqi kerak</div><div className="mt-1 text-[10px] text-[#70877a]">Kanalda administrator, guruhda esa xabar yuborish ruxsati bo‘lsin.</div></div></div><Button onClick={onAdd} variant="secondary"><Icon name="plus" size={15} /> Kanal qo‘shish</Button></div>
    {data.channels.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.channels.map((channel) => <div key={channel.id} className={`rounded-2xl border bg-white p-4 shadow-[0_4px_18px_rgba(27,47,38,0.02)] ${channel.active ? "border-[#e8ece9]" : "border-dashed border-[#e1e5e3] opacity-75"}`}><div className="flex items-start justify-between gap-3"><ChannelRow channel={channel} /><div className="flex shrink-0 items-center gap-1"><button title={channel.active ? "Vaqtincha o‘chirish" : "Faollashtirish"} disabled={busy === `channel-${channel.id}`} onClick={() => void onAction(`channel-${channel.id}`, `/api/channels/${channel.id}`, "PATCH", { active: !channel.active }, channel.active ? "Kanal vaqtincha o‘chirildi." : "Kanal faollashtirildi.")} className="grid h-8 w-8 place-items-center rounded-lg text-[#76837d] hover:bg-[#f3f6f4]"><Icon name={channel.active ? "pause" : "play"} size={13} /></button><button title="Kanalni o‘chirish" disabled={busy === `remove-channel-${channel.id}`} onClick={() => { if (window.confirm(`${channel.title} kanalini o‘chirasizmi?`)) void onAction(`remove-channel-${channel.id}`, `/api/channels/${channel.id}`, "DELETE", undefined, "Kanal o‘chirildi."); }} className="grid h-8 w-8 place-items-center rounded-lg text-[#a37777] hover:bg-rose-50"><Icon name="trash" size={13} /></button></div></div><div className="mt-4 flex items-center justify-between border-t border-[#eff1f0] pt-3 text-[10px] text-[#98a19d]"><span>Qo‘shilgan {formatDate(channel.createdAt, false)}</span><StatusPill status={channel.active ? "active" : "paused"} /></div></div>)}</div> : <EmptyState title="Birinchi kanalingizni ulang" description="Ochiq kanal uchun @username, maxfiy kanal yoki guruh uchun -100… bilan boshlanuvchi chat ID kiriting." action={<Button onClick={onAdd}><Icon name="plus" size={15} /> Kanal qo‘shish</Button>} />}
    <div className="rounded-2xl border border-[#ece9df] bg-[#fcfaf5] p-4"><div className="text-xs font-bold text-[#665c49]">Kanalni qo‘shish tartibi</div><ol className="mt-2 grid gap-2 text-[11px] leading-5 text-[#827963] sm:grid-cols-3"><li><b className="mr-1 text-[#bd914d]">01</b> Telegram’da botni kanal administratorlariga qo‘shing.</li><li><b className="mr-1 text-[#bd914d]">02</b> Post yuborish huquqini yoqing.</li><li><b className="mr-1 text-[#bd914d]">03</b> @username yoki chat ID bilan ro‘yxatga kiriting.</li></ol></div>
  </div>;
}

function HistoryView({ deliveries, campaigns }: { deliveries: Delivery[]; campaigns: Campaign[] }) {
  return <div className="animate-soft-in rounded-[24px] border border-[#e8ece9] bg-white p-5 shadow-[0_4px_18px_rgba(27,47,38,0.025)] sm:p-6"><SectionTitle title="So‘nggi jo‘natmalar" />{deliveries.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left"><thead><tr className="border-b border-[#edf0ee] text-[10px] uppercase tracking-[0.08em] text-[#9aa39f]"><th className="px-3 py-3 font-semibold">Holat</th><th className="px-3 py-3 font-semibold">E’lon</th><th className="px-3 py-3 font-semibold">Kanal / guruh</th><th className="px-3 py-3 font-semibold">Vaqt</th><th className="px-3 py-3 font-semibold">Izoh</th></tr></thead><tbody>{deliveries.map((delivery) => <tr key={delivery.id} className="border-b border-[#f1f3f2] last:border-0"><td className="px-3 py-3"><StatusPill status={delivery.status} /></td><td className="max-w-[220px] truncate px-3 py-3 text-xs font-semibold text-[#3b4742]">{campaigns.find((item) => item.id === delivery.campaignId)?.title ?? "O‘chirilgan e’lon"}</td><td className="px-3 py-3 text-xs text-[#67746e]">{delivery.channelTitle}</td><td className="px-3 py-3 text-[11px] text-[#84908a]">{formatDate(delivery.sentAt)}</td><td className="max-w-[220px] truncate px-3 py-3 text-[10px] text-rose-600">{delivery.error ?? (delivery.telegramMessageId ? `Telegram #${delivery.telegramMessageId}` : "—")}</td></tr>)}</tbody></table></div> : <EmptyState title="Tarix hozircha bo‘sh" description="E’lonlar yuborila boshlagach, har bir kanal bo‘yicha natijalar shu yerda chiqadi." />}</div>;
}

function SettingsView({ data, onWebhook, busy, onLogout }: { data: DashboardData; onWebhook: () => void; busy: boolean; onLogout: () => void }) {
  return <div className="animate-soft-in grid items-start gap-5 xl:grid-cols-[1fr_0.92fr]">
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#e8ece9] bg-white p-5 shadow-[0_4px_18px_rgba(27,47,38,0.025)] sm:p-6"><SectionTitle title="Telegram bot ulanishi" /><div className="flex items-start gap-3 rounded-2xl border border-[#edf0ee] bg-[#fafcfb] p-4"><span className={`mt-0.5 grid h-9 w-9 place-items-center rounded-xl ${data.telegram.webhookConfigured ? "bg-[#e9f4ed] text-[#398265]" : "bg-[#fbf3e5] text-[#b68b49]"}`}><Icon name={data.telegram.webhookConfigured ? "check" : "link"} size={17} /></span><div className="flex-1"><div className="text-sm font-bold text-[#293731]">{data.telegram.webhookConfigured ? `@${data.telegram.botUsername || "Telegram bot"} ulangan` : data.telegram.tokenConfigured ? "Webhook hali ulanmagan" : "Bot tokeni kiritilmagan"}</div><p className="mt-1 text-xs leading-5 text-[#7d8983]">{data.telegram.webhookConfigured ? data.telegram.webhookUrl : "Telegram BotFather’dan token olib, uni faqat server tomondagi TELEGRAM_BOT_TOKEN muhit o‘zgaruvchisiga kiriting."}</p></div><StatusPill status={data.telegram.webhookConfigured ? "active" : "paused"} /></div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={onWebhook} disabled={busy || !data.telegram.tokenConfigured} className="text-xs"><Icon name="link" size={15} />{busy ? "Ulanmoqda…" : data.telegram.webhookConfigured ? "Webhook’ni qayta ulash" : "Webhook ulash"}</Button><div className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#f4f6f5] px-3 text-[10px] text-[#78847e]"><Icon name="shield" size={14} />Token brauzerga chiqarilmaydi</div></div></section>

      <section className="rounded-[24px] border border-[#e8ece9] bg-white p-5 shadow-[0_4px_18px_rgba(27,47,38,0.025)] sm:p-6"><SectionTitle title="Botni ishga tushirish" /><div className="space-y-4">{[
        { n: "01", title: "BotFather’da bot oching", text: "Telegram’da @BotFather’ga /newbot yuboring va olgan tokenni serverda TELEGRAM_BOT_TOKEN sifatida saqlang." },
        { n: "02", title: "Webhook’ni ulang", text: "Tokenni qo‘shgach, yuqoridagi “Webhook ulash” tugmasini bosing. Sayt HTTPS manzilda ochiq bo‘lishi kerak." },
        { n: "03", title: "Bot egasini belgilang", text: "Botga /start yuboring. Bot ID raqamingizni ko‘rsatadi. Uni BOT_OWNER_ID sifatida serverga qo‘shing va botni qayta oching." },
        { n: "04", title: "Botga kanal huquqini bering", text: "Har bir kanalga botni administrator qiling. Shundan keyin /kanal @kanal_username bilan ulang." },
      ].map((step) => <div key={step.n} className="flex gap-3"><span className="grid h-7 w-8 shrink-0 place-items-center rounded-lg bg-[#f0f5f2] text-[10px] font-bold text-[#4d816d]">{step.n}</span><div><div className="text-xs font-bold text-[#34413b]">{step.title}</div><p className="mt-1 text-[11px] leading-5 text-[#818c87]">{step.text}</p></div></div>)}</div></section>
    </div>

    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#dfeae4] bg-[#edf5f0] p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#4a816d]"><Icon name="clock" size={19} /></div><div><div className="text-sm font-bold text-[#285143]">Rejani GitHub bilan ishga tushiring</div><div className="mt-1 text-[10px] text-[#698276]">Har 5 daqiqada jadvalni tekshiradi</div></div></div><p className="mt-3 text-xs leading-5 text-[#60796d]">Loyihadagi `.github/workflows/telegram-publish.yml` avtomatik ish jarayoni tayyor. Uni GitHub repository’ga push qiling va repository Secrets’ga quyidagilarni qo‘shing:</p><div className="mt-3 space-y-2">{[["APP_URL", "Saytingizning https:// manzili"], ["CRON_SECRET", "Serverdagi CRON_SECRET bilan bir xil maxfiy kalit"]].map(([key, value]) => <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2.5"><code className="text-[11px] font-bold text-[#315c4c]">{key}</code><span className="text-[10px] text-[#87958d]">{value}</span></div>)}</div><div className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-[#778b7f]"><Icon name="alert" size={14} className="mt-0.5 shrink-0" />Server muhitida ham ayni CRON_SECRET va TELEGRAM_BOT_TOKEN qiymatlari bo‘lishi zarur. GitHub Secrets’ga tokenni yozmang — bot tokeni serverda saqlanadi.</div></section>

      <section className="rounded-[24px] border border-[#ece9df] bg-[#fcfaf5] p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-bold text-[#655b48]"><Icon name="shield" size={16} className="text-[#bb914f]" /> Telegram cheklovi</div><p className="mt-2 text-[11px] leading-5 text-[#81765f]">Telegram Bot API foydalanuvchining shaxsiy profilidan post qila olmaydi. Kanalga botni administrator qilib qo‘shing. Telegram bir daqiqadagi yuborish tezligini ham cheklaydi; SafaFlow har bir yuborishni alohida qayd qiladi.</p></section>
      {data.accessProtected ? <section className="flex items-center justify-between gap-4 rounded-[24px] border border-[#e8ece9] bg-white p-5"><div><div className="text-xs font-bold text-[#35423c]">Admin sessiyasi himoyalangan</div><p className="mt-1 text-[10px] text-[#89948e]">Kirish HttpOnly cookie bilan saqlanadi.</p></div><Button variant="secondary" onClick={onLogout}>Paneldan chiqish</Button></section> : <section className="rounded-[24px] border border-[#f0e2c7] bg-[#fffaf0] p-5"><div className="text-xs font-bold text-[#705b35]">Panelni parol bilan himoyalang</div><p className="mt-1 text-[11px] leading-5 text-[#8a7959]">Sayt ommaga ochiq bo‘lsa, server muhitiga kuchli DASHBOARD_PASSWORD qiymatini qo‘shing. Bu sahifa va boshqaruv API’lari admin sessiyasini talab qiladi.</p><code className="mt-2 inline-block rounded-lg bg-white/80 px-2 py-1 text-[10px] text-[#806a41]">DASHBOARD_PASSWORD=uzun-maxfiy-parol</code></section>}
    </div>
  </div>;
}

function CampaignComposer({ channels, onClose, onSaved }: { channels: Channel[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState("Umra — noyabr safari");
  const [body, setBody] = useState(SAMPLE_AD);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("24:00");
  const [postsPerDay, setPostsPerDay] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>(channels.map((channel) => channel.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleChannel = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await requestJson("/api/campaigns", { method: "POST", body: JSON.stringify({ title, body, targetIds: selectedIds, startTime, endTime, postsPerDay, timezone: "Asia/Tashkent" }) });
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "E’lonni saqlab bo‘lmadi.");
    } finally {
      setSaving(false);
    }
  };

  return <Modal title="Yangi e’lon yaratish" subtitle="Matn bir xil holatda tanlangan barcha kanallarga yuboriladi." onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#56635d]">E’lon nomi</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="form-control" placeholder="Masalan, Noyabr umra safari" /></label>
      <label className="block"><span className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-[#56635d]"><span>E’lon matni</span><span className={`${body.length > 3900 ? "text-rose-600" : "text-[#9aa39f]"}`}>{body.length}/4096</span></span><textarea required value={body} onChange={(event) => setBody(event.target.value)} maxLength={4096} rows={10} className="form-control resize-y leading-6" placeholder="E’lon matnini shu yerga kiriting…" /></label>
      <div><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-[#56635d]">E’lon boradigan kanallar</span><span className="text-[10px] text-[#8e9994]">{selectedIds.length} ta tanlandi</span></div>{channels.length ? <div className="grid max-h-36 gap-2 overflow-y-auto rounded-xl border border-[#e9eeeb] bg-[#fbfcfb] p-2 sm:grid-cols-2">{channels.map((channel) => <label key={channel.id} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 ${selectedIds.includes(channel.id) ? "border-[#cfe2d7] bg-[#f1f8f3]" : "border-transparent bg-white"}`}><input type="checkbox" checked={selectedIds.includes(channel.id)} onChange={() => toggleChannel(channel.id)} className="h-3.5 w-3.5 accent-[#176052]" /><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-[#526059]">{channel.title}</span><span className="block truncate text-[9px] text-[#9aa39f]">{channel.username ? `@${channel.username}` : channel.chatId}</span></span></label>)}</div> : <div className="rounded-xl border border-dashed border-[#dfe6e2] bg-[#fbfcfb] p-3 text-[11px] text-[#8b9690]">Kanal ulanmagan. Avval “Kanallar” bo‘limidan kamida bitta kanal qo‘shing.</div>}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#56635d]">Boshlanish vaqti</span><TimeSelect value={startTime} onChange={setStartTime} /></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#56635d]">Tugash vaqti</span><TimeSelect value={endTime} onChange={setEndTime} /></label><label className="col-span-2 block sm:col-span-1"><span className="mb-1.5 block text-[11px] font-semibold text-[#56635d]">Kuniga necha marta?</span><select value={postsPerDay} onChange={(event) => setPostsPerDay(Number(event.target.value))} className="form-control">{Array.from({ length: 30 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} marta / kun</option>)}</select></label></div>
      <div className="flex flex-wrap gap-2"><span className="mr-1 self-center text-[10px] text-[#87918c]">Tez tanlash:</span>{[5, 10, 15].map((count) => <button key={count} type="button" onClick={() => setPostsPerDay(count)} className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${postsPerDay === count ? "border-[#bed9ca] bg-[#edf6f0] text-[#356e59]" : "border-[#e7ece9] bg-white text-[#78847e]"}`}>{count} marta</button>)}<span className="ml-auto self-center text-[10px] text-[#8d9892]">Toshkent vaqti</span></div>
      {error ? <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}
      <div className="flex items-center justify-between gap-3 border-t border-[#edf0ee] pt-4"><div className="text-[10px] leading-4 text-[#8a9690]">Keyingi mos vaqtda avtomatik yuboriladi.<br />Har bir vaqt oralig‘ida barcha kanallarga jo‘natiladi.</div><div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Bekor qilish</Button><Button type="submit" disabled={saving || !channels.length || !selectedIds.length || !body.trim()}>{saving ? "Saqlanmoqda…" : <><Icon name="check" size={15} /> Jadvalga qo‘shish</>}</Button></div></div>
    </form>
  </Modal>;
}

function TimeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const times = Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index * 15 / 60)).padStart(2, "0")}:${String(index * 15 % 60).padStart(2, "0")}`);
  times.push("24:00");
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="form-control">{times.map((time) => <option key={time} value={time}>{time}</option>)}</select>;
}

function ChannelComposer({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [chatReference, setChatReference] = useState("");
  const [type, setType] = useState("channel");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await requestJson("/api/channels", { method: "POST", body: JSON.stringify({ title, chatReference, type }) });
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kanalni ulab bo‘lmadi.");
    } finally {
      setSaving(false);
    }
  };
  return <Modal title="Telegram kanalini ulash" subtitle="Ochiq kanal uchun username, maxfiy kanal yoki guruh uchun chat ID kiriting." onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#56635d]">Ko‘rinadigan nom <span className="font-normal text-[#9aa39f]">(ixtiyoriy)</span></span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="form-control" placeholder="Safa Marva | Umra" /></label>
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#56635d]">Telegram manzili yoki chat ID</span><input required value={chatReference} onChange={(event) => setChatReference(event.target.value)} className="form-control" placeholder="@kanal_username yoki -1001234567890" /><span className="mt-1.5 block text-[10px] leading-4 text-[#8b9690]">Ochiq kanalga t.me/kanal_username havolasi ham bo‘ladi. Shaxsiy invite-link o‘rniga chat ID kiriting.</span></label>
      <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setType("channel")} className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${type === "channel" ? "border-[#bcd7c8] bg-[#f0f7f2] text-[#356e58]" : "border-[#e7ece9] text-[#77837d]"}`}>📣 Kanal</button><button type="button" onClick={() => setType("group")} className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${type === "group" ? "border-[#cdd7e8] bg-[#f1f4fa] text-[#647a9c]" : "border-[#e7ece9] text-[#77837d]"}`}>👥 Guruh</button></div>
      <div className="rounded-xl bg-[#faf7ef] px-3 py-2.5 text-[10px] leading-5 text-[#877656]">Botni oldin Telegram’da administrator qilib qo‘shing. Token sozlangan bo‘lsa, kanal ruxsatlari avtomatik tekshiriladi.</div>
      {error ? <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}
      <div className="flex justify-end gap-2 border-t border-[#edf0ee] pt-4"><Button variant="secondary" onClick={onClose}>Bekor qilish</Button><Button type="submit" disabled={saving || !chatReference.trim()}>{saving ? "Tekshirilmoqda…" : <><Icon name="plus" size={15} /> Kanalni ulash</>}</Button></div>
    </form>
  </Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14211d]/40 px-0 py-0 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="app-scrollbar animate-soft-in max-h-[94vh] w-full max-w-[660px] overflow-y-auto rounded-t-[24px] border border-[#e8ece9] bg-white p-5 shadow-[0_25px_80px_rgba(13,40,29,0.2)] sm:rounded-[24px] sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="dialog-title" className="text-[18px] font-bold tracking-[-0.03em] text-[#26342f]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-[#8a9590]">{subtitle}</p></div><button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#8d9893] hover:bg-[#f4f6f5]" aria-label="Yopish"><Icon name="close" size={17} /></button></div>{children}</section></div>;
}
