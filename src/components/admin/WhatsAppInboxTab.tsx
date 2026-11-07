import { useEffect, useMemo, useState } from "react";
import {
  adminApi,
  formatPrice,
  hideLegacyDuplicates,
  mediaImages,
  STATUS_LABELS,
  FINISHING_LABELS,
  WA_FILL_LABELS,
  WA_SUGGEST_LABELS,
  WA_DOUBT_LABELS,
  WA_DRAFT_FIELD_LABELS,
  AREA_GROUPS,
  waDraftDoubtLabel,
  type WaDraft,
  type WaDraftField,
  type WaResearchMode,
  type WaResearchSettings,
  type AdminProject,
  type AdminUnit,
  type WaGroup,
  type WaInboxItem,
  type WaInboxStatus,
  type WaInboxValues,
  type WaFillSource,
  type WaProjectSuggestion,
  type WaDoubt,
  type WaAutoApprove,
  type WaPhotoGap,
  type WaPhotoCheck,
  type WaPhotoSuggestion,
} from "../../lib/adminApi";
import { writeAndPublishProjectArticles, type BatchLanguage, type BatchStep, type PublishResult } from "../../lib/articleBatch";
import { useAdmin } from "./AdminContext";
import ProjectForm, { type NewProject } from "./ProjectForm";
import { FinishingSelect, SearchSelect } from "./SearchSelect";
import { Badge, Chip, EmptyState, inputClass, Modal } from "./ui";

/** Bucket for units whose project name did not match any project on the site. */
const UNMATCHED = "__unmatched__";
/** Bucket id of a new project (not on the site yet): "draft:<id>". */
const DRAFT = "draft:";

/**
 * "وحدات واتساب": units Claude read from the WhatsApp developer groups wait here.
 * Same layout as the units tab: projects on the right, that project's WhatsApp units on the left,
 * with the units already on the site underneath to compare. Nothing shows on the site until "وافق".
 */
export default function WhatsAppInboxTab({
  projects,
  onChanged,
  onOpenPhotos,
}: {
  projects: AdminProject[];
  onChanged: () => void;
  /** Opens the photos tab on that project. */
  onOpenPhotos?: (projectId: string) => void;
}) {
  const { token, notify, handleError } = useAdmin();
  const [status, setStatus] = useState<WaInboxStatus>("pending");
  const [items, setItems] = useState<WaInboxItem[]>([]);
  const [matches, setMatches] = useState<Map<string, AdminUnit>>(new Map());
  const [duplicates, setDuplicates] = useState<Record<string, number[]>>({});
  const [autoFilled, setAutoFilled] = useState<Record<string, Record<string, WaFillSource>>>({});
  const [rejectedBefore, setRejectedBefore] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, WaProjectSuggestion>>({});
  const [finishingSuggestions, setFinishingSuggestions] = useState<Record<string, string>>({});
  const [finishingOpen, setFinishingOpen] = useState(false);
  /** Pending units split in two: everything present and nothing doubtful, or needs a look (with the reasons). */
  const [doubts, setDoubts] = useState<Record<string, WaDoubt[]>>({});
  const [view, setView] = useState<"ready" | "review">("ready");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, WaDraft>>({});
  /** Ready units that would have no photo on the site: they wait for the project's photos (no automatic approval). */
  const [noPhotos, setNoPhotos] = useState<Record<string, true>>({});
  const [photoGaps, setPhotoGaps] = useState<WaPhotoGap[]>([]);
  const [photoGapsOpen, setPhotoGapsOpen] = useState(false);
  /** Claude's check of each project's current photos (no entry = not checked yet). */
  const [photoChecks, setPhotoChecks] = useState<Record<string, WaPhotoCheck>>({});
  const [photoFlagsOpen, setPhotoFlagsOpen] = useState(true);
  /** Flagged photos open in the big viewer. */
  const [flagView, setFlagView] = useState<{ title: string; urls: string[]; index: number } | null>(null);
  /** Latest photo search on the developer's website for each project with no photos. */
  const [photoSuggestions, setPhotoSuggestions] = useState<Record<string, WaPhotoSuggestion>>({});
  const [autoApprove, setAutoApprove] = useState<WaAutoApprove | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [draftEditing, setDraftEditing] = useState<WaDraft | null>(null);
  const [publishing, setPublishing] = useState<WaDraft | null>(null);
  const [counts, setCounts] = useState<Record<WaInboxStatus, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<WaInboxItem | null>(null);
  const [bucket, setBucket] = useState("");
  const [query, setQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [unitsState, setUnitsState] = useState<{ projectId: string; units: AdminUnit[] }>({ projectId: "", units: [] });

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };
  const changeStatus = (next: WaInboxStatus) => {
    if (next === status) return;
    setLoading(true);
    setStatus(next);
  };

  useEffect(() => {
    let active = true;
    adminApi
      .waInbox(token, status)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setMatches(new Map(result.matches.map((unit) => [unit.id, unit])));
        setDuplicates(result.duplicates ?? {});
        setAutoFilled(result.auto_filled ?? {});
        setRejectedBefore(result.previously_rejected ?? {});
        setSuggestions(result.suggestions ?? {});
        setFinishingSuggestions(result.finishing_suggestions ?? {});
        setDoubts(result.doubts ?? {});
        setDrafts(result.drafts ?? {});
        setNoPhotos(result.no_photos ?? {});
        setPhotoGaps(result.photo_gaps ?? []);
        setPhotoChecks(result.photo_checks ?? {});
        setPhotoSuggestions(result.photo_suggestions ?? {});
        if (result.auto_approve) setAutoApprove(result.auto_approve);
        setCounts(result.counts);
        setSelected(new Set());
      })
      .catch((error) => active && handleError(error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, status, reloadKey, handleError]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const isReady = (item: WaInboxItem) => (doubts[String(item.id)]?.length ?? 1) === 0;
  const readyCount = useMemo(() => items.filter((item) => (doubts[String(item.id)]?.length ?? 1) === 0).length, [items, doubts]);
  // Pending: only the half chosen above ("جاهز للموافقة" / "محتاج مراجعة"); approved/rejected: everything.
  const visibleItems = useMemo(
    () => (status === "pending" ? items.filter((item) => ((doubts[String(item.id)]?.length ?? 1) === 0) === (view === "ready")) : items),
    [items, doubts, status, view],
  );

  /** Right-hand list: one row per project that has WhatsApp units (+ one row for the unmatched ones). */
  const buckets = useMemo(() => {
    const map = new Map<string, WaInboxItem[]>();
    for (const item of visibleItems) {
      const id =
        item.project_id && projectById.has(item.project_id) ? item.project_id : item.draft_id && drafts[item.draft_id] ? `${DRAFT}${item.draft_id}` : UNMATCHED;
      map.set(id, [...(map.get(id) ?? []), item]);
    }
    const needle = query.trim().toLowerCase();
    return [...map.entries()]
      .map(([id, list]) => ({ id, list, project: projectById.get(id) ?? null, draft: id.startsWith(DRAFT) ? drafts[id.slice(DRAFT.length)] ?? null : null }))
      .filter(({ project, draft, list }) =>
        !needle ||
        [project?.name, project?.developer, project?.area_group, draft?.name, draft?.developer, draft?.area_group, ...list.map((item) => `${item.project_name} ${item.source_group}`)].some((value) =>
          String(value || "").toLowerCase().includes(needle),
        ),
      )
      .sort((a, b) => Number(b.id === UNMATCHED) - Number(a.id === UNMATCHED) || b.list.length - a.list.length);
  }, [visibleItems, projectById, query, drafts]);

  // Keep a valid bucket selected (first one by default, as the units tab keeps a project open).
  const activeBucket = buckets.find((row) => row.id === bucket) ?? buckets[0] ?? null;
  const activeProject = activeBucket?.project ?? null;
  const activeDraft = activeBucket?.draft ?? null;
  // Unmatched units with a suggested project first (one click each).
  const bucketRows = useMemo(() => {
    const list = activeBucket?.list ?? [];
    return activeBucket?.project ? list : [...list].sort((a, b) => Number(Boolean(suggestions[String(b.id)])) - Number(Boolean(suggestions[String(a.id)])));
  }, [activeBucket, suggestions]);
  // Search inside the open list: every word must appear somewhere in the unit (name, type, area, price, group…).
  const rows = useMemo(() => {
    const words = searchText(unitQuery).split(/\s+/).filter(Boolean);
    if (!words.length) return bucketRows;
    return bucketRows.filter((item) => {
      const suggestion = suggestions[String(item.id)];
      const haystack = searchText(
        [
          item.project_name, item.developer, item.location, item.area_group, item.unit_type, item.bedrooms_text, item.area_sqm,
          item.starting_price, item.down_payment_text, item.installments_text, item.delivery_text, item.finishing,
          item.description, item.source_group, item.sender, suggestion?.name,
        ].join(" "),
      );
      return words.every((word) => haystack.includes(word));
    });
  }, [bucketRows, unitQuery, suggestions]);

  // Units already on the site for the open project, to compare and to pick photos from.
  const activeProjectId = activeProject?.id ?? "";
  useEffect(() => {
    if (!activeProjectId) return;
    let active = true;
    adminApi
      .units(token, activeProjectId)
      .then((result) => active && setUnitsState({ projectId: activeProjectId, units: result.units }))
      .catch(() => active && setUnitsState({ projectId: activeProjectId, units: [] }));
    return () => {
      active = false;
    };
  }, [token, activeProjectId, reloadKey]);
  const siteUnits = unitsState.projectId === activeProjectId ? unitsState.units : [];

  const quickApprove = async (item: WaInboxItem) => {
    if (missing(item).length) return setEditing(item);
    setBusyId(item.id);
    try {
      const result = await adminApi.waInboxApprove(token, item.id, {}, item.match_unit_id || "", "available");
      notify(result.action === "update" ? "اتحدثت الوحدة الموجودة على الموقع" : "اتضافت وحدة جديدة على الموقع");
      onChanged();
      reload();
    } catch (error) {
      handleError(error);
    } finally {
      setBusyId(null);
    }
  };

  /** "وافق على الكل": the server approves only what is still ready and says what it skipped. */
  const approveReady = async (ids: number[]) => {
    if (!ids.length) return;
    if (!window.confirm(`توافق على ${ids.length} وحدة؟ هتنزل على الموقع على طول.`)) return;
    setBulkBusy(true);
    try {
      const result = await adminApi.waInboxApproveReady(token, ids);
      notify(`اتوافق على ${result.approved} وحدة${result.skipped.length ? ` · ${result.skipped.length} اتسابت للمراجعة` : ""}`);
      onChanged();
      reload();
    } catch (error) {
      handleError(error);
    } finally {
      setBulkBusy(false);
    }
  };

  /** «النزول التلقائي» on/off: ready units go on the site by themselves every 15 minutes. */
  const toggleAutoApprove = async () => {
    if (!autoApprove) return;
    const next = !autoApprove.on;
    if (!window.confirm(next ? "تشغّل النزول التلقائي؟ الوحدات الجاهزة هتنزل على الموقع لوحدها كل 15 دقيقة." : "توقف النزول التلقائي؟ الوحدات هتستنى موافقتك."))
      return;
    setAutoBusy(true);
    try {
      setAutoApprove(await adminApi.waAutoApproveSave(token, { on: next }));
      notify(next ? "النزول التلقائي اشتغل" : "النزول التلقائي وقف");
    } catch (error) {
      handleError(error);
    } finally {
      setAutoBusy(false);
    }
  };

  /** «تشييك الصور» on/off: off = Claude checks no photos and nothing goes on the site by itself. */
  const togglePhotoCheck = async () => {
    if (!autoApprove) return;
    const next = !autoApprove.photo_check;
    if (!window.confirm(next ? "تشغّل تشييك الصور؟ Claude هيشيّك على صور المشاريع، والوحدات اللي صورها عدّت هتنزل لوحدها." : "توقف تشييك الصور؟ مفيش وحدات هتنزل لوحدها، هتنزل بس لما توافق عليها بإيدك."))
      return;
    setAutoBusy(true);
    try {
      setAutoApprove(await adminApi.waAutoApproveSave(token, { photo_check: next }));
      notify(next ? "تشييك الصور اشتغل" : "تشييك الصور وقف");
    } catch (error) {
      handleError(error);
    } finally {
      setAutoBusy(false);
    }
  };

  /** Projects whose photos Claude flagged, with how many ready units wait for them. */
  const photoFlags = useMemo(() => {
    const waiting = new Map<string, number>();
    for (const item of items) {
      if (!item.project_id || !isReady(item) || noPhotos[String(item.id)]) continue;
      if (["mismatch", "phone", "error"].includes(photoChecks[item.project_id]?.status ?? "")) waiting.set(item.project_id, (waiting.get(item.project_id) ?? 0) + 1);
    }
    return [...waiting.entries()]
      .map(([projectId, count]) => ({ projectId, count, project: projectById.get(projectId) ?? null, check: photoChecks[projectId] }))
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, doubts, noPhotos, photoChecks, projectById]);

  const [recheckBusy, setRecheckBusy] = useState<string | null>(null);
  const recheckPhotos = async (projectId: string, name: string) => {
    setRecheckBusy(projectId);
    try {
      const result = await adminApi.waPhotoRecheck(token, projectId);
      setPhotoChecks((current) => ({ ...current, [projectId]: result.check }));
      notify(["ok", "confirmed"].includes(result.check.status) ? `صور ${name} عدّت، وحداته هتنزل في الدورة الجاية` : `صور ${name} لسه محتاجة مراجعة`);
    } catch (error) {
      handleError(error);
    } finally {
      setRecheckBusy(null);
    }
  };

  const confirmPhotos = async (projectId: string, name: string) => {
    if (!window.confirm(`صور ${name} صح؟ وحداته الجاهزة هتنزل لوحدها في المرة الجاية.`)) return;
    try {
      await adminApi.waPhotoConfirm(token, projectId);
      notify(`اتأكدت صور ${name}`);
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  /** Confirms the suggested (or picked) project: every unit with the same WhatsApp name goes with it. */
  const linkProject = async (item: WaInboxItem, projectId: string, projectName: string) => {
    setBusyId(item.id);
    try {
      const result = await adminApi.waInboxLink(token, item.id, projectId);
      notify(`اتربطت ${result.linked} وحدة بـ ${projectName}${result.remembered ? " — والاسم ده هيتربط لوحده بعد كده" : ""}`);
      reload();
    } catch (error) {
      handleError(error);
    } finally {
      setBusyId(null);
    }
  };

  /** Default finishing of the open project (units without one take it). */
  const saveFinishing = async (finishing: string) => {
    if (!activeProject) return;
    try {
      const result = await adminApi.projectUpdate(token, activeProject.id, { finishing });
      notify(result.applied ? `التشطيب الافتراضي لـ ${activeProject.name}: ${finishing || "مش محدد"}` : "مفيش تغيير");
      setFinishingOpen(false);
      onChanged();
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  const nameKey = (value: string | null) => String(value || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "");

  const reject = async (ids: number[]) => {
    if (!ids.length) return;
    if (!window.confirm(ids.length === 1 ? "ترفض الوحدة دي؟" : `ترفض ${ids.length} وحدة؟`)) return;
    try {
      const result = await adminApi.waInboxReject(token, ids);
      notify(`اترفض ${result.rejected}`);
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  const toggleSelect = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const rowIds = rows.map((item) => item.id);
  const allChecked = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const pending = status === "pending";

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <aside className={`rounded-3xl border border-[#e7ddc8] bg-white p-3 ${bucket ? "hidden lg:block" : ""}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">وحدات واتساب</h2>
          <div className="flex gap-1">
            <button onClick={reload} className="rounded-full bg-[#f1eadc] px-3 py-1.5 text-xs font-black">
              تحديث
            </button>
            <button onClick={() => setGroupsOpen(true)} className="rounded-full border border-[#d8c9ab] px-3 py-1.5 text-xs font-black">
              الجروبات
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={status === "pending"} onClick={() => changeStatus("pending")}>
            مستنية ({counts.pending})
          </Chip>
          <Chip active={status === "approved"} onClick={() => changeStatus("approved")}>
            اتوافق ({counts.approved})
          </Chip>
          <Chip active={status === "rejected"} onClick={() => changeStatus("rejected")}>
            اترفض ({counts.rejected})
          </Chip>
        </div>
        {status === "pending" && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { setView("ready"); setBucket(""); setSelected(new Set()); }}
              className={`rounded-2xl px-3 py-2 text-sm font-black ${view === "ready" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"}`}
            >
              جاهز للموافقة ({readyCount})
            </button>
            <button
              onClick={() => { setView("review"); setBucket(""); setSelected(new Set()); }}
              className={`rounded-2xl px-3 py-2 text-sm font-black ${view === "review" ? "bg-[#0d1f18] text-white" : "bg-[#f1eadc] text-[#0d1f18]"}`}
            >
              محتاج مراجعة ({items.length - readyCount})
            </button>
          </div>
        )}
        {status === "pending" && autoApprove && (
          <div className="mt-2 rounded-2xl border border-[#e7ddc8] bg-[#fbf8f2] p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="me-auto font-black">
                النزول التلقائي:{" "}
                <span className={autoApprove.on ? "text-emerald-700" : "text-red-600"}>{autoApprove.on ? "شغال" : "متوقف"}</span>
              </span>
              <button
                disabled={autoBusy}
                onClick={() => void toggleAutoApprove()}
                className="rounded-full border border-[#d8c9ab] px-3 py-1 font-black disabled:opacity-50"
              >
                {autoApprove.on ? "وقّفه" : "شغّله"}
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="me-auto font-black">
                تشييك الصور:{" "}
                <span className={autoApprove.photo_check ? "text-emerald-700" : "text-red-600"}>{autoApprove.photo_check ? "شغال" : "متوقف"}</span>
              </span>
              <button
                disabled={autoBusy}
                onClick={() => void togglePhotoCheck()}
                className="rounded-full border border-[#d8c9ab] px-3 py-1 font-black disabled:opacity-50"
              >
                {autoApprove.photo_check ? "وقّفه" : "شغّله"}
              </button>
            </div>
            <p className="mt-1 leading-5 text-[#5c6a62]">
              {!autoApprove.on
                ? "الوحدات الجاهزة مستنية موافقتك."
                : !autoApprove.photo_check
                  ? "تشييك الصور متوقف، فمفيش وحدات بتنزل لوحدها. بتنزل بس لما توافق عليها بإيدك."
                  : "كل 15 دقيقة Claude بيشيّك على صور المشاريع (تبع المشروع ومفيهاش رقم غير رقمنا)، والوحدات الجاهزة اللي صور مشروعها عدّت بتنزل لوحدها. ماعدا اللي مشروعها مالوش صور ووحدات المشاريع الجديدة (بتنزل بـ «انشر»)."}
              {autoApprove.last_run ? ` آخر مرة ${when(autoApprove.last_run)}: نزلت ${autoApprove.last_approved} وحدة.` : ""}
            </p>
            <p className="mt-1 leading-5 text-[#5c6a62]">
              تكلفة تشييك الصور: النهارده ${autoApprove.photo_usage.today.usd.toFixed(2)} ({autoApprove.photo_usage.today.checks} مشروع) · من الأول $
              {autoApprove.photo_usage.total.usd.toFixed(2)} ({autoApprove.photo_usage.total.checks} مشروع،{" "}
              {Math.round((autoApprove.photo_usage.total.input_tokens + autoApprove.photo_usage.total.output_tokens) / 1000).toLocaleString("en")} ألف توكن)
              {autoApprove.photo_usage.firecrawl_credits ? ` · Firecrawl: ${autoApprove.photo_usage.firecrawl_credits} credit` : ""}
            </p>
          </div>
        )}
        {status === "pending" && photoGaps.length > 0 && (
          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-xs">
            <button onClick={() => setPhotoGapsOpen((open) => !open)} className="flex w-full items-center gap-2 text-right font-black text-amber-800">
              <span className="me-auto">
                مشاريع ناقصها صور ({photoGaps.length}) · {photoGaps.reduce((sum, gap) => sum + gap.waiting, 0)} وحدة جاهزة مستنياها
              </span>
              <span>{photoGapsOpen ? "▲" : "▼"}</span>
            </button>
            {photoGapsOpen && (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {photoGaps.map((gap) => (
                  <PhotoGapRow
                    key={gap.project_id}
                    gap={gap}
                    suggestion={photoSuggestions[gap.project_id] ?? null}
                    onUnits={() => {
                      setView("ready");
                      setBucket(gap.project_id);
                      setSelected(new Set());
                    }}
                    onOpenPhotos={onOpenPhotos ? () => onOpenPhotos(gap.project_id) : undefined}
                    onSuggestion={(next) => setPhotoSuggestions((current) => ({ ...current, [gap.project_id]: next }))}
                    onAdded={() => {
                      onChanged();
                      reload();
                    }}
                  />
                ))}
              </ul>
            )}
            <p className="mt-1.5 leading-5 text-amber-800">
              بندوّر على صور كل مشروع في موقع المطور الأول وبعده مواقع العقارات (مشروع كل 15 دقيقة)، وClaude بيشيّكها، وبتظهرلك هنا كاقتراح. أول ما تضيف الصور أو ترفعها، وحداته الجاهزة هتنزل لوحدها في المرة الجاية.
            </p>
          </div>
        )}
        {status === "pending" && photoFlags.length > 0 && (
          <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-2.5 text-xs">
            <button onClick={() => setPhotoFlagsOpen((open) => !open)} className="flex w-full items-center gap-2 text-right font-black text-red-700">
              <span className="me-auto">
                صور محتاجة مراجعة ({photoFlags.length}) · {photoFlags.reduce((sum, flag) => sum + flag.count, 0)} وحدة جاهزة مستنياها
              </span>
              <span>{photoFlagsOpen ? "▲" : "▼"}</span>
            </button>
            {photoFlagsOpen && (
              <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
                {photoFlags.map(({ projectId, count, project, check }) => (
                  <li key={projectId} className="rounded-xl bg-white p-2">
                    <span className="block truncate font-black">{project?.name || "—"}</span>
                    <span className="block text-red-700">
                      {check?.status === "phone" ? "عليها رقم تليفون تاني" : check?.status === "mismatch" ? "Claude شايفها مش صور المشروع ده" : "ما قدرناش نشيّك على الصور، هنجرّب تاني"}
                      {check?.reason && check.status !== "error" ? `: ${check.reason}` : ""}
                    </span>
                    {check?.stale && (
                      <span className="mt-1 block rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-800">
                        غيّرت الصور، ومستنية تشييك جديد (في الدورة الجاية أو بـ «شيّك دلوقتي»).
                        {(check.bad_still_there ?? []).length > 0
                          ? ` الصورة اللي عليها المشكلة لسه موجودة (${(check.bad_still_there ?? []).length}).`
                          : check.bad_urls.length > 0
                            ? " الصورة اللي عليها المشكلة اتشالت."
                            : ""}
                      </span>
                    )}
                    {check && check.bad_urls.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {check.bad_urls.map((url, index) => (
                          <button key={url} onClick={() => setFlagView({ title: project?.name || "صور المشروع", urls: check.bad_urls, index })} title="كبّر الصورة">
                            <img src={url} alt="" loading="lazy" className="h-14 w-20 rounded-lg object-cover ring-2 ring-red-300" />
                          </button>
                        ))}
                      </span>
                    )}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="me-auto text-[#5c6a62]">{count} وحدة جاهزة</span>
                      <button
                        onClick={() => {
                          setView("ready");
                          setBucket(projectId);
                          setSelected(new Set());
                        }}
                        className="rounded-full bg-[#f1eadc] px-2.5 py-1 font-black"
                      >
                        الوحدات
                      </button>
                      {onOpenPhotos && (
                        <button onClick={() => onOpenPhotos(projectId)} className="rounded-full bg-[#0d1f18] px-2.5 py-1 font-black text-white">
                          غيّر الصور
                        </button>
                      )}
                      <button
                        disabled={recheckBusy === projectId}
                        onClick={() => void recheckPhotos(projectId, project?.name || "المشروع")}
                        className="rounded-full border border-[#d8c9ab] bg-white px-2.5 py-1 font-black disabled:opacity-50"
                      >
                        {recheckBusy === projectId ? "بيشيّك…" : "شيّك دلوقتي"}
                      </button>
                      {check?.status !== "error" && (
                        <button onClick={() => void confirmPhotos(projectId, project?.name || "المشروع")} className="rounded-full bg-emerald-600 px-2.5 py-1 font-black text-white">
                          الصور صح
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 leading-5 text-red-700">لما تغيّر الصور، Claude هيشيّك عليها تاني لوحده.</p>
            {flagView && (
              <PhotoViewer
                title={flagView.title}
                urls={flagView.urls}
                index={flagView.index}
                onIndex={(index) => setFlagView({ ...flagView, index })}
                onClose={() => setFlagView(null)}
              />
            )}
          </div>
        )}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بالمشروع أو المطور أو الجروب…"
          className={`${inputClass} mt-2`}
        />
        <div className="mt-3 max-h-[calc(100vh-260px)] space-y-1 overflow-y-auto">
          {loading && <p className="p-4 text-center text-sm font-bold text-[#5c6a62]">جاري التحميل…</p>}
          {!loading && !buckets.length && <p className="p-4 text-center text-sm font-bold text-[#5c6a62]">مفيش وحدات هنا</p>}
          {!loading &&
            buckets.map(({ id, list, project, draft }) => {
              const active = id === activeBucket?.id;
              const image = project ? mediaImages(project)[0] : "";
              const dupes = list.filter((item) => duplicates[String(item.id)]?.length).length;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setBucket(id);
                    setSelected(new Set());
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2 text-right transition ${active ? "bg-[#0d1f18] text-white" : "hover:bg-[#f7f2ea]"}`}
                >
                  {id === UNMATCHED ? (
                    <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-red-50 text-[10px] font-black text-red-600">مش متطابقة</span>
                  ) : draft ? (
                    <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[10px] font-black text-emerald-700">مشروع جديد</span>
                  ) : image ? (
                    <img src={image} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-[#f1eadc] text-[10px] font-black text-[#5c6a62]">بدون صور</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{project ? project.name : draft ? draft.name : "مشاريع مش موجودة على الموقع"}</span>
                    <span className={`block truncate text-xs ${active ? "text-white/70" : "text-[#5c6a62]"}`}>
                      {project
                        ? `${project.developer || "—"} · ${project.area_group || project.location || "—"}`
                        : draft
                          ? `${draft.developer || "—"} · ${draft.status === "researching" ? "بندوّر عليه على النت" : draft.area_group || "—"}`
                          : "اختار المشروع أو اعمله جديد"}
                      {dupes ? ` · ${dupes} مكررة` : ""}
                    </span>
                  </span>
                  <Badge tone={id === UNMATCHED ? "error" : "pending"}>{list.length}</Badge>
                </button>
              );
            })}
        </div>
      </aside>

      <section className={bucket ? "" : "hidden lg:block"}>
        {!loading && !activeBucket && <EmptyState title={pending ? "مفيش وحدات مستنية" : "مفيش حاجة هنا"} text="أول ما مطور ينزل وحدات في الجروب هتظهر هنا." />}
        {activeBucket && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-[#e7ddc8] bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] p-4">
                <button onClick={() => setBucket("")} className="rounded-full bg-[#f7f2ea] px-3 py-1.5 text-sm font-bold lg:hidden">
                  → رجوع
                </button>
                <div className="me-auto min-w-0">
                  <h2 className="truncate text-xl font-black">{activeProject ? activeProject.name : activeDraft ? activeDraft.name : "وحدات مشروعها مش موجود على الموقع"}</h2>
                  <p className="text-xs text-[#5c6a62]">
                    {activeProject
                      ? `${activeProject.developer || "—"} · ${[activeProject.sub_area, activeProject.area_group].filter(Boolean).join(", ") || activeProject.location || "—"} · ${siteUnits.length} وحدة على الموقع`
                      : activeDraft
                        ? "مشروع جديد مش على الموقع لسه. بياناته من النت تحت، ووحداته بتنزل معاه لما تنشره."
                        : "دوس «تعديل» على كل وحدة واختار مشروعها، أو اعمل المشروع جديد من نفس الشاشة."}
                  </p>
                </div>
                <input
                  type="search"
                  value={unitQuery}
                  onChange={(event) => { setUnitQuery(event.target.value); setSelected(new Set()); }}
                  placeholder="ابحث في الوحدات: اسم، نوع، مساحة، سعر، جروب…"
                  className={`${inputClass} w-full sm:w-80`}
                />
                {unitQuery.trim() && <span className="text-xs font-bold text-[#5c6a62]">{rows.length} من {bucketRows.length}</span>}
                {pending && view === "ready" && rows.length > 0 && !activeDraft && (
                  <button
                    disabled={bulkBusy}
                    onClick={() => void approveReady(selected.size ? [...selected] : rows.filter(isReady).map((item) => item.id))}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                  >
                    {bulkBusy ? "جاري الموافقة…" : selected.size ? `وافق على المختار (${selected.size})` : `وافق على الكل (${rows.length})`}
                  </button>
                )}
                {pending && selected.size > 0 && (
                  <button onClick={() => void reject([...selected])} className="rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600">
                    ارفض المختار ({selected.size})
                  </button>
                )}
              </div>
              {activeDraft && pending && (
                <DraftPanel
                  draft={activeDraft}
                  onEdit={() => setDraftEditing(activeDraft)}
                  onPublish={() => setPublishing(activeDraft)}
                  onChanged={(next) => {
                    if (next) setDrafts((current) => ({ ...current, [next.id]: next }));
                    reload();
                  }}
                />
              )}
              {activeProject && pending && (
                <FinishingBar
                  current={activeProject.finishing || ""}
                  suggested={finishingSuggestions[activeProject.id] || ""}
                  onConfirm={(value) => void saveFinishing(value)}
                  onEdit={() => setFinishingOpen(true)}
                />
              )}

              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead className="text-xs font-black text-[#5c6a62]">
                    <tr className="border-b border-[#efe7d8]">
                      {pending && (
                        <th className="w-8 p-2">
                          <input
                            type="checkbox"
                            aria-label="تحديد الكل"
                            checked={allChecked}
                            onChange={() => setSelected(allChecked ? new Set() : new Set(rowIds))}
                            className="h-4 w-4 cursor-pointer accent-[#0d1f18]"
                          />
                        </th>
                      )}
                      {!activeProject && <th className="p-2">المشروع (من الجروب)</th>}
                      <th className="p-2">النوع</th>
                      <th className="p-2">المساحة</th>
                      <th className="p-2">السعر</th>
                      <th className="p-2">المقدم / التقسيط / التشطيب</th>
                      <th className="p-2">الاستلام</th>
                      <th className="p-2">جاية من</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => {
                      const match = item.match_unit_id ? matches.get(item.match_unit_id) ?? null : null;
                      const gaps = missing(item);
                      const twins = (duplicates[String(item.id)] ?? []).map((id) => itemById.get(id)).filter(Boolean) as WaInboxItem[];
                      const filled = autoFilled[String(item.id)] ?? {};
                      const rejectedAt = rejectedBefore[String(item.id)];
                      return (
                        <tr key={item.id} className={`border-b border-[#f4eee2] align-top ${selected.has(item.id) ? "bg-[#fffaf1]" : ""}`}>
                          {pending && (
                            <td className="p-2">
                              <input
                                type="checkbox"
                                aria-label="اختيار"
                                checked={selected.has(item.id)}
                                onChange={() => toggleSelect(item.id)}
                                className="mt-1 h-4 w-4 cursor-pointer accent-[#0d1f18]"
                              />
                            </td>
                          )}
                          {!activeProject && (
                            <td className="p-2">
                              <span className="font-black">{item.project_name || "—"}</span>
                              <span className="block text-xs text-[#5c6a62]">{item.developer || ""}</span>
                              {pending && (() => {
                                const suggestion = suggestions[String(item.id)];
                                const same = rows.filter((row) => row.id !== item.id && nameKey(row.project_name) === nameKey(item.project_name)).length;
                                if (!suggestion)
                                  return (
                                    <button onClick={() => setEditing(item)} className="mt-1 rounded-lg border border-dashed border-[#d8c9ab] px-2 py-1 text-[11px] font-black text-[#8a6630]">
                                      اختار المشروع أو اعمله جديد
                                    </button>
                                  );
                                return (
                                  <div className="mt-1 rounded-xl bg-[#fffaf1] p-2 ring-1 ring-[#ecdcbc]">
                                    <span className="block text-[11px] text-[#5c6a62]">تقصد ({WA_SUGGEST_LABELS[suggestion.kind]}):</span>
                                    <span className="block text-xs font-black" dir="ltr">{suggestion.name}؟</span>
                                    <div className="mt-1 flex gap-1">
                                      <button
                                        onClick={() => void linkProject(item, suggestion.project_id, suggestion.name)}
                                        disabled={busyId === item.id}
                                        className="rounded-lg bg-[#0d1f18] px-2 py-1 text-[11px] font-black text-white disabled:opacity-40"
                                      >
                                        {busyId === item.id ? "…" : `تأكيد${same ? ` (+${same})` : ""}`}
                                      </button>
                                      <button onClick={() => setEditing(item)} className="rounded-lg bg-white px-2 py-1 text-[11px] font-black ring-1 ring-[#e0d3bb]">
                                        غيّر
                                      </button>
                                    </div>
                                    {same > 0 && <span className="mt-1 block text-[10px] text-[#5c6a62]">هيتربط معاها {same} وحدة بنفس الاسم</span>}
                                  </div>
                                );
                              })()}
                            </td>
                          )}
                          <td className="p-2">
                            <span className="font-black">{item.unit_type || "—"}</span>
                            <span className="block text-xs text-[#5c6a62]">{item.bedrooms_text || ""}</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {match && <Badge tone="gold">هتحدّث وحدة موجودة</Badge>}
                              {twins.length > 0 && <Badge tone="pending">مكررة ×{twins.length + 1}</Badge>}
                              {pending && view === "review" &&
                                (doubts[String(item.id)] ?? [])
                                  .filter((reason) => reason !== "duplicate" && reason !== "rejected_before")
                                  .map((reason) => <Badge key={reason} tone="error">{WA_DOUBT_LABELS[reason]}</Badge>)}
                              {rejectedAt && <Badge tone="error">اترفضت قبل كده · {when(rejectedAt)}</Badge>}
                              {pending && noPhotos[String(item.id)] && <Badge tone="pending">المشروع مالوش صور · مش هتنزل لوحدها</Badge>}
                              {pending && !noPhotos[String(item.id)] && item.project_id && isReady(item) && (() => {
                                const check = photoChecks[item.project_id];
                                if (check?.status === "phone") return <Badge tone="error">صور المشروع عليها رقم تاني · مش هتنزل لوحدها</Badge>;
                                if (check?.status === "mismatch") return <Badge tone="error">صور المشروع محتاجة مراجعة · مش هتنزل لوحدها</Badge>;
                                return null;
                              })()}
                              {item.status === "approved" && <Badge tone="ok">اتوافق</Badge>}
                              {item.status === "rejected" && <Badge tone="muted">اترفض</Badge>}
                            </div>
                          </td>
                          <td className="p-2">{Number(item.area_sqm) ? `${Number(item.area_sqm)} م²` : "—"}</td>
                          <td className="p-2 font-bold">
                            {formatPrice(item.starting_price)}
                            {match && Number(match.starting_price) > 0 && (
                              <span className="block text-[11px] font-normal text-[#5c6a62]">الحالي: {formatPrice(match.starting_price)}</span>
                            )}
                          </td>
                          <td className="p-2 text-xs text-[#5c6a62]">
                            {item.down_payment_text || "—"}
                            <AutoMark source={filled.down_payment_text} />
                            <span className="block">
                              {item.installments_text || ""}
                              <AutoMark source={filled.installments_text} />
                            </span>
                            {item.finishing && (
                              <span className="block">
                                {item.finishing}
                                <AutoMark source={filled.finishing} />
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-xs text-[#5c6a62]">
                            {item.delivery_text || "—"}
                            <AutoMark source={filled.delivery_text} />
                          </td>
                          <td className="p-2 text-xs text-[#5c6a62]">
                            <span className="block font-bold text-[#1b2420]">{item.source_group || "جروب"}</span>
                            {when(item.created_at)}
                            {twins.length > 0 && (
                              <span className="mt-1 block text-[11px] text-amber-700">
                                برضه في: {[...new Set(twins.map((twin) => twin.source_group || "جروب"))].join("، ")}
                              </span>
                            )}
                            {pending && gaps.length > 0 && <span className="mt-1 block font-bold text-red-600">ناقص: {gaps.join("، ")}</span>}
                          </td>
                          <td className="p-2">
                            {pending && (
                              <div className="flex flex-wrap justify-end gap-1">
                                <button onClick={() => setEditing(item)} className="rounded-lg bg-[#f7f2ea] px-2 py-1 text-xs font-black">
                                  تعديل وصور
                                </button>
                                <button onClick={() => void reject([item.id])} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-red-600">
                                  ارفض
                                </button>
                                <button
                                  onClick={() => void quickApprove(item)}
                                  disabled={busyId === item.id}
                                  className="rounded-lg bg-[#0d1f18] px-2 py-1 text-xs font-black text-white disabled:opacity-40"
                                >
                                  {busyId === item.id ? "…" : "وافق"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!rows.length && unitQuery.trim() && (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-sm text-[#5c6a62]">مفيش وحدة فيها «{unitQuery.trim()}».</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {activeProject && (
              <div className="rounded-3xl border border-[#e7ddc8] bg-white p-4">
                <h3 className="mb-2 text-base font-black">الوحدات الموجودة على الموقع في {activeProject.name}</h3>
                {!siteUnits.length ? (
                  <p className="p-4 text-center text-sm text-[#5c6a62]">مفيش وحدات للمشروع ده على الموقع لسه.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-right text-sm">
                      <thead className="text-xs font-black text-[#5c6a62]">
                        <tr className="border-b border-[#efe7d8]">
                          <th className="p-2">النوع</th>
                          <th className="p-2">المساحة</th>
                          <th className="p-2">السعر</th>
                          <th className="p-2">المقدم / التقسيط</th>
                          <th className="p-2">الاستلام</th>
                          <th className="p-2">الحالة</th>
                          <th className="p-2">صور</th>
                        </tr>
                      </thead>
                      <tbody>
                        {siteUnits.map((unit) => {
                          const touched = rows.some((item) => item.match_unit_id === unit.id);
                          return (
                            <tr key={unit.id} className={`border-b border-[#f4eee2] ${touched ? "bg-[#fffaf1]" : ""}`}>
                              <td className="p-2">
                                <span className="font-black">{unit.unit_type || "—"}</span>
                                <span className="block text-xs text-[#5c6a62]">{unit.bedrooms_text || ""}</span>
                                {touched && <Badge tone="gold">جاله تحديث من واتساب</Badge>}
                              </td>
                              <td className="p-2">{unit.area_sqm ? `${unit.area_sqm} م²` : "—"}</td>
                              <td className="p-2 font-bold">{formatPrice(unit.starting_price)}</td>
                              <td className="p-2 text-xs text-[#5c6a62]">
                                {unit.down_payment_text || "—"}
                                <span className="block">{unit.installments_text || ""}</span>
                              </td>
                              <td className="p-2 text-xs text-[#5c6a62]">{unit.delivery_text || "—"}</td>
                              <td className="p-2">
                                <Badge tone={unit.availability_status === "available" ? "ok" : "muted"}>
                                  {STATUS_LABELS[String(unit.availability_status)] ?? unit.availability_status}
                                </Badge>
                              </td>
                              <td className="p-2 text-xs">{mediaImages(unit).length || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {editing && (
        <EditDialog
          item={editing}
          suggestion={suggestions[String(editing.id)] ?? null}
          filled={autoFilled[String(editing.id)] ?? {}}
          rejectedAt={rejectedBefore[String(editing.id)] ?? ""}
          projects={projects}
          onProjectCreated={onChanged}
          onClose={() => setEditing(null)}
          onDone={async (message) => {
            setEditing(null);
            notify(message);
            onChanged();
            reload();
          }}
        />
      )}
      {publishing && (
        <PublishDialog
          draft={publishing}
          readyUnits={items.filter((item) => item.draft_id === publishing.id && isReady(item)).length}
          allUnits={items.filter((item) => item.draft_id === publishing.id).length}
          onClose={(changed) => {
            setPublishing(null);
            if (changed) {
              onChanged();
              reload();
            }
          }}
        />
      )}
      {draftEditing && (
        <DraftEditDialog
          draft={draftEditing}
          onClose={() => setDraftEditing(null)}
          onSaved={() => {
            setDraftEditing(null);
            reload();
          }}
        />
      )}
      {groupsOpen && (
        <GroupsDialog
          onClose={() => setGroupsOpen(false)}
          developers={[...new Set(projects.map((project) => project.developer || "").filter(Boolean))].sort()}
        />
      )}
      {finishingOpen && activeProject && (
        <FinishingDialog
          project={activeProject}
          suggested={finishingSuggestions[activeProject.id] || ""}
          onClose={() => setFinishingOpen(false)}
          onSave={saveFinishing}
        />
      )}
    </div>
  );
}

const finishingText = (value: string) => (FINISHING_LABELS[value] ? `${value} (${FINISHING_LABELS[value]})` : value);

/** The open project's default finishing: shown, suggested from its units, or missing. */
function FinishingBar({ current, suggested, onConfirm, onEdit }: { current: string; suggested: string; onConfirm: (value: string) => void; onEdit: () => void }) {
  if (current)
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] bg-[#fbf8f2] px-4 py-2 text-xs">
        <span className="font-bold text-[#5c6a62]">التشطيب الافتراضي للمرحلة:</span>
        <b dir="ltr">{finishingText(current)}</b>
        <span className="text-[#5c6a62]">— أي وحدة من غير تشطيب بتاخده</span>
        <button onClick={onEdit} className="ms-auto rounded-full bg-white px-3 py-1 font-black ring-1 ring-[#e0d3bb]">تعديل</button>
      </div>
    );
  if (suggested)
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-[#ecdcbc] bg-[#fffaf1] px-4 py-2 text-xs">
        <span className="font-bold">كل وحدات المرحلة دي على الموقع تشطيبها</span>
        <b dir="ltr">{finishingText(suggested)}</b>
        <span className="text-[#5c6a62]">— تخليه التشطيب الافتراضي؟</span>
        <span className="ms-auto flex gap-1">
          <button onClick={() => onConfirm(suggested)} className="rounded-full bg-[#0d1f18] px-3 py-1 font-black text-white">تأكيد</button>
          <button onClick={onEdit} className="rounded-full bg-white px-3 py-1 font-black ring-1 ring-[#e0d3bb]">اختار غيره</button>
        </span>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] px-4 py-2 text-xs">
      <span className="text-[#5c6a62]">المرحلة دي مالهاش تشطيب افتراضي، فالوحدات اللي من غير تشطيب بتفضل فاضية.</span>
      <button onClick={onEdit} className="ms-auto rounded-full border border-[#d8c9ab] px-3 py-1 font-black text-[#8a6630]">حدّد التشطيب</button>
    </div>
  );
}

function FinishingDialog({ project, suggested, onClose, onSave }: { project: AdminProject; suggested: string; onClose: () => void; onSave: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(project.finishing || suggested);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`التشطيب الافتراضي — ${project.name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-[#5c6a62]">
        أي وحدة جاية من الواتساب للمرحلة دي من غير تشطيب هتاخد التشطيب ده (وعليها علامة «تلقائي»). لو الرسالة ذكرت تشطيب تاني، اللي في الرسالة هو اللي بيتحط.
      </p>
      <div className="min-h-[330px]">
        <FinishingSelect value={value} onChange={setValue} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">إلغاء</button>
        <button
          type="button"
          disabled={busy || value === (project.finishing || "")}
          onClick={async () => {
            setBusy(true);
            await onSave(value);
            setBusy(false);
          }}
          className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          {busy ? "بيحفظ…" : "احفظ"}
        </button>
      </div>
    </Modal>
  );
}

/** Small grey note after a detail the message did not give (filled from the site). */
function AutoMark({ source }: { source?: WaFillSource }) {
  if (!source) return null;
  return (
    <span title={`الرسالة ماذكرتهاش — ${WA_FILL_LABELS[source]}`} className="ms-1 rounded bg-sky-50 px-1 text-[10px] font-black text-sky-700">
      تلقائي
    </span>
  );
}

/** Fields that must be filled before the unit can go on the site. */
function missing(item: Pick<WaInboxItem, "project_id" | "unit_type" | "area_sqm" | "starting_price">) {
  const out: string[] = [];
  if (!item.project_id) out.push("المشروع");
  if (!item.unit_type) out.push("النوع");
  if (!Number(item.area_sqm)) out.push("المساحة");
  if (!Number(item.starting_price)) out.push("السعر");
  return out;
}

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const TEXT_INPUTS: { key: keyof WaInboxValues; label: string; placeholder: string }[] = [
  { key: "unit_type", label: "النوع *", placeholder: "Apartment / Villa / Chalet" },
  { key: "bedrooms_text", label: "الغرف", placeholder: "3 Bedrooms" },
  { key: "down_payment_text", label: "المقدم", placeholder: "10%" },
  { key: "installments_text", label: "التقسيط", placeholder: "8 years" },
  { key: "delivery_text", label: "الاستلام", placeholder: "2029" },
  { key: "finishing", label: "التشطيب", placeholder: "Fully Finished" },
  { key: "location", label: "المنطقة (للوحدة)", placeholder: "سيبها فاضية وتاخد منطقة المشروع" },
];

/** Every field of the unit in one form, plus the project's photos to attach: edit once, then save or approve once. */
function EditDialog({
  item,
  suggestion,
  filled,
  rejectedAt,
  projects,
  onProjectCreated,
  onClose,
  onDone,
}: {
  item: WaInboxItem;
  suggestion: WaProjectSuggestion | null;
  filled: Record<string, WaFillSource>;
  rejectedAt: string;
  projects: AdminProject[];
  onProjectCreated: () => void;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const { token, handleError, notify } = useAdmin();
  const [values, setValues] = useState<WaInboxValues>({
    project_id: item.project_id ?? "",
    location: item.location ?? "",
    unit_type: item.unit_type ?? "",
    bedrooms_text: item.bedrooms_text ?? "",
    area_sqm: item.area_sqm ?? "",
    starting_price: item.starting_price ?? "",
    down_payment_text: item.down_payment_text ?? "",
    installments_text: item.installments_text ?? "",
    delivery_text: item.delivery_text ?? "",
    finishing: item.finishing ?? "",
    description: item.description ?? "",
  });
  const [replaceId, setReplaceId] = useState(item.match_unit_id ?? "");
  const [availability, setAvailability] = useState<"available" | "new_launch">("available");
  const [unitsState, setUnitsState] = useState<{ projectId: string; units: AdminUnit[] }>({ projectId: "", units: [] });
  const [images, setImages] = useState<string[]>([]);
  const [extraProjects, setExtraProjects] = useState<AdminProject[]>([]);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const allProjects = useMemo(() => [...extraProjects, ...projects.filter((row) => !extraProjects.some((extra) => extra.id === row.id))], [projects, extraProjects]);
  const projectId = String(values.project_id || "");
  const liveProjects = useMemo(() => hideLegacyDuplicates(allProjects), [allProjects]);
  const project = allProjects.find((row) => row.id === projectId) ?? null;
  const projectOptions = useMemo(
    () =>
      [...(project && !liveProjects.includes(project) ? [project] : []), ...liveProjects].map((row) => ({
        value: row.id,
        label: `${row.name} — ${row.developer ?? ""}`,
        hint: row.area_group || row.location || "",
      })),
    [liveProjects, project],
  );

  // Units of the chosen project: which one this replaces (or none = new unit) and their photos.
  const units = useMemo(() => (unitsState.projectId === projectId ? unitsState.units : []), [unitsState, projectId]);
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    adminApi
      .units(token, projectId)
      .then((result) => active && setUnitsState({ projectId, units: result.units }))
      .catch(() => active && setUnitsState({ projectId, units: [] }));
    return () => {
      active = false;
    };
  }, [token, projectId]);

  /** Photos already on Supabase for this project: the project's own, then each unit's. */
  const photoGroups = useMemo(() => {
    const groups: { label: string; urls: string[] }[] = [];
    if (project) groups.push({ label: `صور المشروع (${project.name})`, urls: mediaImages(project) });
    for (const unit of units) {
      const urls = mediaImages(unit).filter((url) => !groups.some((group) => group.urls.includes(url)));
      if (urls.length) groups.push({ label: `${unit.unit_type || "وحدة"}${unit.area_sqm ? ` ${unit.area_sqm} م²` : ""}`, urls });
    }
    return groups.filter((group) => group.urls.length);
  }, [project, units]);
  const replacing = units.find((unit) => unit.id === replaceId) ?? null;

  const set = (key: keyof WaInboxValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const toggleImage = (url: string) => setImages((current) => (current.includes(url) ? current.filter((value) => value !== url) : [...current, url]));
  const gaps = missing({ project_id: projectId || null, unit_type: String(values.unit_type || ""), area_sqm: values.area_sqm ?? null, starting_price: values.starting_price ?? null });

  const submit = async (approve: boolean) => {
    setBusy(true);
    try {
      if (approve) {
        const result = await adminApi.waInboxApprove(token, item.id, values, replaceId, availability, images);
        await onDone(result.action === "update" ? "اتحدثت الوحدة الموجودة على الموقع" : "اتضافت وحدة جديدة على الموقع");
      } else {
        await adminApi.waInboxSave(token, item.id, values);
        await onDone("اتحفظت التعديلات — لسه مستنية موافقة");
      }
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const createProject = async (form: NewProject) => {
    setCreating(true);
    try {
      await adminApi.projectCreate(token, form);
      const data = await adminApi.projects(token);
      const created = data.projects.find((row) => row.name === form.name.trim() && row.area_group === form.area_group);
      if (created) {
        setExtraProjects([created]);
        set("project_id", created.id);
        setReplaceId("");
        setImages([]);
      }
      setNewProjectOpen(false);
      notify(`اتعمل مشروع ${form.name} — كمّل الوحدة ووافق`);
      onProjectCreated();
    } catch (error) {
      handleError(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title="تعديل الوحدة قبل الموافقة" onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-bold">المشروع *</span>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <SearchSelect
                options={projectOptions}
                value={projectId}
                onChange={(next) => {
                  set("project_id", next);
                  setReplaceId("");
                  setImages([]);
                }}
                placeholder={item.project_name ? `اللي جه من الجروب: ${item.project_name}` : "اختار المشروع"}
                dir="ltr"
              />
            </div>
            <button type="button" onClick={() => setNewProjectOpen(true)} className="shrink-0 rounded-xl border border-[#d8c9ab] px-3 py-2 text-xs font-black text-[#8a6630]">
              + مشروع جديد
            </button>
          </div>
          {!projectId && suggestion && (
            <button
              type="button"
              onClick={() => set("project_id", suggestion.project_id)}
              className="mt-1 block rounded-lg bg-[#fffaf1] px-2 py-1 text-xs font-black text-[#8a6630] ring-1 ring-[#ecdcbc]"
            >
              اقتراح ({WA_SUGGEST_LABELS[suggestion.kind]}): <span dir="ltr">{suggestion.name}</span> — استخدمه
            </button>
          )}
          {!projectId && item.project_name && (
            <span className="mt-1 block text-xs text-red-600">
              «{item.project_name}» مش موجود على الموقع. اختاره من القايمة لو موجود باسم تاني، أو دوس «+ مشروع جديد».
            </span>
          )}
        </div>

        {TEXT_INPUTS.map(({ key, label, placeholder }) => (
          <label key={key} className="block text-sm">
            <span className="mb-1 block font-bold">{label}</span>
            {key === "finishing" ? (
              <div className={filled[key] && values[key] === item[key as keyof WaInboxItem] ? "rounded-xl ring-2 ring-sky-300" : ""}>
                <FinishingSelect value={String(values[key] ?? "")} onChange={(next) => set(key, next)} />
              </div>
            ) : (
              <input
                value={String(values[key] ?? "")}
                onChange={(event) => set(key, event.target.value)}
                placeholder={placeholder}
                className={`${inputClass} ${filled[key] && values[key] === item[key as keyof WaInboxItem] ? "border-sky-300 bg-sky-50" : ""}`}
              />
            )}
            {filled[key] && (
              <span className="mt-1 block text-[11px] font-bold text-sky-700">الرسالة ماذكرتهاش — اتملت {WA_FILL_LABELS[filled[key]]}. راجعها.</span>
            )}
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block font-bold">المساحة (م²) *</span>
          <input inputMode="decimal" value={String(values.area_sqm ?? "")} onChange={(event) => set("area_sqm", event.target.value)} placeholder="165" className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">السعر (جنيه) *</span>
          <input
            inputMode="numeric"
            value={String(values.starting_price ?? "")}
            onChange={(event) => set("starting_price", event.target.value)}
            placeholder="9850000"
            className={inputClass}
          />
          {Number(String(values.starting_price ?? "").replace(/,/g, "")) > 0 && (
            <span className="mt-1 block text-xs text-[#5c6a62]">{formatPrice(String(values.starting_price).replace(/,/g, ""))}</span>
          )}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">الحالة على الموقع</span>
          <select value={availability} onChange={(event) => setAvailability(event.target.value as "available" | "new_launch")} className={inputClass}>
            <option value="available">{STATUS_LABELS.available}</option>
            <option value="new_launch">{STATUS_LABELS.new_launch}</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-bold">الوصف</span>
          <textarea value={String(values.description ?? "")} onChange={(event) => set("description", event.target.value)} rows={3} className={inputClass} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-bold">دي وحدة جديدة ولا تحديث لوحدة موجودة؟</span>
          <select value={replaceId} onChange={(event) => setReplaceId(event.target.value)} className={inputClass} disabled={!projectId}>
            <option value="">وحدة جديدة (تتضاف)</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                تحديث: {unit.unit_type} {unit.area_sqm ?? "—"} م² — {formatPrice(unit.starting_price)} ({STATUS_LABELS[unit.availability_status || ""] || unit.availability_status})
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold">صور الوحدة (من الصور اللي على Supabase)</span>
            {images.length > 0 && (
              <button type="button" onClick={() => setImages([])} className="text-xs font-bold text-[#8a6630] underline">
                شيل الاختيار ({images.length})
              </button>
            )}
          </div>
          {!projectId ? (
            <p className="rounded-xl bg-[#f7f2ea] p-3 text-xs text-[#5c6a62]">اختار المشروع الأول عشان تظهر صوره.</p>
          ) : !photoGroups.length ? (
            <p className="rounded-xl bg-[#f7f2ea] p-3 text-xs text-[#5c6a62]">المشروع ده مافيهوش صور لسه. ارفعها من تابة الصور، والوحدة هتعرض صور المشروع تلقائيًا.</p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-[#efe6d4] p-3">
              {photoGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 text-xs font-black text-[#5c6a62]">{group.label}</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {group.urls.map((url) => {
                      const order = images.indexOf(url);
                      return (
                        <button
                          type="button"
                          key={url}
                          onClick={() => toggleImage(url)}
                          className={`relative overflow-hidden rounded-lg border-2 ${order >= 0 ? "border-[#a3854e]" : "border-transparent"}`}
                        >
                          <img src={url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                          {order >= 0 && (
                            <span className="absolute right-1 top-1 rounded-full bg-[#0d1f18] px-1.5 text-[10px] font-black text-white">
                              {order === 0 ? "غلاف" : order + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-[#5c6a62]">
                أول صورة تختارها بتبقى الغلاف.{" "}
                {replacing
                  ? images.length
                    ? "الصور دي هتحل محل صور الوحدة الحالية."
                    : `لو ماختارتش صور، الوحدة الحالية هتفضل بصورها (${mediaImages(replacing).length}).`
                  : "لو ماختارتش صور، الوحدة هتعرض صور المشروع تلقائيًا."}
              </p>
            </div>
          )}
        </div>
      </div>

      {rejectedAt && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
          وحدة بنفس المشروع والنوع والمساحة والسعر اترفضت قبل كده ({when(rejectedAt)}).
        </p>
      )}
      {gaps.length > 0 && <p className="mt-3 text-sm font-bold text-red-600">لازم تكمّل: {gaps.join("، ")} قبل الموافقة.</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">
          إلغاء
        </button>
        <button type="button" disabled={busy} onClick={() => void submit(false)} className="rounded-full bg-[#f1eadc] px-5 py-2 text-sm font-black disabled:opacity-40">
          احفظ بس
        </button>
        <button
          type="button"
          disabled={busy || gaps.length > 0}
          onClick={() => void submit(true)}
          className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          {busy ? "بيحفظ…" : "✅ احفظ ووافق"}
        </button>
      </div>

      {newProjectOpen && (
        <ProjectForm
          projects={projects}
          initial={{ name: item.project_name ?? "", developer: item.developer ?? "", area_group: item.area_group ?? "" }}
          busy={creating}
          onCancel={() => setNewProjectOpen(false)}
          onSubmit={(form) => void createProject(form)}
        />
      )}
    </Modal>
  );
}

/** On/off per WhatsApp group. Off = the group's messages are skipped (no AI cost, nothing reaches this tab). */
const DRAFT_FIELD_ORDER: WaDraftField[] = [
  "name", "name_ar", "developer", "area_group", "sub_area", "location", "down_payment_text", "installments_text", "delivery_text", "finishing", "description",
];

/** A new project's facts from the web: trusted (2+ sites or confirmed), weak (one site: «أكّد») or missing. */
function DraftPanel({ draft, onEdit, onPublish, onChanged }: { draft: WaDraft; onEdit: () => void; onPublish: () => void; onChanged: (draft: WaDraft | null) => void }) {
  const { token, notify, handleError } = useAdmin();
  const [busy, setBusy] = useState("");
  const run = async (key: string, task: () => Promise<WaDraft | null>, done: string) => {
    setBusy(key);
    try {
      const next = await task();
      notify(done);
      onChanged(next);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy("");
    }
  };
  const trusted = (field: WaDraftField) => draft.confirmed.includes(field) || (draft.sources[field]?.length ?? 0) >= 2;
  return (
    <div className="space-y-3 border-b border-[#efe7d8] bg-[#fbf8f2] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={draft.status === "ready" ? "ok" : draft.status === "researching" ? "pending" : "error"}>
          {draft.status === "ready" ? "بيانات المشروع كاملة" : draft.status === "researching" ? "بندوّر عليه على النت" : "محتاج مراجعة"}
        </Badge>
        {draft.doubts.map((code) => <Badge key={code} tone="error">{waDraftDoubtLabel(code)}</Badge>)}
        <span className="me-auto" />
        {draft.status === "ready" && (
          <button onClick={onPublish} className="rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-black text-white">
            انشر المشروع
          </button>
        )}
        <button onClick={onEdit} className="rounded-full bg-[#0d1f18] px-4 py-1.5 text-xs font-black text-white">تعديل بيانات المشروع</button>
        <button
          disabled={Boolean(busy)}
          onClick={() => void run("research", async () => (await adminApi.waDraftResearch(token, draft.id)).draft, "اتعمل بحث جديد")}
          className="rounded-full border border-[#d8c9ab] px-4 py-1.5 text-xs font-black disabled:opacity-50"
        >
          {busy === "research" ? "بيدوّر… (دقيقة أو اتنين)" : "ابحث تاني"}
        </button>
        <button
          disabled={Boolean(busy)}
          onClick={() => {
            if (!window.confirm(`«${draft.name}» مش مشروع حقيقي؟ وحداته هترجع «مش متطابقة».`)) return;
            void run("reject", async () => { await adminApi.waDraftReject(token, draft.id); return null; }, "اتشال المشروع");
          }}
          className="rounded-full bg-red-50 px-4 py-1.5 text-xs font-black text-red-600 disabled:opacity-50"
        >
          مش مشروع حقيقي
        </button>
      </div>
      {draft.research_error && <p className="text-xs font-bold text-red-600">البحث وقف: {draft.research_error}</p>}
      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {DRAFT_FIELD_ORDER.map((field) => {
          const value = draft[field];
          const sources = draft.sources[field] ?? [];
          return (
            <div key={field} className={`flex items-start gap-2 ${field === "description" ? "sm:col-span-2" : ""}`}>
              <dt className="w-28 shrink-0 text-xs font-bold text-[#5c6a62]">{WA_DRAFT_FIELD_LABELS[field]}</dt>
              <dd className="min-w-0 flex-1">
                {value ? <span className="font-bold">{value}</span> : <span className="text-[#9aa49e]">—</span>}
                {draft.confirmed.includes(field) && <span className="ms-1 text-[11px] font-black text-emerald-700">✓ إنت أكدته</span>}
                {!draft.confirmed.includes(field) && sources.length > 0 && (
                  <span className="ms-1 text-[11px]">
                    {sources.slice(0, 3).map((url, index) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="me-1 text-[#8a6d2f] underline">
                        مصدر {index + 1}
                      </a>
                    ))}
                  </span>
                )}
                {value && !trusted(field) && (
                  <button
                    disabled={Boolean(busy)}
                    onClick={() => void run(field, async () => (await adminApi.waDraftSave(token, draft.id, {}, [field])).draft, `اتأكد: ${WA_DRAFT_FIELD_LABELS[field]}`)}
                    className="ms-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700"
                  >
                    أكّد
                  </button>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

const STEP_TEXT: Record<BatchStep, string> = {
  waiting: "مستني", write: "بيكتب المقال…", save: "بيحفظ ويشيّك…", done: "خلص", failed: "وقف", skipped: "اتساب",
};

/**
 * «انشر المشروع»: the project goes on the site with its ready units, then the site's writing tool writes the
 * Arabic and English articles; each is published when the server's review passes, else it stays a draft.
 */
function PublishDialog({ draft, readyUnits, allUnits, onClose }: { draft: WaDraft; readyUnits: number; allUnits: number; onClose: (changed: boolean) => void }) {
  const { token, handleError } = useAdmin();
  const [phase, setPhase] = useState<"confirm" | "project" | "articles" | "done">("confirm");
  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState<Record<BatchLanguage, string>>({ ar: "مستني", en: "مستني" });
  const [results, setResults] = useState<PublishResult[]>([]);
  const running = phase === "project" || phase === "articles";

  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const start = async () => {
    setPhase("project");
    let projectId = "";
    try {
      const result = await adminApi.waPublishDraft(token, draft.id);
      projectId = result.project_id;
      setSummary(
        `${result.created ? "اتعمل المشروع على الموقع" : "المشروع كان موجود على الموقع، والوحدات اتضافت عليه"} · اتوافق على ${result.approved} وحدة` +
          (result.left_for_review ? ` · ${result.left_for_review} وحدة فضلت في «محتاج مراجعة»` : ""),
      );
      if (!result.created) return setPhase("done");
    } catch (error) {
      handleError(error);
      return setPhase("confirm");
    }
    setPhase("articles");
    const done = await writeAndPublishProjectArticles(token, projectId, (language, step, wait) =>
      setSteps((current) => ({ ...current, [language]: wait ? `مستني حد الطلبات (${wait} ث)` : STEP_TEXT[step] })),
    );
    setResults(done);
    setPhase("done");
  };

  return (
    <Modal title={`انشر «${draft.name}»`} onClose={() => !running && onClose(phase === "done")}>
      {phase === "confirm" ? (
        <div className="space-y-2 text-sm">
          <p className="font-black">اللي هيحصل:</p>
          <ul className="list-disc space-y-1 ps-5 text-[#3d4a43]">
            <li>المشروع هيتعمل على الموقع ببياناته اللي فوق ({draft.developer} · {[draft.sub_area, draft.area_group].filter(Boolean).join("، ")}).</li>
            <li>{readyUnits} وحدة جاهزة من {allUnits} هتتوافق وتنزل معاه. الباقي يفضل في «محتاج مراجعة» تحت نفس المشروع.</li>
            <li>أداة الكتابة هتكتب المقال عربي وبعده إنجليزي (حوالي 5–10 دقايق)، وكل مقال بيتنشر لوحده لو عدّى التشييك. لو ما عدّاش بيفضل مسودة في «مقالات ناقصة».</li>
          </ul>
          <p className="text-xs text-[#5c6a62]">سيب الصفحة مفتوحة لحد ما يخلص.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => onClose(false)} className="rounded-full bg-[#f1eadc] px-4 py-2 text-sm font-black">إلغاء</button>
            <button onClick={() => void start()} className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-black text-white">انشر</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="font-bold">{phase === "project" ? "بيعمل المشروع ويوافق على الوحدات…" : summary}</p>
          {phase !== "project" && results.length === 0 && phase === "articles" && (
            <ul className="space-y-1">
              <li>المقال العربي: {steps.ar}</li>
              <li>المقال الإنجليزي: {steps.en}</li>
            </ul>
          )}
          {results.length > 0 && (
            <ul className="space-y-1">
              {results.map((result) => (
                <li key={result.language} className="flex flex-wrap items-center gap-2">
                  <span>{result.language === "ar" ? "المقال العربي" : "المقال الإنجليزي"}:</span>
                  {result.published ? (
                    <Badge tone="ok">اتنشر</Badge>
                  ) : result.articleId ? (
                    <Badge tone="pending">مسودة: ما عدّاش التشييك ({result.error})، راجعه في «المقالات»</Badge>
                  ) : (
                    <Badge tone="error">ما اتكتبش ({result.error})</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
          {phase === "done" && (
            <div className="flex justify-end">
              <button onClick={() => onClose(true)} className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white">قفل</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Edit a new project's facts; every field changed here counts as confirmed by the admin. */
function DraftEditDialog({ draft, onClose, onSaved }: { draft: WaDraft; onClose: () => void; onSaved: () => void }) {
  const { token, notify, handleError } = useAdmin();
  const [values, setValues] = useState<Record<WaDraftField, string>>(
    () => Object.fromEntries(DRAFT_FIELD_ORDER.map((field) => [field, draft[field] ?? ""])) as Record<WaDraftField, string>,
  );
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const changed = Object.fromEntries(DRAFT_FIELD_ORDER.filter((field) => values[field].trim() !== (draft[field] ?? "")).map((field) => [field, values[field].trim()]));
    if (!Object.keys(changed).length) return onClose();
    setSaving(true);
    try {
      await adminApi.waDraftSave(token, draft.id, changed);
      notify("اتحفظت بيانات المشروع");
      onSaved();
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={`بيانات «${draft.name}»`} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        {DRAFT_FIELD_ORDER.map((field) => (
          <label key={field} className={`block text-sm font-bold ${field === "description" ? "sm:col-span-2" : ""}`}>
            {WA_DRAFT_FIELD_LABELS[field]}
            {field === "area_group" ? (
              <select value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })} className={`${inputClass} mt-1`}>
                <option value="">—</option>
                {AREA_GROUPS.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            ) : field === "description" ? (
              <textarea rows={3} value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })} className={`${inputClass} mt-1`} />
            ) : (
              <input value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })} className={`${inputClass} mt-1`} />
            )}
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full bg-[#f1eadc] px-4 py-2 text-sm font-black">إلغاء</button>
        <button disabled={saving} onClick={() => void save()} className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-50">
          {saving ? "بيحفظ…" : "احفظ"}
        </button>
      </div>
    </Modal>
  );
}

const MODE_LABELS: Record<WaResearchMode, string> = { intensive: "مكثف", normal: "عادي", off: "متوقف" };
/** What runs in each mode (shown under the switch). */
const MODE_HINTS: Record<WaResearchMode, string> = {
  intensive:
    "بيدوّر على المشاريع الجديدة على النت كل 15 دقيقة، مشروعين في المرة، لحد 40 في اليوم. والرسايل اللي الفلتر بيرميها بتتسجل للمراجعة من غير ما تروح لـ Claude. وبيرجع «عادي» لوحده في الميعاد اللي تحدده.",
  normal: "بيدوّر على المشاريع الجديدة كل 6 ساعات، مشروعين في المرة، لحد 8 في اليوم.",
  off: "مفيش بحث على النت ولا صرف. الوحدات بتفضل توصل من الجروبات وتتربط بالمشاريع المعروفة عادي.",
};

/** How much Claude spends on new projects (and whether short WhatsApp messages are read too). */
function ResearchModeBox() {
  const { token, notify, handleError } = useAdmin();
  const [settings, setSettings] = useState<WaResearchSettings | null>(null);
  const [mode, setMode] = useState<WaResearchMode>("normal");
  const [cap, setCap] = useState("");
  const [until, setUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const load = (next: WaResearchSettings) => {
    setSettings(next);
    setMode(next.chosen);
    setCap(String(next.cap || ""));
    setUntil(next.until ? next.until.slice(0, 16) : "");
  };
  useEffect(() => {
    adminApi.waResearchSettings(token).then(load).catch(handleError);
  }, [token, handleError]);
  const save = async () => {
    setSaving(true);
    try {
      load(await adminApi.waResearchSettingsSave(token, mode, cap ? Number(cap) : null, until ? new Date(until).toISOString() : ""));
      notify("اتحفظ وضع البحث");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };
  if (!settings) return null;
  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-[#e7ddc8] bg-[#fbf8f2] p-3 text-sm">
      <p className="font-black">
        البحث عن المشاريع الجديدة: {MODE_LABELS[settings.mode]}
        <span className="ms-2 text-xs font-bold text-[#5c6a62]">النهارده {settings.used_today} من {settings.cap}</span>
      </p>
      <ul className="space-y-0.5 text-[11px] leading-5">
        {(Object.keys(MODE_LABELS) as WaResearchMode[]).map((key) => (
          <li key={key} className={key === mode ? "font-black text-[#0d1f18]" : "text-[#7a857f]"}>
            <span className="font-black">{MODE_LABELS[key]}:</span> {MODE_HINTS[key]}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold">
          الوضع
          <select value={mode} onChange={(event) => setMode(event.target.value as WaResearchMode)} className={`${inputClass} mt-1 py-1`}>
            {(Object.keys(MODE_LABELS) as WaResearchMode[]).map((key) => <option key={key} value={key}>{MODE_LABELS[key]}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold">
          حد أقصى في اليوم
          <input type="number" min={1} max={200} value={cap} onChange={(event) => setCap(event.target.value)} className={`${inputClass} mt-1 w-24 py-1`} />
        </label>
        {mode === "intensive" && (
          <label className="text-xs font-bold">
            المكثف لحد (وبعدها عادي لوحده)
            <input type="datetime-local" value={until} onChange={(event) => setUntil(event.target.value)} className={`${inputClass} mt-1 py-1`} />
          </label>
        )}
        <button disabled={saving} onClick={() => void save()} className="rounded-full bg-[#0d1f18] px-4 py-1.5 text-xs font-black text-white disabled:opacity-50">
          {saving ? "بيحفظ…" : "احفظ"}
        </button>
      </div>
    </div>
  );
}

function GroupsDialog({ onClose, developers }: { onClose: () => void; developers: string[] }) {
  const { token, handleError } = useAdmin();
  const [groups, setGroups] = useState<WaGroup[] | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    adminApi
      .waGroups(token)
      .then((result) => setGroups(result.groups))
      .catch((error) => {
        handleError(error);
        setGroups([]);
      });
  }, [token, handleError]);

  const toggle = async (group: WaGroup) => {
    setBusy(group.group_id);
    try {
      const result = await adminApi.waGroupToggle(token, group.group_id, !group.track);
      setGroups(result.groups);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy("");
    }
  };

  /** The group's usual developer: used only when a message from it names no developer. */
  const saveDeveloper = async (group: WaGroup, developer: string) => {
    if (developer.trim() === (group.developer || "")) return;
    setBusy(group.group_id);
    try {
      const result = await adminApi.waGroupDeveloper(token, group.group_id, developer.trim());
      setGroups(result.groups);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal title="جروبات الواتساب" onClose={onClose}>
      <ResearchModeBox />

      <p className="mb-3 text-sm text-[#5c6a62]">
        أي جروب جديد بيتضاف هنا لوحده وشغال. اقفل أي جروب مش جروب مطور (شات، شخصي…) وهيتم تجاهل رسايله.
      </p>
      {groups === null ? (
        <p className="py-6 text-center text-sm">بيحمّل…</p>
      ) : !groups.length ? (
        <p className="py-6 text-center text-sm">لسه مفيش جروبات اتسجلت.</p>
      ) : (
        <ul className="divide-y divide-[#efe6d4]">
          {groups.map((group) => (
            <li key={group.group_id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{group.name || group.group_id}</p>
                <p className="text-[11px] text-[#5c6a62]">
                  {group.messages} رسالة · آخر رسالة {when(group.last_seen_at)}
                </p>
                <div className="mt-1 text-xs">
                  <SearchSelect
                    options={[...new Set([...(group.developer ? [group.developer] : []), ...developers])].map((name) => ({ value: name, label: name }))}
                    value={group.developer || ""}
                    onChange={(value) => void saveDeveloper(group, value)}
                    placeholder="مطور الجروب (بيتاخد بس لو الرسالة مكتبتش المطور)"
                    emptyLabel="مفيش مطور للجروب ده"
                    allowNew
                    newLabel="مطور جديد"
                    dir="ltr"
                  />
                </div>
              </div>
              <button
                onClick={() => void toggle(group)}
                disabled={busy === group.group_id}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-black disabled:opacity-40 ${group.track ? "bg-emerald-50 text-emerald-700" : "bg-[#f1eadc] text-[#5c6a62]"}`}
              >
                {group.track ? "شغال" : "متوقف"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Lowercase, Arabic digits → 0-9, أ/إ/آ → ا, ة → ه, ى → ي, so "تاون هاوس" / "٢٢٠" match the way the groups write them. */
function searchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/,/g, "");
}

/**
 * One project with no photos in «مشاريع ناقصها صور»: its suggested photos from the developer's website
 * (pick, then «ضيف»), or the result of the last search with «دوّر تاني».
 */
function PhotoGapRow({
  gap,
  suggestion,
  onUnits,
  onOpenPhotos,
  onSuggestion,
  onAdded,
}: {
  gap: WaPhotoGap;
  suggestion: WaPhotoSuggestion | null;
  onUnits: () => void;
  onOpenPhotos?: () => void;
  onSuggestion: (next: WaPhotoSuggestion) => void;
  onAdded: () => void;
}) {
  const { token, notify, handleError } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  /** Photo open in the big viewer (index in suggestion.urls), or null. */
  const [viewing, setViewing] = useState<number | null>(null);
  const toggleDrop = (url: string) =>
    setDropped((current) => {
      const next = new Set(current);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  const pending = suggestion?.status === "pending";
  const picked = pending ? suggestion.urls.filter((url) => !dropped.has(url)) : [];

  const search = async () => {
    setBusy(true);
    try {
      const result = await adminApi.waPhotoSuggest(token, gap.project_id);
      onSuggestion(result.suggestion);
      setDropped(new Set());
      notify(result.suggestion.status === "pending" ? `لقينا ${result.suggestion.urls.length} صورة لـ ${gap.name}` : `ما لقيناش صور لـ ${gap.name}`);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };
  const add = async () => {
    if (!suggestion || !picked.length) return;
    if (!window.confirm(`تضيف ${picked.length} صورة لـ ${gap.name}؟ هتظهر على الموقع، ووحداته الجاهزة هتنزل لوحدها في المرة الجاية.`)) return;
    setBusy(true);
    try {
      const result = await adminApi.waPhotoSuggestApprove(token, suggestion.id, picked);
      notify(`اتضافت ${result.added} صورة لـ ${gap.name}`);
      onAdded();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };
  const reject = async () => {
    if (!suggestion || !window.confirm(`ترفض صور ${gap.name} المقترحة؟`)) return;
    setBusy(true);
    try {
      await adminApi.waPhotoSuggestReject(token, suggestion.id);
      onSuggestion({ ...suggestion, status: "rejected" });
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl bg-white p-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 me-auto">
          <span className="block truncate font-black">{gap.name}</span>
          <span className="block truncate text-[#5c6a62]">
            {gap.developer || "—"} · {gap.waiting} وحدة جاهزة
          </span>
        </span>
        <button onClick={onUnits} className="rounded-full bg-[#f1eadc] px-2.5 py-1 font-black">
          الوحدات
        </button>
        {onOpenPhotos && (
          <button onClick={onOpenPhotos} className="rounded-full bg-[#0d1f18] px-2.5 py-1 font-black text-white">
            ارفع صور
          </button>
        )}
      </div>
      {pending ? (
        <div className="mt-2">
          <p className="font-bold text-emerald-700">
            صور مقترحة من النت ({suggestion.urls.length})
            {suggestion.source_page && (
              <a href={suggestion.source_page} target="_blank" rel="noreferrer" className="ms-1 underline">
                الصفحة
              </a>
            )}
            <span className="ms-1 font-normal text-[#5c6a62]">· دوس على الصورة تكبر، و✕ تشيلها</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {suggestion.urls.map((url, index) => {
              const off = dropped.has(url);
              return (
                <span key={url} className={`relative h-16 w-24 overflow-hidden rounded-lg ring-2 ${off ? "ring-transparent" : "ring-emerald-500"}`}>
                  <button onClick={() => setViewing(index)} className="block h-full w-full" title="كبّر الصورة">
                    <img src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${off ? "opacity-30" : ""}`} />
                  </button>
                  <button
                    onClick={() => toggleDrop(url)}
                    className={`absolute left-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full text-[11px] font-black text-white ${off ? "bg-emerald-600" : "bg-red-600"}`}
                    title={off ? "رجّعها" : "شيلها"}
                  >
                    {off ? "↺" : "✕"}
                  </button>
                  {!off && picked[0] === url && <span className="absolute bottom-0 right-0 rounded-tl bg-emerald-600 px-1 text-[9px] font-black text-white">غلاف</span>}
                </span>
              );
            })}
          </div>
          {suggestion.reason && <p className="mt-1 text-[#5c6a62]">اتشالت صور: {suggestion.reason}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button disabled={busy || !picked.length} onClick={() => void add()} className="rounded-full bg-emerald-600 px-3 py-1 font-black text-white disabled:opacity-50">
              {busy ? "…" : `ضيف المختار (${picked.length})`}
            </button>
            <button disabled={busy} onClick={() => void reject()} className="rounded-full bg-red-50 px-3 py-1 font-black text-red-600 disabled:opacity-50">
              ارفض
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="me-auto text-[#5c6a62]">
            {!suggestion
              ? "لسه ما دوّرناش على صوره"
              : suggestion.status === "none"
                ? `ما لقيناش صور: ${suggestion.reason || "—"}`
                : suggestion.status === "error"
                  ? "البحث ما اشتغلش، هنجرّب تاني بكرة"
                  : suggestion.status === "rejected"
                    ? "رفضت الصور المقترحة"
                    : "الصور اتضافت"}
          </span>
          <button disabled={busy} onClick={() => void search()} className="rounded-full border border-[#d8c9ab] px-2.5 py-1 font-black disabled:opacity-50">
            {busy ? "بيدوّر… (حوالي دقيقة)" : suggestion ? "دوّر تاني" : "دوّر دلوقتي"}
          </button>
        </div>
      )}
      {pending && viewing !== null && (
        <PhotoViewer
          title={gap.name}
          urls={suggestion.urls}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          isOff={(url) => dropped.has(url)}
          onToggle={toggleDrop}
        />
      )}
    </li>
  );
}

/**
 * Big photo viewer: the photo fills the screen (dark background), ← → or the arrows go to the next photo,
 * Esc or ✕ closes, a click on the photo shows it at full size (scroll to read small text).
 * With onToggle, «شيلها / رجّعها» decides the photo right here.
 */
function PhotoViewer({
  title,
  urls,
  index,
  onIndex,
  onClose,
  isOff,
  onToggle,
}: {
  title: string;
  urls: string[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  isOff?: (url: string) => boolean;
  onToggle?: (url: string) => void;
}) {
  const [full, setFull] = useState(false);
  const url = urls[index];
  const go = (step: number) => {
    setFull(false);
    onIndex((index + step + urls.length) % urls.length);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // The admin is right-to-left: ← is the next photo, → the previous one.
      if (event.key === "ArrowLeft") go(1);
      if (event.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!url) return null;
  const off = isOff?.(url) ?? false;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white" onClick={onClose}>
      <div className="flex items-center gap-2 p-3 text-sm" onClick={(event) => event.stopPropagation()}>
        <span className="me-auto truncate font-black">
          {title} · صورة {index + 1} من {urls.length}
          {off && <span className="ms-2 rounded-full bg-red-600 px-2 py-0.5 text-xs">مش هتتضاف</span>}
          <span className="block text-xs font-normal text-white/70">دوس على الصورة تكبر لحجمها الحقيقي</span>
        </span>
        {onToggle && (
          <button onClick={() => onToggle(url)} className={`rounded-full px-3 py-1.5 font-black ${off ? "bg-emerald-600" : "bg-red-600"}`}>
            {off ? "رجّعها" : "شيلها"}
          </button>
        )}
        <a href={url} target="_blank" rel="noreferrer" className="rounded-full bg-white/15 px-3 py-1.5 font-black">
          افتحها في تابة
        </a>
        <button onClick={onClose} className="rounded-full bg-white/15 px-3 py-1.5 font-black" title="اقفل (Esc)">
          ✕
        </button>
      </div>
      <div className={`relative min-h-0 flex-1 ${full ? "overflow-auto" : "grid place-items-center overflow-hidden"} px-1 pb-4 sm:px-12`}>
        <img
          src={url}
          alt=""
          onClick={(event) => {
            event.stopPropagation();
            setFull((value) => !value);
          }}
          className={full ? "max-w-none cursor-zoom-out" : `max-h-full max-w-full cursor-zoom-in object-contain ${off ? "opacity-40" : ""}`}
          title={full ? "صغّرها" : "كبّرها للحجم الحقيقي"}
        />
      </div>
      {urls.length > 1 && (
        <>
          <button
            onClick={(event) => {
              event.stopPropagation();
              go(-1);
            }}
            className="fixed right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-2xl font-black"
            title="اللي قبلها"
          >
            ›
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              go(1);
            }}
            className="fixed left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-2xl font-black"
            title="اللي بعدها"
          >
            ‹
          </button>
        </>
      )}
    </div>
  );
}
