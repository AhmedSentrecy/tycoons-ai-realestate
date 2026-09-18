import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_TOKEN_KEY,
  AdminApiError,
  adminApi,
  errorMessage,
  formatBytes,
  type AdminProject,
  type AdminSettings,
  type AdminUser,
  type MediaFields,
  type StorageUsage,
} from "../lib/adminApi";
import { AdminContext } from "../components/admin/AdminContext";
import ApprovalsTab from "../components/admin/ApprovalsTab";
import MediaTab from "../components/admin/MediaTab";
import SettingsDialog from "../components/admin/SettingsDialog";
import UnitsTab from "../components/admin/UnitsTab";
import UsersTab from "../components/admin/UsersTab";
import { Badge, TabButton } from "../components/admin/ui";

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

  // Resume a stored session without asking for the password again.
  useEffect(() => {
    if (!token) return;
    adminApi
      .me(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        writeToken("");
        setToken("");
      })
      .finally(() => setChecking(false));
  }, [token]);

  const signOut = useCallback(() => {
    const current = readToken();
    writeToken("");
    setToken("");
    setUser(null);
    if (current) void adminApi.logout(current).catch(() => undefined);
  }, []);

  if (token && checking) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-[#0d1f18] text-white">
        <p className="font-bold">جاري الدخول…</p>
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
    <main dir="rtl" className="grid min-h-screen place-items-center bg-[#0d1f18] p-4 text-white">
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
            <p className="text-xs font-black tracking-[.18em] text-[#d9b87c]">TYCOONS ADMIN</p>
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
          className="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-white outline-none focus:border-[#d9b87c]"
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
          className="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-white outline-none focus:border-[#d9b87c]"
        />
        <button
          type="submit"
          disabled={busy || !username || !password}
          className="mt-5 w-full rounded-xl bg-[#d9b87c] p-3 font-black text-[#0d1f18] disabled:opacity-50"
        >
          {busy ? "جاري الدخول…" : "دخول"}
        </button>
        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
      </form>
    </main>
  );
}

type Tab = "media" | "units" | "approvals" | "users";

function Dashboard({ token, user, onSignOut }: { token: string; user: AdminUser; onSignOut: () => void }) {
  const isOwner = user.role === "owner";
  const [tab, setTab] = useState<Tab>("media");
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const notify = useCallback((text: string, tone: "ok" | "error" = "ok") => setNotice({ text, tone }), []);

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof AdminApiError && error.status === 401) {
        onSignOut();
        return;
      }
      notify(errorMessage(error), "error");
    },
    [onSignOut, notify],
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
      <main dir="rtl" className="min-h-screen bg-[#f7f2ea] text-[#1b2420]">
        <header className="sticky top-0 z-30 border-b border-[#0d1f18]/10 bg-[#0d1f18] text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
            <img src="/images/logo.png" alt="Tycoons" className="h-9 w-9 rounded-lg object-contain" />
            <div className="me-auto">
              <p className="text-[11px] font-black tracking-[.18em] text-[#d9b87c]">TYCOONS ADMIN</p>
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
                    className={`h-full rounded-full ${usedRatio > 0.85 ? "bg-red-400" : "bg-[#d9b87c]"}`}
                    style={{ width: `${Math.max(2, usedRatio * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {isOwner && (
              <>
                <button onClick={() => void rebuild()} className="rounded-full bg-[#d9b87c] px-4 py-2 text-sm font-black text-[#0d1f18]">
                  حدّث الموقع
                </button>
                <button onClick={() => setSettingsOpen(true)} className="rounded-full border border-white/25 px-3 py-2 text-sm font-bold">
                  الإعدادات
                </button>
              </>
            )}
            <button onClick={onSignOut} className="rounded-full border border-white/25 px-3 py-2 text-sm font-bold">
              خروج
            </button>
          </div>
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto bg-white px-4 pt-2 text-[#1b2420]">
            <TabButton active={tab === "media"} onClick={() => setTab("media")}>
              الصور والميديا
            </TabButton>
            <TabButton active={tab === "units"} onClick={() => setTab("units")}>
              الوحدات
            </TabButton>
            <TabButton active={tab === "approvals"} onClick={() => setTab("approvals")}>
              {isOwner ? "الموافقات" : "طلباتي"} {pendingTotal > 0 && <Badge tone="pending">{pendingTotal}</Badge>}
            </TabButton>
            {isOwner && (
              <TabButton active={tab === "users"} onClick={() => setTab("users")}>
                المستخدمين
              </TabButton>
            )}
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-bold shadow-xl ${
              notice.tone === "ok" ? "bg-[#0d1f18] text-white" : "bg-red-600 text-white"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-4">
          {tab === "media" && (
            <MediaTab
              projects={projects}
              loading={loading}
              error={loadError}
              onRetry={refresh}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onProjectSaved={(id, values: Omit<MediaFields, "id">) =>
                setProjects((current) => current.map((project) => (project.id === id ? { ...project, ...values } : project)))
              }
            />
          )}
          {tab === "units" && (
            <UnitsTab projects={projects} loading={loading} error={loadError} onRetry={refresh} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          {tab === "approvals" && <ApprovalsTab onChanged={refresh} />}
          {tab === "users" && isOwner && <UsersTab />}
        </div>

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
