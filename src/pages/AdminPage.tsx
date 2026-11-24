import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_TOKEN_KEY,
  AdminApiError,
  adminApi,
  errorMessage,
  formatBytes,
  hideLegacyDuplicates,
  type AdminProject,
  type AdminSettings,
  type AdminUser,
  type MediaFields,
  type StorageUsage,
} from "../lib/adminApi";
import { AdminContext } from "../components/admin/AdminContext";
import AgentUsageTab from "../components/admin/AgentUsageTab";
import WhatsAppClicksTab from "../components/admin/WhatsAppClicksTab";
import WhatsAppInboxTab from "../components/admin/WhatsAppInboxTab";
import ProjectUpdatesTab from "../components/admin/ProjectUpdatesTab";
import ApprovalsTab from "../components/admin/ApprovalsTab";
import ArticlesTab from "../components/admin/ArticlesTab";
import HomepageLaunchesTab from "../components/admin/HomepageLaunchesTab";
import DevelopersTab from "../components/admin/DevelopersTab";
import InventorySummary from "../components/admin/InventorySummary";
import ProjectsTab from "../components/admin/ProjectsTab";
import ProjectForm, { type NewProject } from "../components/admin/ProjectForm";
import MediaTab from "../components/admin/MediaTab";
import ProjectFaqTab from "../components/admin/ProjectFaqTab";
import SettingsDialog from "../components/admin/SettingsDialog";
import UnitsTab from "../components/admin/UnitsTab";
import UsersTab from "../components/admin/UsersTab";

const FREE_STORAGE_BYTES = 1024 * 1024 * 1024;

function readToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function writeToken(token: string) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // private mode: the session just won't persist
  }
}

export default function AdminPage() {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(Boolean(readToken()));

  useEffect(() => {
    document.title = "لوحة التحكم | Tycoons";
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  }, []);

  const [resumeFailed, setResumeFailed] = useState(false);
  const [resumeAttempt, setResumeAttempt] = useState(0);

  // Resume a stored session without asking for the password again. Only a real
  // "session invalid" answer (401) clears the token; a network blip, a laptop
  // waking from sleep or a slow server just retries, so the admin stays signed in.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
        try {
          const data = await adminApi.me(token);
          if (cancelled) return;
          setUser(data.user);
          setChecking(false);
          return;
        } catch (error) {
          if (cancelled) return;
          if (error instanceof AdminApiError && error.status === 401) {
            writeToken("");
            setToken("");
            setChecking(false);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
      if (!cancelled) {
        setResumeFailed(true);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, resumeAttempt]);

  const signOut = useCallback(() => {
    const current = readToken();
    writeToken("");
    setToken("");
    setUser(null);
    if (current) void adminApi.logout(current).catch(() => undefined);
  }, []);

  if (token && checking) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-[#060f1c] text-white">
        <p className="font-bold">جاري الدخول…</p>
      </main>
    );
  }

  if (token && !user && resumeFailed) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-[#060f1c] p-6 text-center text-white">
        <div>
          <p className="font-bold">في مشكلة في الاتصال بالسيرفر. إنت لسه مسجل دخول.</p>
          <button
            onClick={() => {
              setChecking(true);
              setResumeFailed(false);
              setResumeAttempt((value) => value + 1);
            }}
            className="mt-4 rounded-full bg-[#f0bd4f] px-5 py-2 font-black text-[#060f1c]"
          >
            حاول تاني
          </button>
        </div>
      </main>
    );
  }

  if (!token || !user) {
    return (
      <LoginScreen
        onLogin={(nextToken, nextUser) => {
          writeToken(nextToken);
          setToken(nextToken);
          setUser(nextUser);
          setChecking(false);
        }}
      />
    );
  }

  return <Dashboard token={token} user={user} onSignOut={signOut} />;
}

function LoginScreen({ onLogin }: { onLogin: (token: string, user: AdminUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!username || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await adminApi.login(username.trim().toLowerCase(), password);
      onLogin(result.token, result.user);
    } catch (loginError) {
      setError(errorMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-[#060f1c] p-4 text-white">
      <form
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="mb-6 flex items-center gap-3">
          <img src="/images/logo.png" alt="Tycoons" className="h-11 w-11 rounded-xl object-contain" />
          <div>
            <p className="text-xs font-black tracking-[.18em] text-[#f0bd4f]">TYCOONS ADMIN</p>
            <h1 className="text-2xl font-black">لوحة التحكم</h1>
          </div>
        </div>
        <label className="mb-2 block text-sm font-bold text-white/70" htmlFor="admin-username">
          اسم المستخدم
        </label>
        <input
          id="admin-username"
          dir="ltr"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-white outline-none focus:border-[#f0bd4f]"
        />
        <label className="mb-2 mt-4 block text-sm font-bold text-white/70" htmlFor="admin-password">
          كلمة السر
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-white outline-none focus:border-[#f0bd4f]"
        />
        <button
          type="submit"
          disabled={busy || !username || !password}
          className="mt-5 w-full rounded-xl bg-[#f0bd4f] p-3 font-black text-[#060f1c] disabled:opacity-50"
        >
          {busy ? "جاري الدخول…" : "دخول"}
        </button>
        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
      </form>
    </main>
  );
}

type Tab = "projects" | "media" | "units" | "developers" | "launches" | "articles" | "faq" | "approvals" | "users" | "agents" | "whatsapp" | "wainbox" | "waupdates";

/**
 * The admin tabs in 4 groups, so related pages sit next to each other and the bar never needs a
 * sideways scroll: المشاريع (project, its updates, launches, FAQ) · الوحدات · المحتوى والـ SEO · المتابعة.
 * The top row picks the group, the second row the page inside it.
 */
const NAV_GROUPS: { label: string; tabs: { tab: Tab; label: string; ownerOnly?: boolean }[] }[] = [
  { label: "المشاريع", tabs: [
    { tab: "projects", label: "المشاريع" },
    { tab: "waupdates", label: "تحديثات المشاريع" },
    { tab: "launches", label: "بتتطرح دلوقتي" },
    { tab: "faq", label: "أسئلة المشاريع" },
  ] },
  { label: "الوحدات", tabs: [
    { tab: "units", label: "الوحدات" },
    { tab: "wainbox", label: "وحدات واتساب" },
  ] },
  { label: "المحتوى والـ SEO", tabs: [
    { tab: "articles", label: "المقالات" },
    { tab: "developers", label: "المطورين — SEO" },
    { tab: "media", label: "الصور والميديا" },
  ] },
  { label: "المتابعة", tabs: [
    { tab: "approvals", label: "سجل التعديلات" },
    { tab: "whatsapp", label: "دوسات الواتساب", ownerOnly: true },
    { tab: "agents", label: "استخدام الـ AI", ownerOnly: true },
    { tab: "users", label: "المستخدمين", ownerOnly: true },
  ] },
];

function AdminNav({ tab, setTab, isOwner, pendingTotal }: { tab: Tab; setTab: (tab: Tab) => void; isOwner: boolean; pendingTotal: number }) {
  const groups = NAV_GROUPS.map((group) => ({ ...group, tabs: group.tabs.filter((item) => isOwner || !item.ownerOnly) }));
  const active = groups.find((group) => group.tabs.some((item) => item.tab === tab)) ?? groups[0];
  const badge = (item: Tab) => (item === "approvals" && isOwner && pendingTotal > 0 ? pendingTotal : 0);
  return (
    <nav className="border-t border-white/10 bg-[#0b1b30]">
      <div className="mx-auto flex max-w-[1720px] flex-wrap gap-1.5 px-4 pt-2">
        {groups.map((group) => {
          const on = group === active;
          const count = group.tabs.reduce((sum, item) => sum + badge(item.tab), 0);
          return (
            <button
              key={group.label}
              onClick={() => setTab(group.tabs[0].tab)}
              className={`rounded-t-2xl px-4 py-2 text-sm font-black transition ${on ? "bg-[#f4f6fa] text-[#0b1b30]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
            >
              {group.label}
              {count > 0 && <span className="ms-1.5 rounded-full bg-[#ff5a36] px-1.5 py-0.5 text-[10px] text-white">{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="bg-[#f4f6fa]">
        <div className="mx-auto flex max-w-[1720px] flex-wrap gap-1.5 px-4 py-2">
          {active.tabs.map((item) => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${tab === item.tab ? "bg-[#0b1b30] text-white shadow-sm" : "text-[#334155] hover:bg-white"}`}
            >
              {item.label}
              {badge(item.tab) > 0 && <span className="ms-1.5 rounded-full bg-[#ff5a36] px-1.5 py-0.5 text-[10px] text-white">{badge(item.tab)}</span>}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Dashboard({ token, user, onSignOut }: { token: string; user: AdminUser; onSignOut: () => void }) {
  const isOwner = user.role === "owner";
  const [tab, setTab] = useState<Tab>("projects");
  // "اكتب المقال" from the projects tab: open the articles tab on that project.
  const [articleFocus, setArticleFocus] = useState<string | null>(null);
  const writeArticle = (projectId: string) => {
    setArticleFocus(projectId);
    setTab("articles");
  };
  const [projects, setProjects] = useState<AdminProject[]>([]);
  // Media and units never show old duplicate rows; articles get the full list so
  // their auto-fix can move a draft from a duplicate to the project with a page.
  const visibleProjects = useMemo(() => hideLegacyDuplicates(projects), [projects]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const notify = useCallback((text: string, tone: "ok" | "error" = "ok") => setNotice({ text, tone }), []);

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof AdminApiError && error.status === 401) {
        // Double-check before signing out: one stray 401 must not end the session.
        adminApi
          .me(token)
          .then(() => notify("حصلت مشكلة مؤقتة، جرّب تاني.", "error"))
          .catch((check) => {
            if (check instanceof AdminApiError && check.status === 401) onSignOut();
            else notify("في مشكلة في الاتصال بالسيرفر. جرّب تاني.", "error");
          });
        return;
      }
      notify(errorMessage(error), "error");
    },
    [token, onSignOut, notify],
  );

  const load = useCallback(
    () =>
      Promise.all([adminApi.projects(token), adminApi.settings(token)])
        .then(([data, currentSettings]) => {
          setProjects(data.projects);
          setStorage(data.storage);
          setPendingTotal(data.pending_total);
          setSettings(currentSettings);
          setLoadError("");
        })
        .catch(handleError)
        .finally(() => setLoading(false)),
    [token, handleError],
  );

  function refresh() {
    setLoading(true);
    void load();
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const context = useMemo(
    () => ({ token, user, isOwner, notify, handleError, refreshPending: () => void load() }),
    [token, user, isOwner, notify, handleError, load],
  );

  /** Creating a project applies immediately (every admin change does) and shows in the change log. */
  async function createProject(values: NewProject) {
    setCreatingProject(true);
    try {
      const result = await adminApi.projectCreate(token, values);
      setProjectFormOpen(false);
      if (result.applied) {
        notify(`اتضاف ${values.name}. ارفعله الصور وضيف وحداته`);
        const data = await adminApi.projects(token);
        setProjects(data.projects);
        setStorage(data.storage);
        setPendingTotal(data.pending_total);
        const created = data.projects.find(
          (project) => project.name === values.name.trim() && project.area_group === values.area_group,
        );
        if (created) setSelectedId(created.id);
      } else {
        void load();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setCreatingProject(false);
    }
  }

  async function rebuild() {
    if (!settings?.has_build_hook) {
      setSettingsOpen(true);
      return;
    }
    try {
      setSettings(await adminApi.rebuild(token));
      notify("بدأ تحديث الموقع. الصفحات هتتحدث خلال 5-10 دقايق");
    } catch (error) {
      handleError(error);
    }
  }

  const usedRatio = storage ? Math.min(1, storage.bytes / FREE_STORAGE_BYTES) : 0;

  return (
    <AdminContext.Provider value={context}>
      <main dir="rtl" className="min-h-screen bg-[#f4f6fa] text-[#0f1724]">
        <header className="sticky top-0 z-30 border-b border-[#060f1c]/10 bg-[#060f1c] text-white">
          <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-3 px-4 py-3">
            <img src="/images/logo.png" alt="Tycoons" className="h-9 w-9 rounded-lg object-contain" />
            <div className="me-auto">
              <p className="text-[11px] font-black tracking-[.18em] text-[#f0bd4f]">TYCOONS ADMIN</p>
              <h1 className="text-lg font-black leading-tight">
                لوحة التحكم <span className="text-xs font-bold text-white/60">· {user.display_name || user.username}</span>
              </h1>
            </div>
            {storage && (
              <div className="hidden min-w-44 sm:block" title={`${storage.objects} ملف`}>
                <div className="flex justify-between text-[11px] font-bold text-white/70">
                  <span>مساحة التخزين</span>
                  <span dir="ltr">{formatBytes(storage.bytes)} / 1 GB</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className={`h-full rounded-full ${usedRatio > 0.85 ? "bg-red-400" : "bg-[#f0bd4f]"}`}
                    style={{ width: `${Math.max(2, usedRatio * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <button onClick={() => void rebuild()} className="rounded-full bg-[#f0bd4f] px-4 py-2 text-sm font-black text-[#060f1c]">
              حدّث الموقع
            </button>
            {isOwner && (
              <button onClick={() => setSettingsOpen(true)} className="rounded-full border border-white/25 px-3 py-2 text-sm font-bold">
                الإعدادات
              </button>
            )}
            <button onClick={onSignOut} className="rounded-full border border-white/25 px-3 py-2 text-sm font-bold">
              خروج
            </button>
          </div>
          <AdminNav tab={tab} setTab={setTab} isOwner={isOwner} pendingTotal={pendingTotal} />
        </header>

        {notice && (
          <div
            role="status"
            className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-bold shadow-xl ${
              notice.tone === "ok" ? "bg-[#060f1c] text-white" : "bg-red-600 text-white"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="mx-auto max-w-[1720px] px-4 py-4">
          <InventorySummary projects={projects} />
          {tab === "projects" && <ProjectsTab projects={projects} onChanged={refresh} onWriteArticle={writeArticle} />}
          {tab === "developers" && <DevelopersTab />}
          {tab === "media" && (
            <MediaTab
              projects={visibleProjects}
              loading={loading}
              error={loadError}
              onRetry={refresh}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCreateProject={() => setProjectFormOpen(true)}
              onProjectSaved={(id, values: Omit<MediaFields, "id">) =>
                setProjects((current) => current.map((project) => (project.id === id ? { ...project, ...values } : project)))
              }
            />
          )}
          {tab === "units" && (
            <UnitsTab
              projects={visibleProjects}
              loading={loading}
              error={loadError}
              onRetry={refresh}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCreateProject={() => setProjectFormOpen(true)}
            />
          )}
          {tab === "wainbox" && (
            <WhatsAppInboxTab
              projects={projects}
              onChanged={refresh}
              onOpenPhotos={(projectId) => {
                setSelectedId(projectId);
                setTab("media");
              }}
            />
          )}
          {tab === "waupdates" && <ProjectUpdatesTab projects={projects} onChanged={refresh} />}
          {tab === "launches" && <HomepageLaunchesTab projects={projects} />}
          {tab === "articles" && <ArticlesTab projects={projects} focusProjectId={articleFocus} onFocusHandled={() => setArticleFocus(null)} />}
          {tab === "faq" && <ProjectFaqTab projects={projects} />}
          {tab === "approvals" && <ApprovalsTab onChanged={refresh} pendingTotal={pendingTotal} />}
          {tab === "users" && isOwner && <UsersTab />}
          {tab === "agents" && isOwner && <AgentUsageTab />}
          {tab === "whatsapp" && isOwner && <WhatsAppClicksTab />}
        </div>

        {projectFormOpen && (
          <ProjectForm projects={projects} busy={creatingProject} onCancel={() => setProjectFormOpen(false)} onSubmit={(values) => void createProject(values)} />
        )}

        {settingsOpen && (
          <SettingsDialog
            token={token}
            settings={settings}
            onClose={() => setSettingsOpen(false)}
            onSaved={(next) => {
              setSettings(next);
              setSettingsOpen(false);
              notify("اتحفظ رابط التحديث");
            }}
            onError={handleError}
          />
        )}
      </main>
    </AdminContext.Provider>
  );
}
