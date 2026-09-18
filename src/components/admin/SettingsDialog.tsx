import { useState } from "react";
import { adminApi, type AdminSettings } from "../../lib/adminApi";

export default function SettingsDialog({
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
      onSaved(await adminApi.saveSettings(token, hook.trim()));
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
