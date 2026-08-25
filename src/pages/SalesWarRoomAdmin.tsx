import { useEffect, useMemo, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return fmt(d);
};

export default function SalesWarRoomAdmin() {
  const [token, setToken] = useState(localStorage.getItem("warRoomAdminToken") || "");
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
    document.title = "Tycoons Sales War Room Admin";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex,nofollow,noarchive";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token, from, to]);

  async function login() {
    try {
      setError("");
      const r = await salesWarRoomApi.adminLogin(password);
      localStorage.setItem("warRoomAdminToken", r.token);
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
        localStorage.removeItem("warRoomAdminToken");
        setToken("");
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openAgent(slug: string) {
    if (openingSlug) return;
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
      if (e.message === "unauthorized") {
        localStorage.removeItem("warRoomAdminToken");
        setToken("");
      }
      setError(e.message);
    } finally {
      setOpeningSlug("");
    }
  }

  async function addAgent() {
    if (!newAgent.name_en || !newAgent.slug) return;
    try {
      const r = await salesWarRoomApi.addAdminAgent(token, newAgent);
      setNewAgent({ name_en: "", name_ar: "", slug: "" });
      if (r.password) {
        alert(`${t("New agent password", "باسورد الـAgent الجديد")}: ${r.password}`);
      }
      load();
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
      let calls = 0;
      let wins = 0;
      let losses = 0;
      let potential = 0;
      let meetings = 0;
      let sales = 0;

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

      const warm = pipe.filter((p: any) => p.stage === "Warm").length;
      const hot = pipe.filter((p: any) => p.stage === "Hot / Very Potential").length;
      return {
        ...a,
        calls,
        wins,
        losses,
        total: wins + losses,
        potential,
        meetings,
        sales,
        warm,
        hot,
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
              <div className="text-xs font-black tracking-[.18em] text-slate-400">TYCOONS</div>
              <h1 className="text-2xl font-black">{t("War Room Admin", "إدارة غرفة العمليات")}</h1>
            </div>
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-full border border-white/20 px-3 py-2 text-xs font-black">
              {lang === "ar" ? "EN" : "عربي"}
            </button>
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder={t("Admin password", "كلمة سر الأدمن")} className="w-full rounded-xl border border-white/10 bg-white/10 p-3 outline-none" />
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
            <h1 className="text-2xl font-black">{t("Admin Dashboard", "لوحة تحكم الأدمن")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-full border bg-white px-4 py-2 text-sm font-black">{lang === "ar" ? "EN" : "عربي"}</button>
            <button onClick={() => { localStorage.removeItem("warRoomAdminToken"); setToken(""); }} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">{t("Logout", "خروج")}</button>
          </div>
        </header>

        <section className="grid gap-3 rounded-3xl bg-slate-950 p-4 text-white md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs font-black text-slate-400">{t("TEAM PERFORMANCE WINDOW", "فترة متابعة أداء الفريق")}</div>
            <div className="mt-2 text-3xl font-black">{from} → {to}</div>
          </div>
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

        <section className="mt-4">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-black">{t("Agent Quick Access", "دخول سريع للـAgents")}</h2>
              <p className="text-xs text-slate-500">{t("Click any agent card to open the full dashboard without entering the agent password.", "اضغط على أي Agent علشان تفتح الداشبورد كاملة من غير باسورد الـAgent.")}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((r: any) => (
              <button key={r.id} onClick={() => openAgent(r.slug)} disabled={Boolean(openingSlug)} className="group rounded-2xl border bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md disabled:opacity-60">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-black group-hover:underline">{lang === "ar" ? r.name_ar : r.name_en}</div>
                    <div className="mt-1 text-xs text-slate-500">{openingSlug === r.slug ? t("Opening…", "جاري الفتح…") : t("Open full dashboard →", "افتح الداشبورد كاملة ←")}</div>
                  </div>
                  <div className={`rounded-full px-2 py-1 text-xs font-black ${r.warm < 10 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>Warm {r.warm}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini label={t("Calls", "Calls")} value={r.calls} />
                  <Mini label="W/L" value={`${r.wins}/${r.losses}`} />
                  <Mini label="Hot" value={r.hot} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-black">{t("Agent Scoreboard", "نتيجة الـAgents")}</h2>
            <p className="text-xs text-slate-500">{t("Every row is clickable — open any agent to inspect the full scoreboard and pipeline.", "كل صف قابل للضغط — افتح أي Agent لمراجعة الـScoreboard والـPipeline كاملة.")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>{[t("Agent", "Agent"), t("Calls", "Calls"), "W/L", t("Win Rate", "نسبة الفوز"), "Warm", "Hot", "Potential", "Meetings", t("Overdue", "متأخر"), "Sales", t("Open", "فتح")].map((x) => <th key={x} className="p-3 text-start font-black">{x}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} onClick={() => openAgent(r.slug)} className="cursor-pointer border-t transition hover:bg-slate-50">
                    <td className="p-3 font-black"><span className="underline decoration-slate-300 underline-offset-4">{lang === "ar" ? r.name_ar : r.name_en}</span></td>
                    <td className="p-3 font-bold">{r.calls}</td>
                    <td className="p-3"><span className="font-black text-emerald-600">{r.wins}W</span> – <span className="font-black text-red-600">{r.losses}L</span></td>
                    <td className="p-3">{r.total ? Math.round((r.wins / r.total) * 100) : 0}%</td>
                    <td className={`p-3 font-black ${r.warm < 10 ? "text-red-600" : "text-emerald-600"}`}>{r.warm}{r.warm < 10 ? " 🚨" : ""}</td>
                    <td className="p-3 font-black">{r.hot}</td>
                    <td className="p-3">{r.potential}</td>
                    <td className="p-3">{r.meetings}</td>
                    <td className={`p-3 font-black ${r.overdue ? "text-red-600" : ""}`}>{r.overdue}</td>
                    <td className="p-3 font-black">EGP {r.sales.toLocaleString()}</td>
                    <td className="p-3"><span className="inline-block rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">{openingSlug === r.slug ? t("Opening…", "جاري…") : t("Open Dashboard", "فتح الداشبورد")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <div className="p-3 text-xs text-slate-500">{t("Refreshing…", "جاري التحديث…")}</div>}
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border bg-white p-4">
            <h2 className="font-black">{t("Pipeline Alerts", "إنذارات الـPipeline")}</h2>
            <div className="mt-3 space-y-2">
              {rows.filter((r: any) => r.warm < 10).map((r: any) => (
                <button key={r.id} onClick={() => openAgent(r.slug)} className="block w-full rounded-xl border border-red-200 bg-red-50 p-3 text-start text-sm hover:border-red-400">
                  <b>🚨 {lang === "ar" ? r.name_ar : r.name_en}</b>
                  <div>{t(`Warm Pipeline ${r.warm}/10 — click to open.`, `Warm Pipeline ${r.warm}/10 — اضغط للفتح.`)}</div>
                </button>
              ))}
              {!rows.some((r: any) => r.warm < 10) && <div className="text-sm text-slate-500">{t("No red alerts.", "مفيش إنذارات حمراء.")}</div>}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-4">
            <h2 className="font-black">{t("Add User", "إضافة User")}</h2>
            <div className="mt-3 grid gap-2">
              <input value={newAgent.name_en} onChange={(e) => setNewAgent({ ...newAgent, name_en: e.target.value })} placeholder="English name" className="rounded-xl border p-3" />
              <input value={newAgent.name_ar} onChange={(e) => setNewAgent({ ...newAgent, name_ar: e.target.value })} placeholder="الاسم بالعربي" className="rounded-xl border p-3" />
              <input value={newAgent.slug} onChange={(e) => setNewAgent({ ...newAgent, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="fixed-url-slug" className="rounded-xl border p-3" />
              <button onClick={addAgent} className="rounded-xl bg-slate-950 p-3 font-black text-white">{t("Create Agent URL", "إنشاء رابط Agent")}</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value }: any) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-black text-slate-500">{title}</div><div className="mt-1 text-3xl font-black">{value}</div></div>;
}

function Mini({ label, value }: any) {
  return <div className="rounded-xl bg-slate-50 p-2"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-1 text-base font-black">{value}</div></div>;
}
