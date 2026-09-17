import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  MEDIA_TOKEN_KEY,
  MediaAdminError,
  errorMessage,
  formatBytes,
  isUploadableImage,
  mediaAdminApi,
  mediaImages,
  optimizeImage,
  uploadToSignedUrl,
  type AdminProject,
  type AdminSettings,
  type AdminUnit,
  type MediaFields,
  type MediaKind,
  type MediaTarget,
  type StorageUsage,
} from "../lib/mediaAdminApi";

const FREE_STORAGE_BYTES = 1024 * 1024 * 1024;
const SITE_URL = "https://tycoons-inv.com";

function readToken() {
  try {
    return localStorage.getItem(MEDIA_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function writeToken(token: string) {
  try {
    if (token) localStorage.setItem(MEDIA_TOKEN_KEY, token);
    else localStorage.removeItem(MEDIA_TOKEN_KEY);
  } catch {
    // private mode: session just won't persist
  }
}

function formatPrice(value: number | null) {
  if (!value) return "";
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)} مليون` : `${Math.round(value / 1000)} ألف`;
}

export default function MediaAdminPage() {
  const [token, setToken] = useState(readToken);

  useEffect(() => {
    document.title = "إدارة الميديا | Tycoons";
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  }, []);

  const signOut = useCallback((callServer = true) => {
    const current = readToken();
    writeToken("");
    setToken("");
    if (callServer && current) void mediaAdminApi.logout(current).catch(() => undefined);
  }, []);

  if (!token) {
    return (
      <LoginScreen
        onLogin={(value) => {
          writeToken(value);
          setToken(value);
        }}
      />
    );
  }
  return <Dashboard token={token} onSignOut={signOut} />;
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const { token } = await mediaAdminApi.login(password);
      onLogin(token);
    } catch (err) {
      setError(errorMessage(err));
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
            <h1 className="text-2xl font-black">إدارة الصور والميديا</h1>
          </div>
        </div>
        <label className="mb-2 block text-sm font-bold text-white/70" htmlFor="media-password">
          كلمة السر
        </label>
        <input
          id="media-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-white outline-none focus:border-[#d9b87c]"
        />
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-xl bg-[#d9b87c] p-3 font-black text-[#0d1f18] disabled:opacity-50"
        >
          {busy ? "جاري الدخول…" : "دخول"}
        </button>
        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
      </form>
    </main>
  );
}

type Filter = "all" | "no-images" | "live";

function Dashboard({ token, onSignOut }: { token: string; onSignOut: (callServer?: boolean) => void }) {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("live");
  const [selectedId, setSelectedId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof MediaAdminError && error.status === 401) {
        onSignOut(false);
        return;
      }
      setNotice({ text: errorMessage(error), tone: "error" });
    },
    [onSignOut],
  );

  const load = useCallback(
    () =>
      Promise.all([mediaAdminApi.projects(token), mediaAdminApi.settings(token)])
        .then(([data, currentSettings]) => {
          setProjects(data.projects);
          setStorage(data.storage);
          setSettings(currentSettings);
          setLoadError("");
        })
        .catch((error) => {
          if (error instanceof MediaAdminError && error.status === 401) onSignOut(false);
          else setLoadError(errorMessage(error));
        })
        .finally(() => setLoading(false)),
    [token, onSignOut],
  );

  function refresh() {
    setLoading(true);
    setLoadError("");
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

  const counts = useMemo(
    () => ({
      all: projects.length,
      live: projects.filter((project) => project.slug).length,
      noImages: projects.filter((project) => project.slug && !mediaImages(project).length).length,
    }),
    [projects],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (filter === "live" && !project.slug) return false;
      if (filter === "no-images" && (!project.slug || mediaImages(project).length)) return false;
      if (!needle) return true;
      return [project.name, project.developer, project.location, project.slug].some((value) =>
        String(value || "").toLowerCase().includes(needle),
      );
    });
  }, [projects, query, filter]);

  const selected = projects.find((project) => project.id === selectedId) || null;

  async function rebuild() {
    if (!settings?.has_build_hook) {
      setSettingsOpen(true);
      return;
    }
    try {
      setSettings(await mediaAdminApi.rebuild(token));
      setNotice({ text: "بدأ تحديث الموقع. الصفحات هتتحدث خلال 5-10 دقايق", tone: "ok" });
    } catch (error) {
      handleError(error);
    }
  }

  const usedRatio = storage ? Math.min(1, storage.bytes / FREE_STORAGE_BYTES) : 0;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f2ea] text-[#1b2420]">
      <header className="sticky top-0 z-30 border-b border-[#0d1f18]/10 bg-[#0d1f18] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <img src="/images/logo.png" alt="Tycoons" className="h-9 w-9 rounded-lg object-contain" />
          <div className="me-auto">
            <p className="text-[11px] font-black tracking-[.18em] text-[#d9b87c]">TYCOONS ADMIN</p>
            <h1 className="text-lg font-black leading-tight">إدارة الصور والميديا</h1>
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
          <button onClick={() => void rebuild()} className="rounded-full bg-[#d9b87c] px-4 py-2 text-sm font-black text-[#0d1f18]">
            حدّث الموقع
          </button>
          <button onClick={() => setSettingsOpen(true)} className="rounded-full border border-white/25 px-3 py-2 text-sm font-bold">
            الإعدادات
          </button>
          <button onClick={() => onSignOut()} className="rounded-full border border-white/25 px-3 py-2 text-sm font-bold">
            خروج
          </button>
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

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[340px_1fr]">
        <aside className={`${selected ? "hidden lg:block" : ""} rounded-3xl border border-[#e7ddc8] bg-white p-3`}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم المشروع أو المطور…"
            className="w-full rounded-xl border border-[#e7ddc8] bg-[#fbf8f2] p-3 text-sm outline-none focus:border-[#a3854e]"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <FilterChip active={filter === "live"} onClick={() => setFilter("live")}>
              على الموقع ({counts.live})
            </FilterChip>
            <FilterChip active={filter === "no-images"} onClick={() => setFilter("no-images")}>
              بدون صور ({counts.noImages})
            </FilterChip>
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              الكل ({counts.all})
            </FilterChip>
          </div>
          <div className="mt-3 max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto">
            {loading && <p className="p-4 text-center text-sm font-bold text-[#5c6a62]">جاري التحميل…</p>}
            {loadError && (
              <div className="p-4 text-center text-sm">
                <p className="font-bold text-red-600">{loadError}</p>
                <button onClick={refresh} className="mt-2 underline">
                  جرّب تاني
                </button>
              </div>
            )}
            {!loading &&
              visible.map((project) => {
                const images = mediaImages(project);
                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedId(project.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl p-2 text-right transition ${
                      project.id === selectedId ? "bg-[#0d1f18] text-white" : "hover:bg-[#f7f2ea]"
                    }`}
                  >
                    {images[0] ? (
                      <img src={images[0]} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-red-50 text-[10px] font-black text-red-600">
                        بدون صور
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{project.name}</span>
                      <span className={`block truncate text-xs ${project.id === selectedId ? "text-white/70" : "text-[#5c6a62]"}`}>
                        {project.developer || "—"} · {images.length} صورة{project.slug ? "" : " · مش ظاهر"}
                      </span>
                    </span>
                  </button>
                );
              })}
            {!loading && !loadError && !visible.length && (
              <p className="p-4 text-center text-sm font-bold text-[#5c6a62]">مفيش نتايج</p>
            )}
          </div>
        </aside>

        <section className={selected ? "" : "hidden lg:block"}>
          {selected ? (
            <ProjectWorkspace
              key={selected.id}
              token={token}
              project={selected}
              onBack={() => setSelectedId("")}
              onProjectSaved={(saved) =>
                setProjects((current) => current.map((project) => (project.id === saved.id ? { ...project, ...saved } : project)))
              }
              onNotice={(text) => setNotice({ text, tone: "ok" })}
              onError={handleError}
            />
          ) : (
            <div className="grid h-full min-h-80 place-items-center rounded-3xl border border-dashed border-[#d8c9ab] bg-white/60 p-8 text-center">
              <div>
                <p className="text-xl font-black">اختار مشروع من القائمة</p>
                <p className="mt-2 text-sm text-[#5c6a62]">
                  ارفع صور المشروع مرة واحدة، والوحدات بتاخدها لوحدها في صفحات الوحدات ونتايج البحث.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {settingsOpen && (
        <SettingsDialog
          token={token}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={(next) => {
            setSettings(next);
            setSettingsOpen(false);
            setNotice({ text: "اتحفظ رابط التحديث", tone: "ok" });
          }}
          onError={handleError}
        />
      )}
    </main>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-[#0d1f18] text-white" : "bg-[#f1eadc] text-[#1b2420]"}`}
    >
      {children}
    </button>
  );
}

function ProjectWorkspace({
  token,
  project,
  onBack,
  onProjectSaved,
  onNotice,
  onError,
}: {
  token: string;
  project: AdminProject;
  onBack: () => void;
  onProjectSaved: (saved: MediaFields) => void;
  onNotice: (text: string) => void;
  onError: (error: unknown) => void;
}) {
  const [tab, setTab] = useState<"project" | "units">("project");
  const [units, setUnits] = useState<AdminUnit[] | null>(null);
  const [unitId, setUnitId] = useState("");

  useEffect(() => {
    if (tab !== "units" || units) return;
    mediaAdminApi
      .units(token, project.id)
      .then((data) => setUnits(data.units))
      .catch((error) => {
        setUnits([]);
        onError(error);
      });
  }, [tab, units, token, project.id, onError]);

  const selectedUnit = units?.find((unit) => unit.id === unitId) || null;
  const projectImages = mediaImages(project);

  return (
    <div className="rounded-3xl border border-[#e7ddc8] bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] p-4">
        <button onClick={onBack} className="rounded-full bg-[#f7f2ea] px-3 py-1.5 text-sm font-bold lg:hidden">
          → رجوع
        </button>
        <div className="me-auto min-w-0">
          <h2 className="truncate text-xl font-black">{project.name}</h2>
          <p className="text-xs text-[#5c6a62]">
            {project.developer} · {project.location} · {project.units_count} وحدة
          </p>
        </div>
        {project.slug && (
          <a
            href={`${SITE_URL}/projects/${project.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#d8c9ab] px-3 py-1.5 text-sm font-bold text-[#8a6630]"
          >
            افتح صفحة المشروع ↗
          </a>
        )}
      </div>
      <div className="flex gap-1 border-b border-[#efe7d8] px-4 pt-2">
        <TabButton active={tab === "project"} onClick={() => setTab("project")}>
          صور المشروع
        </TabButton>
        <TabButton active={tab === "units"} onClick={() => setTab("units")}>
          الوحدات ({project.units_count})
        </TabButton>
      </div>

      <div className="p-4">
        {tab === "project" && (
          <MediaEditor
            key={`project-${project.id}`}
            token={token}
            target="project"
            item={project}
            hint="الصورة الأولى هي الغلاف. الصور دي بتظهر في صفحة المشروع، وكمان في صفحات الوحدات ونتايج البحث للوحدات اللي مالهاش صور خاصة."
            onSaved={(saved) => onProjectSaved(saved)}
            onNotice={onNotice}
            onError={onError}
          />
        )}

        {tab === "units" && !selectedUnit && (
          <div>
            <p className="mb-3 rounded-2xl bg-[#f7f2ea] p-3 text-sm leading-relaxed text-[#5c6a62]">
              الوحدات <b>بتاخد صور المشروع لوحدها</b>. ارفع هنا بس لو الوحدة ليها صور خاصة (زي فيلا بتصميم مختلف). ولو الوحدة ليها صور خاصة، هتظهر بدل صور المشروع.
            </p>
            {!units && <p className="p-4 text-center text-sm font-bold">جاري التحميل…</p>}
            {units && !units.length && <p className="p-4 text-center text-sm font-bold">مفيش وحدات للمشروع ده</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {units?.map((unit) => {
                const own = mediaImages(unit);
                return (
                  <button
                    key={unit.id}
                    onClick={() => setUnitId(unit.id)}
                    className="flex items-center gap-3 rounded-2xl border border-[#efe7d8] p-2 text-right hover:border-[#a3854e]"
                  >
                    <img
                      src={own[0] || projectImages[0] || "/images/project-apartment.webp"}
                      alt=""
                      loading="lazy"
                      className={`h-12 w-16 shrink-0 rounded-lg object-cover ${own.length ? "" : "opacity-50"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">
                        {unit.unit_type} {unit.bedrooms_text ? `· ${unit.bedrooms_text}` : ""} {unit.area_sqm ? `· ${unit.area_sqm} م²` : ""}
                      </span>
                      <span className="block truncate text-xs text-[#5c6a62]">
                        {formatPrice(unit.starting_price)} · {own.length ? `${own.length} صورة خاصة` : "بتعرض صور المشروع"}
                        {unit.availability_status !== "available" ? " · مش متاحة" : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "units" && selectedUnit && (
          <div>
            <button onClick={() => setUnitId("")} className="mb-3 rounded-full bg-[#f7f2ea] px-3 py-1.5 text-sm font-bold">
              → كل الوحدات
            </button>
            <h3 className="mb-1 text-lg font-black">
              {selectedUnit.unit_type} {selectedUnit.area_sqm ? `${selectedUnit.area_sqm} م²` : ""} · {formatPrice(selectedUnit.starting_price)}
            </h3>
            <a
              href={`${SITE_URL}/units/${selectedUnit.id}`}
              target="_blank"
              rel="noreferrer"
              className="mb-3 inline-block text-sm font-bold text-[#8a6630] underline"
            >
              افتح صفحة الوحدة ↗
            </a>
            <MediaEditor
              key={`unit-${selectedUnit.id}`}
              token={token}
              target="unit"
              item={selectedUnit}
              hint="لو سبت الوحدة من غير صور، هتعرض صور المشروع تلقائيًا."
              onSaved={(saved) =>
                setUnits((current) => current?.map((unit) => (unit.id === saved.id ? { ...unit, ...saved } : unit)) ?? current)
              }
              onNotice={onNotice}
              onError={onError}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px rounded-t-xl border-b-2 px-4 py-2 text-sm font-black ${
        active ? "border-[#a3854e] text-[#1b2420]" : "border-transparent text-[#5c6a62]"
      }`}
    >
      {children}
    </button>
  );
}

interface UploadJob {
  id: string;
  name: string;
  progress: number;
  status: "optimizing" | "uploading" | "done" | "error";
  error?: string;
}

interface MediaState {
  images: string[];
  video: string;
  brochure: string;
}

function MediaEditor({
  token,
  target,
  item,
  hint,
  onSaved,
  onNotice,
  onError,
}: {
  token: string;
  target: MediaTarget;
  item: MediaFields;
  hint: string;
  onSaved: (saved: MediaFields) => void;
  onNotice: (text: string) => void;
  onError: (error: unknown) => void;
}) {
  const initial: MediaState = {
    images: mediaImages(item),
    video: String(item.video_url || ""),
    brochure: String(item.brochure_url || ""),
  };
  const [media, setMedia] = useState<MediaState>(initial);
  const mediaRef = useRef<MediaState>(initial);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [videoDraft, setVideoDraft] = useState(initial.video);
  const [brochureDraft, setBrochureDraft] = useState(initial.brochure);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const saveQueued = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const persist = useCallback(() => {
    if (saveQueued.current) return;
    saveQueued.current = true;
    setSaveState("saving");
    saveChain.current = saveChain.current.then(async () => {
      saveQueued.current = false;
      const snapshot = mediaRef.current;
      try {
        const { saved } = await mediaAdminApi.save<MediaFields>(token, {
          target,
          id: item.id,
          image_url: snapshot.images[0] || "",
          gallery_urls: snapshot.images,
          video_url: snapshot.video,
          brochure_url: snapshot.brochure,
        });
        onSaved(saved);
        if (!saveQueued.current) setSaveState("saved");
      } catch (error) {
        setSaveState("error");
        onError(error);
      }
    });
  }, [token, target, item.id, onSaved, onError]);

  const commit = useCallback(
    (mutate: (current: MediaState) => MediaState) => {
      const next = mutate(mediaRef.current);
      mediaRef.current = next;
      setMedia(next);
      persist();
    },
    [persist],
  );

  const updateJob = (id: string, patch: Partial<UploadJob>) =>
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));

  async function uploadOne(file: File, kind: MediaKind): Promise<string | null> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setJobs((current) => [...current, { id, name: file.name, progress: 0, status: kind === "image" ? "optimizing" : "uploading" }]);
    try {
      let blob: Blob = file;
      if (kind === "image") {
        blob = await optimizeImage(file);
        if (!isUploadableImage(blob.type)) throw new MediaAdminError("unsupported_file_type", 400);
        updateJob(id, { status: "uploading" });
      }
      const signed = await mediaAdminApi.signUpload(token, { target, id: item.id, kind, content_type: blob.type, size: blob.size });
      await uploadToSignedUrl(signed.upload_url, blob, (ratio) => updateJob(id, { progress: ratio }));
      updateJob(id, { status: "done", progress: 1 });
      setTimeout(() => setJobs((current) => current.filter((job) => job.id !== id)), 2500);
      return signed.public_url;
    } catch (error) {
      if (error instanceof MediaAdminError && error.status === 401) onError(error);
      updateJob(id, { status: "error", error: errorMessage(error) });
      return null;
    }
  }

  async function addImages(fileList: FileList | File[]) {
    const files = [...fileList].filter((file) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name));
    if (!files.length) return;
    const room = 60 - mediaRef.current.images.length;
    if (room <= 0) {
      onNotice("وصلت لأقصى عدد (60 صورة)");
      return;
    }
    const queue = files.slice(0, room);
    let uploaded = 0;
    const worker = async () => {
      while (queue.length) {
        const file = queue.shift()!;
        const url = await uploadOne(file, "image");
        if (url) {
          uploaded += 1;
          commit((current) => ({ ...current, images: [...current.images, url] }));
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (uploaded) onNotice(`اترفع ${uploaded} صورة واتحفظت`);
  }

  async function uploadSingle(file: File | undefined, kind: "video" | "brochure") {
    if (!file) return;
    const url = await uploadOne(file, kind);
    if (!url) return;
    if (kind === "video") setVideoDraft(url);
    else setBrochureDraft(url);
    commit((current) => ({ ...current, [kind]: url }));
    onNotice(kind === "video" ? "اترفع الفيديو واتحفظ" : "اترفع البروشور واتحفظ");
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= mediaRef.current.images.length || from === to) return;
    commit((current) => {
      const images = [...current.images];
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      return { ...current, images };
    });
  }

  function remove(index: number) {
    if (!window.confirm("تشيل الصورة دي من المعرض؟ (الملف نفسه بيفضل محفوظ في التخزين)")) return;
    commit((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }));
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length) void addImages(event.dataTransfer.files);
  }

  const activeJobs = jobs.length > 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="me-auto text-sm leading-relaxed text-[#5c6a62]">{hint}</p>
        <SaveBadge state={saveState} />
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (event.dataTransfer.types.includes("Files")) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-3xl border-2 border-dashed p-6 text-center transition ${
          dragOver ? "border-[#a3854e] bg-[#f7f2ea]" : "border-[#e0d3bb] bg-[#fbf8f2]"
        }`}
      >
        <p className="text-lg font-black">اسحب الصور هنا</p>
        <p className="mt-1 text-xs text-[#5c6a62]">JPG · PNG · WebP · HEIC — بتتضغط لـWebP تلقائيًا عشان الموقع يفضل سريع</p>
        <button
          onClick={() => fileInput.current?.click()}
          className="mt-3 rounded-full bg-[#0d1f18] px-5 py-2.5 text-sm font-black text-white"
        >
          اختار صور من الجهاز
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) void addImages(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {activeJobs && (
        <ul className="mt-3 space-y-1.5">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-xl bg-[#f7f2ea] px-3 py-2 text-xs">
              <div className="flex justify-between gap-2 font-bold">
                <span className="truncate" dir="ltr">
                  {job.name}
                </span>
                <span className={job.status === "error" ? "text-red-600" : ""}>
                  {job.status === "optimizing" && "بيتضغط…"}
                  {job.status === "uploading" && `${Math.round(job.progress * 100)}%`}
                  {job.status === "done" && "✓"}
                  {job.status === "error" && job.error}
                </span>
              </div>
              {job.status !== "error" && (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white">
                  <div className="h-full bg-[#a3854e] transition-all" style={{ width: `${Math.round(job.progress * 100)}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h3 className="font-black">المعرض ({media.images.length})</h3>
        {media.images.length > 1 && <p className="text-xs text-[#5c6a62]">اسحب الصورة لتغيير ترتيبها</p>}
      </div>
      {!media.images.length && <p className="mt-2 rounded-2xl bg-[#fbf8f2] p-4 text-center text-sm text-[#5c6a62]">لسه مفيش صور</p>}
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {media.images.map((url, index) => (
          <figure
            key={url}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`group relative overflow-hidden rounded-2xl border bg-[#f7f2ea] ${
              index === 0 ? "border-[#a3854e] ring-2 ring-[#d9b87c]" : "border-[#efe7d8]"
            } ${dragIndex === index ? "opacity-40" : ""}`}
          >
            <img src={url} alt="" loading="lazy" className="aspect-[4/3] w-full cursor-grab object-cover" />
            {index === 0 && (
              <span className="absolute right-2 top-2 rounded-full bg-[#d9b87c] px-2 py-0.5 text-[11px] font-black text-[#0d1f18]">
                الغلاف
              </span>
            )}
            <figcaption className="flex items-center gap-1 p-1.5">
              <IconButton label="قدّم" onClick={() => move(index, index - 1)} disabled={index === 0}>
                →
              </IconButton>
              <IconButton label="أخّر" onClick={() => move(index, index + 1)} disabled={index === media.images.length - 1}>
                ←
              </IconButton>
              {index !== 0 && (
                <button onClick={() => move(index, 0)} title="اجعلها الغلاف" className="rounded-lg bg-white px-2 py-1 text-[11px] font-black">
                  غلاف
                </button>
              )}
              <button
                onClick={() => remove(index)}
                aria-label="شيل الصورة"
                className="ms-auto rounded-lg bg-white px-2 py-1 text-[11px] font-black text-red-600"
              >
                شيل
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <LinkField
          title="الفيديو"
          help="ارفع MP4 (أقصى 50MB) أو حط لينك YouTube"
          accept="video/mp4,video/webm,video/quicktime"
          draft={videoDraft}
          saved={media.video}
          onDraft={setVideoDraft}
          onUpload={(file) => void uploadSingle(file, "video")}
          onSave={() => commit((current) => ({ ...current, video: videoDraft.trim() }))}
        />
        <LinkField
          title="البروشور"
          help="ارفع PDF (أقصى 50MB) أو حط لينك"
          accept="application/pdf"
          draft={brochureDraft}
          saved={media.brochure}
          onDraft={setBrochureDraft}
          onUpload={(file) => void uploadSingle(file, "brochure")}
          onSave={() => commit((current) => ({ ...current, brochure: brochureDraft.trim() }))}
        />
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const styles = {
    saving: "bg-[#f7f2ea] text-[#5c6a62]",
    saved: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-600",
  } as const;
  const labels = { saving: "بيحفظ…", saved: "اتحفظ ✓", error: "ماتحفظش" } as const;
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[state]}`}>{labels[state]}</span>;
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-lg bg-white px-2 py-1 text-xs font-black disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function LinkField({
  title,
  help,
  accept,
  draft,
  saved,
  onDraft,
  onUpload,
  onSave,
}: {
  title: string;
  help: string;
  accept: string;
  draft: string;
  saved: string;
  onDraft: (value: string) => void;
  onUpload: (file: File | undefined) => void;
  onSave: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const dirty = draft.trim() !== saved;
  return (
    <div className="rounded-2xl border border-[#efe7d8] p-3">
      <div className="flex items-center justify-between">
        <h4 className="font-black">{title}</h4>
        {saved && (
          <a href={saved} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#8a6630] underline">
            افتح ↗
          </a>
        )}
      </div>
      <p className="mt-0.5 text-xs text-[#5c6a62]">{help}</p>
      <div className="mt-2 flex gap-2">
        <input
          dir="ltr"
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          placeholder="https://…"
          className="min-w-0 flex-1 rounded-xl border border-[#e7ddc8] bg-[#fbf8f2] px-3 py-2 text-xs outline-none focus:border-[#a3854e]"
        />
        {dirty ? (
          <button onClick={onSave} className="rounded-xl bg-[#0d1f18] px-3 text-xs font-black text-white">
            حفظ
          </button>
        ) : (
          <button onClick={() => input.current?.click()} className="rounded-xl bg-[#f1eadc] px-3 text-xs font-black">
            رفع ملف
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept={accept}
          hidden
          onChange={(event) => {
            onUpload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function SettingsDialog({
  token,
  settings,
  onClose,
  onSaved,
  onError,
}: {
  token: string;
  settings: AdminSettings | null;
  onClose: () => void;
  onSaved: (settings: AdminSettings) => void;
  onError: (error: unknown) => void;
}) {
  const [hook, setHook] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      onSaved(await mediaAdminApi.saveSettings(token, hook.trim()));
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div dir="rtl" className="w-full max-w-lg rounded-3xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-xl font-black">إعدادات تحديث الموقع</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5c6a62]">
          صفحات المشاريع اللي جوجل بيقراها بتتبني وقت نشر الموقع. زرار «حدّث الموقع» بيعيد بناءها عشان تاخد الصور الجديدة.
          محتاج رابط <b dir="ltr">Build Hook</b> من Netlify مرة واحدة بس:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pe-5 text-sm text-[#5c6a62]">
          <li>Netlify ← الموقع ← Site configuration ← Build &amp; deploy</li>
          <li>Build hooks ← Add build hook ← الاسم: Media admin ← Branch: main</li>
          <li>انسخ الرابط والصقه هنا</li>
        </ol>
        <p className="mt-3 text-xs font-bold">
          الحالة: {settings?.has_build_hook ? "✓ الرابط محفوظ" : "لسه مفيش رابط"}
          {settings?.last_rebuild_at ? ` · آخر تحديث: ${new Date(settings.last_rebuild_at).toLocaleString("ar-EG")}` : ""}
        </p>
        <input
          dir="ltr"
          value={hook}
          onChange={(event) => setHook(event.target.value)}
          placeholder="https://api.netlify.com/build_hooks/…"
          className="mt-3 w-full rounded-xl border border-[#e7ddc8] bg-[#fbf8f2] p-3 text-sm outline-none focus:border-[#a3854e]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">
            إلغاء
          </button>
          <button
            onClick={() => void save()}
            disabled={busy || !hook.trim()}
            className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
