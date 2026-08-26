import { useEffect, useMemo, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

type Mode = "owner" | "admin";

const stages = ["New Lead","Contacted","Cold","Warm","Hot / Very Potential","Hold","Meeting Scheduled","Meeting Held","Negotiation / Closing","Won","Lost / Dead"];
const stageAr: Record<string,string> = {
  "New Lead":"ليد جديد","Contacted":"تم التواصل","Cold":"Cold","Warm":"Warm","Hot / Very Potential":"Hot / قوي جدًا","Hold":"Hold","Meeting Scheduled":"ميعاد متحدد","Meeting Held":"تم الاجتماع","Negotiation / Closing":"تفاوض / Closing","Won":"مكسب","Lost / Dead":"خسارة / Dead"
};

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return fmt(d);
};
const money = (n: number) => n >= 1_000_000_000 ? `EGP ${(n / 1_000_000_000).toFixed(1)}B` : n >= 1_000_000 ? `EGP ${(n / 1_000_000).toFixed(1)}M` : `EGP ${Math.round(n).toLocaleString()}`;

export default function SalesWarRoomManagement({ mode }: { mode: Mode }) {
  const isOwner = mode === "owner";
  const tokenKey = isOwner ? "warRoomAdminToken" : "warRoomLimitedAdminToken";
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || "");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(fmt(new Date()));
  const [data, setData] = useState<any>(null);
  const [ownerPipeline,setOwnerPipeline] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openingSlug, setOpeningSlug] = useState("");
  const [newAgent, setNewAgent] = useState({ name_en: "", name_ar: "", slug: "" });
  const [leadAgentFilter,setLeadAgentFilter] = useState("all");
  const [leadStageFilter,setLeadStageFilter] = useState("all");
  const [editingLeadId,setEditingLeadId] = useState("");
  const [leadDraft,setLeadDraft] = useState<any>(null);
  const [savingLead,setSavingLead] = useState(false);
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
      if(isOwner){
        const [summary,fullPipeline]=await Promise.all([
          salesWarRoomApi.adminSummary(token, from, to),
          salesWarRoomApi.getOwnerPipeline(token),
        ]);
        setData(summary);
        setOwnerPipeline(fullPipeline.pipeline||[]);
      }else{
        setData(await salesWarRoomApi.adminSummary(token, from, to));
        setOwnerPipeline([]);
      }
    } catch (e: any) {
      if (e.message === "unauthorized" || e.message === "owner_only") {
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

  function startLeadEdit(x:any){
    if(!isOwner)return;
    setEditingLeadId(x.id);
    setLeadDraft({
      id:x.id,
      client_name:x.client_name||"",
      phone:x.phone||"",
      budget:x.budget||"",
      stage:x.stage||"New Lead",
      expected_sale_m:x.expected_value ? String(Number(x.expected_value)/1_000_000) : "",
      next_action:x.next_action||"",
      next_action_date:x.next_action_date||"",
      next_action_trigger:x.next_action_trigger||"",
      notes:x.notes||"",
    });
  }

  function cancelLeadEdit(){setEditingLeadId("");setLeadDraft(null)}

  async function saveOwnerLead(){
    if(!isOwner||!leadDraft||savingLead)return;
    if(!String(leadDraft.client_name||"").trim())return setError(t("Client name is required.","اسم العميل مطلوب."));
    if(leadDraft.stage==="Warm"&&(!String(leadDraft.next_action||"").trim()||(!leadDraft.next_action_date&&!String(leadDraft.next_action_trigger||"").trim()))){
      return setError(t("Warm requires Next Action plus a Date or Trigger.","Warm لازم يكون له Next Action ومعاه Date أو Trigger."));
    }
    const m=Number(leadDraft.expected_sale_m||0);
    if(!Number.isFinite(m)||m<0)return setError(t("Expected Sale must be a valid positive number.","Expected Sale لازم يكون رقم صحيح موجب."));
    try{
      setSavingLead(true);setError("");
      await salesWarRoomApi.ownerUpdateLead(token,{
        id:leadDraft.id,
        client_name:leadDraft.client_name,
        phone:leadDraft.phone,
        budget:leadDraft.budget,
        stage:leadDraft.stage,
        expected_value:m*1_000_000,
        next_action:leadDraft.next_action,
        next_action_date:leadDraft.next_action_date||null,
        next_action_trigger:leadDraft.next_action_trigger,
        notes:leadDraft.notes,
      });
      cancelLeadEdit();
      await load();
    }catch(e:any){setError(e.message==="owner_only"?t("Owner permission required.","الصلاحية دي للـOwner فقط."):e.message)}
    finally{setSavingLead(false)}
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

  const ownerLeads = useMemo(()=>{
    if(!data?.agents)return [];
    return ownerPipeline
      .filter((p:any)=>leadAgentFilter==="all"||p.agent_id===leadAgentFilter)
      .filter((p:any)=>leadStageFilter==="all"||p.stage===leadStageFilter)
      .map((p:any)=>({
        ...p,
        agent:data.agents.find((a:any)=>a.id===p.agent_id),
      }))
      .sort((a:any,b:any)=>{
        const pr=(x:any)=>x.stage==="Hot / Very Potential"?0:x.stage==="Warm"?1:x.stage==="Negotiation / Closing"?2:x.stage==="Meeting Scheduled"?3:4;
        return pr(a)-pr(b)||String(a.next_action_date||"9999").localeCompare(String(b.next_action_date||"9999"));
      });
  },[ownerPipeline,data,leadAgentFilter,leadStageFilter]);

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

        {isOwner && <section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
            <div><h2 className="text-lg font-black">{t("Owner Pipeline Editor","تعديل الـPipeline للـOwner")}</h2><p className="text-xs text-slate-500">{t("Edit any lead directly without opening the agent dashboard.","عدّل أي Lead مباشرة من غير ما تفتح داشبورد الـAgent.")}</p></div>
            <div className="flex flex-wrap gap-2">
              <select value={leadAgentFilter} onChange={e=>setLeadAgentFilter(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">
                <option value="all">{t("All Agents","كل الـAgents")}</option>
                {(data?.agents||[]).map((a:any)=><option key={a.id} value={a.id}>{lang==="ar"?a.name_ar:a.name_en}</option>)}
              </select>
              <select value={leadStageFilter} onChange={e=>setLeadStageFilter(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">
                <option value="all">{t("All Stages","كل المراحل")}</option>
                {stages.map(s=><option key={s} value={s}>{lang==="ar"?stageAr[s]:s}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {ownerLeads.map((x:any)=>editingLeadId===x.id&&leadDraft ? <div key={x.id} className="rounded-2xl border-2 border-slate-400 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between"><div><div className="font-black">✏️ {t("Edit Lead","تعديل Lead")} — {x.client_name}</div><div className="text-xs text-slate-500">{lang==="ar"?x.agent?.name_ar:x.agent?.name_en}</div></div><button onClick={cancelLeadEdit} className="rounded-lg border bg-white px-3 py-2 text-xs font-black">{t("Cancel","إلغاء")}</button></div>
              <div className="grid gap-2 md:grid-cols-4">
                <input value={leadDraft.client_name} onChange={e=>setLeadDraft({...leadDraft,client_name:e.target.value})} placeholder={t("Client name","اسم العميل")} className="rounded-xl border bg-white p-3"/>
                <input value={leadDraft.phone} onChange={e=>setLeadDraft({...leadDraft,phone:e.target.value})} placeholder={t("Phone","الموبايل")} className="rounded-xl border bg-white p-3"/>
                <input value={leadDraft.budget} onChange={e=>setLeadDraft({...leadDraft,budget:e.target.value})} placeholder={t("Budget","الميزانية")} className="rounded-xl border bg-white p-3"/>
                <select value={leadDraft.stage} onChange={e=>setLeadDraft({...leadDraft,stage:e.target.value})} className="rounded-xl border bg-white p-3 font-bold">{stages.map(s=><option key={s} value={s}>{lang==="ar"?stageAr[s]:s}</option>)}</select>
                <label className="text-xs font-black text-slate-500">{t("Expected Sale (M EGP)","Expected Sale بالمليون")}<input type="number" min="0" step="0.1" value={leadDraft.expected_sale_m} onChange={e=>setLeadDraft({...leadDraft,expected_sale_m:e.target.value})} className="mt-1 w-full rounded-xl border bg-white p-3 text-slate-950"/></label>
                <input value={leadDraft.next_action} onChange={e=>setLeadDraft({...leadDraft,next_action:e.target.value})} placeholder={t("Next Action","الخطوة الجاية")} className="rounded-xl border bg-white p-3 md:col-span-2"/>
                <label className="text-xs font-black text-slate-500">{t("Follow-up Date","تاريخ المتابعة")}<input type="date" value={leadDraft.next_action_date} onChange={e=>setLeadDraft({...leadDraft,next_action_date:e.target.value})} className="mt-1 w-full rounded-xl border bg-white p-3 text-slate-950"/></label>
                <input value={leadDraft.next_action_trigger} onChange={e=>setLeadDraft({...leadDraft,next_action_trigger:e.target.value})} placeholder={t("Trigger","Trigger")} className="rounded-xl border bg-white p-3"/>
                <textarea value={leadDraft.notes} onChange={e=>setLeadDraft({...leadDraft,notes:e.target.value})} placeholder={t("Full feedback / notes","الفيدباك كامل / الملاحظات")} className="min-h-[100px] rounded-xl border bg-white p-3 md:col-span-3"/>
                <button disabled={savingLead} onClick={saveOwnerLead} className="rounded-xl bg-slate-950 p-3 font-black text-white disabled:opacity-50">{savingLead?t("Saving…","جاري الحفظ…"):t("Save Changes","حفظ التعديل")}</button>
              </div>
            </div> : <div key={x.id} className="grid gap-3 rounded-2xl border bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
              <div><div className="font-black">{x.client_name}</div><div className="mt-1 text-xs font-bold text-slate-500">{lang==="ar"?x.agent?.name_ar:x.agent?.name_en}</div></div>
              <div className="text-xs"><div className="font-black">{lang==="ar"?stageAr[x.stage]:x.stage}</div><div className="mt-1 text-slate-500">{x.phone||t("No phone","بدون رقم")}</div></div>
              <div className="text-xs"><div><b>{t("Expected","متوقع")}:</b> {money(Number(x.expected_value||0))}</div><div className="mt-1 text-slate-500"><b>{t("Next","التالي")}:</b> {x.next_action||"—"} {x.next_action_date?`· ${x.next_action_date}`:""}</div></div>
              <button onClick={()=>startLeadEdit(x)} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">✏️ {t("Edit","تعديل")}</button>
            </div>)}
            {!ownerLeads.length&&<div className="rounded-2xl border border-dashed p-8 text-center text-sm font-bold text-slate-400">{t("No leads match these filters.","مفيش Leads مطابقة للفلاتر دي.")}</div>}
          </div>
        </section>}

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
