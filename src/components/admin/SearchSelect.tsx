import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi, AREA_GROUPS, FINISHING_LABELS, FINISHING_OPTIONS, subAreaOptions, type AdminDeveloper, type AdminProject } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { inputClass } from "./ui";

export interface SelectOption {
  value: string;
  label?: string;
  hint?: string;
}

const key = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "");

/**
 * A dropdown you can search in. Only values from the list can be picked, so the same name is
 * never typed two different ways. allowNew adds one explicit "+ new" row when nothing matches.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  allowNew,
  newLabel = "جديد",
  emptyLabel,
  dir,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string, isNew: boolean) => void;
  placeholder: string;
  allowNew?: boolean;
  newLabel?: string;
  /** Shown as the first row; picking it clears the value. */
  emptyLabel?: string;
  dir?: "ltr" | "rtl";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const needle = key(query);
  const shown = useMemo(
    () => options.filter((option) => !needle || key(`${option.value} ${option.label ?? ""} ${option.hint ?? ""}`).includes(needle)).slice(0, 80),
    [options, needle],
  );
  const exact = options.some((option) => key(option.value) === needle);
  const current = options.find((option) => option.value === value);

  const pick = (next: string, isNew = false) => {
    onChange(next, isNew);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className={`${inputClass} flex items-center justify-between gap-2 text-right`}
        dir={dir}
      >
        <span className={`truncate ${value ? "font-bold" : "text-[#8a958f]"}`}>{value ? current?.label || value : placeholder}</span>
        <span className="shrink-0 text-xs text-[#8a958f]">▾</span>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-xl border border-[#e7ddc8] bg-white p-2 shadow-xl">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="🔍 ابحث…"
            className={inputClass}
            dir={dir}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (shown[0]) pick(shown[0].value);
                else if (allowNew && query.trim()) pick(query.trim(), true);
              }
              if (event.key === "Escape") setOpen(false);
            }}
          />
          <ul className="mt-1 max-h-64 overflow-y-auto">
            {emptyLabel && (
              <li>
                <button type="button" onClick={() => pick("")} className="w-full rounded-lg px-3 py-2 text-right text-sm text-[#5c6a62] hover:bg-[#f7f2ea]">
                  {emptyLabel}
                </button>
              </li>
            )}
            {shown.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => pick(option.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-right text-sm hover:bg-[#f7f2ea] ${option.value === value ? "bg-[#f1eadc] font-black" : ""}`}
                  dir={dir}
                >
                  <span className="truncate">{option.label || option.value}</span>
                  {option.hint && <span className="shrink-0 text-[11px] text-[#5c6a62]">{option.hint}</span>}
                </button>
              </li>
            ))}
            {!shown.length && !allowNew && <li className="px-3 py-2 text-sm text-[#5c6a62]">مفيش نتايج</li>}
            {allowNew && query.trim() && !exact && (
              <li>
                <button
                  type="button"
                  onClick={() => pick(query.trim(), true)}
                  className="w-full rounded-lg bg-[#fffaf1] px-3 py-2 text-right text-sm font-black text-[#8a6630] hover:bg-[#f7f2ea]"
                >
                  + إضافة «{query.trim()}» ({newLabel})
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

let developersCache: AdminDeveloper[] | null = null;

/** Developer picker fed by the developers list (DevelopersTab). New companies only through "+ إضافة". */
export function DeveloperSelect({ value, onChange }: { value: string; onChange: (value: string, isNew: boolean) => void }) {
  const { token, handleError } = useAdmin();
  const [rows, setRows] = useState<AdminDeveloper[]>(developersCache ?? []);
  useEffect(() => {
    if (developersCache) return;
    adminApi
      .developers(token)
      .then((data) => {
        developersCache = data.developers;
        setRows(data.developers);
      })
      .catch(handleError);
  }, [token, handleError]);
  const options = useMemo(
    () =>
      rows
        .filter((row) => row.has_row)
        .map((row) => ({ value: row.name, label: row.name_ar ? `${row.name} — ${row.name_ar}` : row.name, hint: `${row.projects} مشروع` })),
    [rows],
  );
  return (
    <SearchSelect
      options={options.some((option) => option.value === value) || !value ? options : [{ value, hint: "جديد" }, ...options]}
      value={value}
      onChange={onChange}
      placeholder="اختار المطور"
      allowNew
      newLabel="مطور جديد"
      dir="ltr"
    />
  );
}

/** Main area (one of 9) + sub area (from the projects already in that area, or a new one). */
export function AreaFields({
  projects,
  group,
  sub,
  onChange,
}: {
  projects: AdminProject[];
  group: string;
  sub: string;
  onChange: (group: string, sub: string) => void;
}) {
  const subs = useMemo(() => subAreaOptions(projects, group), [projects, group]);
  return (
    <>
      <label className="block text-sm">
        <span className="mb-1 block font-bold">المنطقة الرئيسية *</span>
        <select value={group} onChange={(event) => onChange(event.target.value, "")} className={inputClass} dir="ltr">
          <option value="">— اختار —</option>
          {AREA_GROUPS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-bold">المنطقة الفرعية</span>
        {group ? (
          <SearchSelect
            options={(sub && !subs.includes(sub) ? [sub, ...subs] : subs).map((item) => ({ value: item }))}
            value={sub}
            onChange={(next) => onChange(group, next)}
            placeholder="من غير منطقة فرعية"
            emptyLabel="— من غير منطقة فرعية —"
            allowNew
            newLabel="منطقة فرعية جديدة"
            dir="ltr"
          />
        ) : (
          <span className="block rounded-xl border border-dashed border-[#e7ddc8] px-3 py-2 text-xs text-[#8a958f]">اختار المنطقة الرئيسية الأول</span>
        )}
      </label>
    </>
  );
}

/** Finishing of a project / phase: the usual types, or any other text (e.g. a developer's own code). */
export function FinishingSelect({ value, onChange, placeholder = "مش محدد" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const options = [...FINISHING_OPTIONS, ...(value && !(FINISHING_OPTIONS as readonly string[]).includes(value) ? [value] : [])]
    .map((item) => ({ value: item, label: FINISHING_LABELS[item] ? `${item} — ${FINISHING_LABELS[item]}` : item }));
  return (
    <SearchSelect
      options={options}
      value={value}
      onChange={(next) => onChange(next)}
      placeholder={placeholder}
      emptyLabel="— مش محدد —"
      allowNew
      newLabel="تشطيب تاني"
      dir="ltr"
    />
  );
}
