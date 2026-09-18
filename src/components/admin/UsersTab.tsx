import { useCallback, useEffect, useState } from "react";
import { adminApi, type ManagedUser } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, EmptyState, Modal, inputClass } from "./ui";

export default function UsersTab() {
  const { token, user, notify, handleError } = useAdmin();
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: "", display_name: "" });
  const [credential, setCredential] = useState<{ username: string; password: string } | null>(null);

  const load = useCallback(() => {
    adminApi
      .users(token)
      .then((data) => setUsers(data.users))
      .catch((error) => {
        setUsers([]);
        handleError(error);
      });
  }, [token, handleError]);

  useEffect(load, [load]);

  async function create() {
    setBusy(true);
    try {
      const result = await adminApi.userCreate(token, form);
      setCredential({ username: result.username, password: result.password });
      setAdding(false);
      setForm({ username: "", display_name: "" });
      load();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function update(target: ManagedUser, body: { active?: boolean; reset_password?: boolean }) {
    if (body.active === false && !window.confirm(`تقفل حساب ${target.username}؟ هيتسجّل خروجه فورًا.`)) return;
    setBusy(true);
    try {
      const result = await adminApi.userUpdate(token, { id: target.id, ...body });
      if (result.password) setCredential({ username: target.username, password: result.password });
      else notify("اتحفظ");
      load();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center gap-2">
        <p className="me-auto text-sm text-[#5c6a62]">
          المستخدم العادي بيشتغل عادي، بس أي تعديل منه بيستنى موافقتك قبل ما يظهر على الموقع.
        </p>
        <button onClick={() => setAdding(true)} className="rounded-full bg-[#0d1f18] px-4 py-2 text-sm font-black text-white">
          + مستخدم جديد
        </button>
      </div>

      {!users && <p className="p-6 text-center text-sm font-bold">جاري التحميل…</p>}
      {users && !users.length && <EmptyState title="مفيش مستخدمين" />}
      <div className="space-y-2">
        {users?.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#e7ddc8] bg-white p-3">
            <div className="me-auto min-w-0">
              <p className="font-black">
                {item.display_name || item.username} <span className="text-xs font-bold text-[#5c6a62]">@{item.username}</span>
              </p>
              <p className="text-xs text-[#5c6a62]">
                {item.last_login_at ? `آخر دخول: ${new Date(item.last_login_at).toLocaleString("ar-EG")}` : "لسه مدخلش"}
              </p>
            </div>
            <Badge tone={item.role === "owner" ? "gold" : "muted"}>{item.role === "owner" ? "المالك" : "مستخدم"}</Badge>
            {!item.active && <Badge tone="error">مقفول</Badge>}
            {item.id !== user.id && (
              <>
                <button onClick={() => void update(item, { reset_password: true })} disabled={busy} className="rounded-lg bg-[#f7f2ea] px-3 py-1.5 text-xs font-black">
                  كلمة سر جديدة
                </button>
                <button onClick={() => void update(item, { active: !item.active })} disabled={busy} className="rounded-lg bg-[#f7f2ea] px-3 py-1.5 text-xs font-black">
                  {item.active ? "اقفل الحساب" : "افتح الحساب"}
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <Modal title="مستخدم جديد" onClose={() => setAdding(false)}>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-bold">اسم المستخدم (إنجليزي صغير)</span>
            <input
              dir="ltr"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })}
              placeholder="mostafa"
              className={inputClass}
            />
          </label>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-bold">الاسم بالكامل</span>
            <input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} className={inputClass} />
          </label>
          <p className="text-xs text-[#5c6a62]">هتتولد كلمة سر قوية تلقائيًا وتظهر لك مرة واحدة بس.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="rounded-full px-4 py-2 text-sm font-bold">
              إلغاء
            </button>
            <button
              onClick={() => void create()}
              disabled={busy || form.username.length < 3}
              className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              إنشاء
            </button>
          </div>
        </Modal>
      )}

      {credential && (
        <Modal title="كلمة السر" onClose={() => setCredential(null)}>
          <p className="text-sm text-[#5c6a62]">انسخها وابعتها للمستخدم. مش هتظهر تاني بعد ما تقفل الشباك ده.</p>
          <div className="mt-3 rounded-2xl bg-[#f7f2ea] p-4 text-center">
            <p className="text-sm font-bold" dir="ltr">
              {credential.username}
            </p>
            <p className="mt-1 select-all text-lg font-black" dir="ltr">
              {credential.password}
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => setCredential(null)} className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white">
              تمام، نسختها
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
