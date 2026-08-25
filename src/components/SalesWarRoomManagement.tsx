import { useEffect, useMemo, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

type Mode = "owner" | "admin";

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return fmt(d);
};

export default function SalesWarRoomManagement({ mode }: { mode: Mode }) {
  const isOwner = mode === "owner";
  const tokenKey = isOwner ? "warRoomAdminToken" : "warRoomLimitedAdminToken";
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || "");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(fmt(new Date()));
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openingSlug, setOpeningSlug] = useState("");
  const [newAgent, setNewAgent] = useState({ name_en: "", name_ar: "", slug: "" });
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  useEffect(() => {
    document.title = isOwner ? "Tycoons Sales War Room Owner" : "Tycoons Sales War Room Admin";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex,nofollow,noarchive";
    document.head.appendChild(m);
    return () => m.remove();
  }, [isOwner]);

  useEffect(() => {
    if (token) void load();
  }, [token, from, to]);

  async function login() {
    try {
      setError("");
      const r = isOwner
        ? await salesWarRoomApi.adminLogin(password)
        : await salesWarRoomApi.limitedAdminLogin(password);
      localStorage.setItem(tokenKey, r.token);
      setToken(r.token);
      setPassword("");
    } catch {
      setError(t("Wrong password", "كلمة السر غير صحيحة"));
    }
  }

  async function load() {
    try {
      setLoading(true);
      setError("");
      setData(await salesWarRoomApi.adminSummary(token, from, to));
    } catch (e: any) {
      if (e.message === "unauthorized") {
        localStorage.removeItem(tokenKey);
        setToken("");
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openAgent(slug: string) {
    if (!isOwner || openingSlug) return;
    const popup = window.open("about:blank", "_blank");
    try {
      setOpeningSlug(slug);
      setError("");
      const r = await salesWarRoomApi.adminAgentAccess(token, slug);
      localStorage.setItem(`warRoomAgentToken:${slug}`, r.token);
      const target = `/sales-war-room/a/${slug}`;
      if (popup) popup.location.href = target;
      else window.location.href = target;
    } catch (e: any) {
      if (popup) popup.close();
      setError(e.message === "owner_only" ? t("Owner access only", "الدخول للـAgent متاح للـOwner فقط") : e.message);
    } finally {
      setOpeningSlug("");
    }
  }

  async function addAgent() {
    if (!newAgent.name_en || !newAgent.slug) return;
    try {
      const r = await salesWarRoomApi.addAdminAgent(token, newAgent);
      setNewAgent({ name_en: "", name_ar: "", slug: "" });
      if (r.password) alert(`${t("New agent password", "باسورد الـAgent الجديد")}: ${r.password}`);
      void load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const rows = useMemo(() => {
    if (!data) return [];
    return data.agents.map((a: any) => {
      const scores = data.scores.filter((s: any) => s.agent_id === a.id);
      const pipe = data.pipeline.filter((p: any) => p.agent_id === a.id);
      const follow = data.followups.filter((f: any) => f.agent_id === a.id);
      let calls = 0, wins = 0, losses = 0, potential = 0, meetings = 0, sales = 0;
      scores.forEach((s: any) => {
        for (let i = 1; i <= 4; i++) {
          calls += Number(s[`match${i}_calls`] || 0);
          if (s[`match${i}_status`] === "win") wins++;
          if (s[`match${i}_status`] === "loss") losses++;
        }
        potential += Number(s.potential_cases || 0);
        meetings += Number(s.meetings_scheduled || 0);
        sales += Number(s.sales_volume || 0);
      });
      return {
        ...a,
        calls,
        wins,
        losses,
        total: wins + losses,
        potential,
        meetings,
        sales,
        warm: pipe.filter((p: any) => p.stage === "Warm").length,
        hot: pipe.filter((p: any) => p.stage === "Hot / Very Potential").length,
        overdue: follow.length,
      };
    });
  }, [data]);

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-xs font-black tracking-[.18em] text-slate-400">TYCOONS SALES WAR ROOM</div>
              <h1 className="text-2xl font-black">{isOwner ? t("Owner Dashboard", "لوحة تحكم الـOwner") : t("Admin Dashboard", "لوحة تحكم الأدمن")}</h1>
            </div>
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-full border border-white/20 px-3 py-2 text-xs font-black">{lang === "ar" ? "EN" : "عربي"}</button>
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder={isOwner ? t("Owner password", "كلمة سر الـOwner") : t("Admin password", "كلمة سر الأدمن")} className="w-full rounded-xl border border-white/10 bg-white/10 p-3 outline-none" />
          <button onClick={login} className="mt-3 w-full rounded-xl bg-white p-3 font-black text-slate-950">{t("Login", "دخول")}</button>
          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f5f7] text-slate-950" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-[1600px] p-3 md:p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black tracking-[.18em] text-slate-500">TYCOONS SALES WAR ROOM</div>
            <h1 className="text-2xl font-black">{isOwner ? t("Owner Dashboard", "لوحة تحكم الـOwner") : t("Admin Dashboard", "لوحة تحكم الأدمن")}</h1>
            {!isOwner && <p className="mt-1 text-xs font-bold text-slate-500">{t("Team monitoring only — agent dashboards are owner-only.", "متابعة الفريق فقط — دخول داشبورد الـAgents متاح للـOwner فقط.")}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-full border bg-white px-4 py-2 text-sm font-black">{lang === "ar" ? "EN" : "عربي"}</button>
            <button onClick={() => { localStorage.removeItem(tokenKey); setToken(""); }} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">{t("Logout", "خروج")}</button>
          </div>
        </header>

        <section className="grid gap-3 rounded-3xl bg-slate-950 p-4 text-white md:grid-cols-[1fr_auto]">
          <div><div className="text-xs font-black text-slate-400">{t("TEAM PERFORMANCE WINDOW", "فترة متابعة أداء الفريق")}</div><div className="mt-2 text-3xl font-black">{from} → {to}</div></div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs"><span className="mb-1 block text-slate-400">{t("From", "من")}</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl bg-white p-2 text-slate-950" /></label>
            <label className="text-xs"><span className="mb-1 block text-slate-400">{t("To", "إلى")}</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl bg-white p-2 text-slate-950" /></label>
          </div>
        </section>

        {error && <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <section className="mt-4 grid gap-3 md:grid-cols-4">
          <Card title={t("Team Calls", "مكالمات الفريق")} value={rows.reduce((a: number, r: any) => a + r.calls, 0)} />
          <Card title={t("Match Wins", "Matches مكسب")} value={rows.reduce((a: number, r: any) => a + r.wins, 0)} />
          <Card title="Warm Pipeline" value={rows.reduce((a: number, r: any) => a + r.warm, 0)} />
          <Card title={t("Sales Volume", "حجم المبيعات")} value={`EGP ${rows.reduce((a: number, r: any) => a + r.sales, 0).toLocaleString()}`} />
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((r: any) => {
            const body = <><div className="flex items-start justify-between gap-2"><div><div className="text-lg font-black">{lang === "ar" ? r.name_ar : r.name_en}</div><div className="mt-1 text-xs text-slate-500">{isOwner ? t("Open full dashboard", "افتح الداشبورد كاملة") : t("Performance summary", "ملخص الأداء")}</div></div><div className={`rounded-full px-2 py-1 text-xs font-black ${r.warm < 10 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>Warm {r.warm}</div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini label="Calls" value={r.calls} /><Mini label="W/L" value={`${r.wins}/${r.losses}`} /><Mini label="Hot" value={r.hot} /></div></>;
            return isOwner ? <button key={r.id} onClick={() => openAgent(r.slug)} disabled={Boolean(openingSlug)} className="rounded-2xl border bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">{body}</button> : <div key={r.id} className="rounded-2xl border bg-white p-4 shadow-sm">{body}</div>;
          })}
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b p-4"><h2 className="font-black">{t("Agent Scoreboard", "نتيجة الـAgents")}</h2><p className="text-xs text-slate-500">{isOwner ? t("Agent names open their full dashboards.", "اسم الـAgent يفتح الداشبورد الخاصة به.") : t("Read-only team progress view. No agent dashboard access.", "عرض متابعة فقط بدون صلاحية الدخول لداشبورد الـAgent.")}</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{[t("Agent", "Agent"), "Calls", "W/L", t("Win Rate", "نسبة الفوز"), "Warm", "Hot", "Potential", "Meetings", t("Overdue", "متأخر"), "Sales", ...(isOwner ? [t("Agent Dashboard", "داشبورد الـAgent")] : [])].map((x) => <th key={x} className="p-3 text-start font-black">{x}</th>)}</tr></thead>
              <tbody>{rows.map((r: any) => <tr key={r.id} className="border-t"><td className="p-3 font-black">{lang === "ar" ? r.name_ar : r.name_en}</td><td className="p-3 font-bold">{r.calls}</td><td className="p-3"><span className="font-black text-emerald-600">{r.wins}W</span> – <span className="font-black text-red-600">{r.losses}L</span></td><td className="p-3">{r.total ? Math.round((r.wins / r.total) * 100) : 0}%</td><td className={`p-3 font-black ${r.warm < 10 ? "text-red-600" : "text-emerald-600"}`}>{r.warm}{r.warm < 10 ? " 🚨" : ""}</td><td className="p-3 font-black">{r.hot}</td><td className="p-3">{r.potential}</td><td className="p-3">{r.meetings}</td><td className={`p-3 font-black ${r.overdue ? "text-red-600" : ""}`}>{r.overdue}</td><td className="p-3 font-black">EGP {r.sales.toLocaleString()}</td>{isOwner && <td className="p-3"><button onClick={() => openAgent(r.slug)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">{openingSlug === r.slug ? t("Opening…", "جاري الفتح…") : (lang === "ar" ? r.name_ar : r.name_en)}</button></td>}</tr>)}</tbody>
            </table>
          </div>
          {loading && <div className="p-3 text-xs text-slate-500">{t("Refreshing…", "جاري التحديث…")}</div>}
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border bg-white p-4">
            <h2 className="font-black">{t("Pipeline Alerts", "إنذارات الـPipeline")}</h2>
            <div className="mt-3 space-y-2">
              {rows.filter((r: any) => r.warm < 10).map((r: any) => isOwner ? <button key={r.id} onClick={() => openAgent(r.slug)} className="block w-full rounded-xl border border-red-200 bg-red-50 p-3 text-start text-sm hover:border-red-400"><b>🚨 {lang === "ar" ? r.name_ar : r.name_en}</b><div>Warm Pipeline {r.warm}/10</div></button> : <div key={r.id} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm"><b>🚨 {lang === "ar" ? r.name_ar : r.name_en}</b><div>Warm Pipeline {r.warm}/10</div></div>)}
              {!rows.some((r: any) => r.warm < 10) && <div className="text-sm text-slate-500">{t("No red alerts.", "مفيش إنذارات حمراء.")}</div>}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-4">
            <h2 className="font-black">{t("Add User", "إضافة User")}</h2>
            <div className="mt-3 grid gap-2"><input value={newAgent.name_en} onChange={(e) => setNewAgent({ ...newAgent, name_en: e.target.value })} placeholder="English name" className="rounded-xl border p-3" /><input value={newAgent.name_ar} onChange={(e) => setNewAgent({ ...newAgent, name_ar: e.target.value })} placeholder="الاسم بالعربي" className="rounded-xl border p-3" /><input value={newAgent.slug} onChange={(e) => setNewAgent({ ...newAgent, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="fixed-url-slug" className="rounded-xl border p-3" /><button onClick={addAgent} className="rounded-xl bg-slate-950 p-3 font-black text-white">{t("Create Agent URL", "إنشاء رابط Agent")}</button></div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value }: any) { return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-black text-slate-500">{title}</div><div className="mt-1 text-3xl font-black">{value}</div></div>; }
function Mini({ label, value }: any) { return <div className="rounded-xl bg-slate-50 p-2"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-1 text-base font-black">{value}</div></div>; }
