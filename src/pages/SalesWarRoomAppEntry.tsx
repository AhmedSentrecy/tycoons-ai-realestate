import { useNavigate } from 'react-router'

const agents = [
  { slug: 'ahmed-yehia', name: 'Ahmed Yehia', nameAr: 'أحمد يحيى' },
  { slug: 'nour-mohamed', name: 'Nour Mohamed', nameAr: 'نور محمد' },
  { slug: 'mostafa-amr', name: 'Mostafa Amr', nameAr: 'مصطفى عمرو' },
  { slug: 'ahmed-sentrecy', name: 'Ahmed Sentrecy', nameAr: 'أحمد سنتريسي' },
]

export default function SalesWarRoomAppEntry() {
  const navigate = useNavigate()
  const lang = (localStorage.getItem('warRoomLang') as 'en' | 'ar') || 'en'
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en)

  function openAgent(slug: string) {
    localStorage.setItem('warRoomLastAgent', slug)
    navigate(`/sales-war-room/a/${slug}`)
  }

  return (
    <main className="min-h-screen bg-[#f3f5f7] px-4 pb-10 pt-[max(24px,env(safe-area-inset-top))] text-slate-950" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mx-auto w-full max-w-lg">
        <header className="flex items-center gap-3 py-5">
          <img src="/images/logo.png" alt="Tycoons" className="h-12 w-12 rounded-2xl object-contain" />
          <div>
            <div className="text-[11px] font-black tracking-[.18em] text-emerald-700">TYCOONS</div>
            <h1 className="text-2xl font-black">Sales War Room</h1>
          </div>
        </header>

        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
          <div className="text-xs font-black tracking-[.14em] text-slate-400">{t('MOBILE COMMAND CENTER', 'مركز التحكم')}</div>
          <h2 className="mt-2 text-3xl font-black leading-tight">{t('Win the day. Protect the pipeline.', 'اكسب اليوم. واحمي الـPipeline.')}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{t('Calls, follow-ups, pipeline, Smart Match and team performance in one app.', 'المكالمات والمتابعات والـPipeline وSmart Match وأداء الفريق في تطبيق واحد.')}</p>
        </section>

        <section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-slate-400">{t('AGENT ACCESS', 'دخول الـAgent')}</div>
              <h3 className="text-lg font-black">{t('Choose your name', 'اختار اسمك')}</h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">SALES</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {agents.map(agent => (
              <button key={agent.slug} onClick={() => openAgent(agent.slug)} className="rounded-2xl border bg-slate-50 p-4 text-start transition active:scale-[.98]">
                <div className="font-black">{lang === 'ar' ? agent.nameAr : agent.name}</div>
                <div className="mt-1 text-xs font-bold text-slate-400">{t('Open my War Room', 'افتح الـWar Room بتاعتي')}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <button onClick={() => navigate('/sales-war-room/admin')} className="rounded-3xl bg-[#10261f] p-5 text-start text-white shadow-sm transition active:scale-[.98]">
            <div className="text-xs font-black tracking-[.12em] text-emerald-200">SUPER ADMIN</div>
            <div className="mt-2 text-xl font-black">{t('Super Admin', 'Super Admin')}</div>
            <div className="mt-1 text-xs text-emerald-100/70">{t('Full team control', 'تحكم كامل في الفريق')}</div>
          </button>
          <button onClick={() => navigate('/sales-war-room/manager')} className="rounded-3xl bg-slate-900 p-5 text-start text-white shadow-sm transition active:scale-[.98]">
            <div className="text-xs font-black tracking-[.12em] text-amber-300">MANAGER</div>
            <div className="mt-2 text-xl font-black">{t('Manager', 'Manager')}</div>
            <div className="mt-1 text-xs text-slate-300">{t('Manage sales team dashboards', 'إدارة داشبورد فريق المبيعات')}</div>
          </button>
          <button onClick={() => navigate('/sales-war-room/team-admin')} className="rounded-3xl border bg-white p-5 text-start shadow-sm transition active:scale-[.98] sm:col-span-2">
            <div className="text-xs font-black tracking-[.12em] text-amber-600">TEAM ADMIN</div>
            <div className="mt-2 text-xl font-black">{t('Team Dashboard', 'Team Dashboard')}</div>
            <div className="mt-1 text-xs text-slate-500">{t('Team performance monitoring', 'متابعة أداء الفريق')}</div>
          </button>
        </section>

        <p className="mt-6 text-center text-[11px] font-bold text-slate-400">Tycoons Sales War Room · Native App</p>
      </div>
    </main>
  )
}
