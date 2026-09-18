import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  AdminApiError,
  adminApi,
  errorMessage,
  isUploadableImage,
  mediaImages,
  optimizeImage,
  uploadToSignedUrl,
  type MediaFields,
  type MediaKind,
  type MediaTarget,
} from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";

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

export default function MediaEditor({
  target,
  item,
  initialValues,
  hint,
  onSaved,
}: {
  target: MediaTarget;
  item: MediaFields;
  /** Values to start from (e.g. the editor's own pending request) instead of the live row. */
  initialValues?: Omit<MediaFields, "id"> | null;
  hint: string;
  onSaved?: (values: Omit<MediaFields, "id">, applied: boolean) => void;
}) {
  const { token, isOwner, notify, handleError, refreshPending } = useAdmin();
  const onNotice = notify;
  const onError = handleError;
  const source = initialValues ?? item;
  const initial: MediaState = {
    images: mediaImages(source),
    video: String(source.video_url || ""),
    brochure: String(source.brochure_url || ""),
  };
  const [media, setMedia] = useState<MediaState>(initial);
  const mediaRef = useRef<MediaState>(initial);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "pending" | "error">(initialValues ? "pending" : "idle");
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
        const outcome = await adminApi.saveMedia(token, {
          target,
          id: item.id,
          image_url: snapshot.images[0] || "",
          gallery_urls: snapshot.images,
          video_url: snapshot.video,
          brochure_url: snapshot.brochure,
        });
        onSaved?.(outcome.values, outcome.applied);
        if (outcome.pending) refreshPending();
        if (!saveQueued.current) setSaveState(outcome.pending ? "pending" : "saved");
      } catch (error) {
        setSaveState("error");
        onError(error);
      }
    });
  }, [token, target, item.id, onSaved, onError, refreshPending]);

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
        if (!isUploadableImage(blob.type)) throw new AdminApiError("unsupported_file_type", 400);
        updateJob(id, { status: "uploading" });
      }
      const signed = await adminApi.signUpload(token, { target, id: item.id, kind, content_type: blob.type, size: blob.size });
      await uploadToSignedUrl(signed.upload_url, blob, (ratio) => updateJob(id, { progress: ratio }));
      updateJob(id, { status: "done", progress: 1 });
      setTimeout(() => setJobs((current) => current.filter((job) => job.id !== id)), 2500);
      return signed.public_url;
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) onError(error);
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
    if (uploaded) onNotice(isOwner ? `اترفع ${uploaded} صورة واتحفظت` : `اترفع ${uploaded} صورة واتبعتت للموافقة`);
  }

  async function uploadSingle(file: File | undefined, kind: "video" | "brochure") {
    if (!file) return;
    const url = await uploadOne(file, kind);
    if (!url) return;
    if (kind === "video") setVideoDraft(url);
    else setBrochureDraft(url);
    commit((current) => ({ ...current, [kind]: url }));
    onNotice(isOwner ? "اترفع الملف واتحفظ" : "اترفع الملف واتبعت للموافقة");
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

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "pending" | "error" }) {
  if (state === "idle") return null;
  const styles = {
    saving: "bg-[#f7f2ea] text-[#5c6a62]",
    saved: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-600",
  } as const;
  const labels = { saving: "بيحفظ…", saved: "اتحفظ ✓", pending: "مستني موافقة المالك", error: "ماتحفظش" } as const;
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

