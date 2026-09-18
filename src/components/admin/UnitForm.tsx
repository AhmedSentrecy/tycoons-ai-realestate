import { useState } from "react";
import { STATUS_LABELS, UNIT_FIELD_LABELS, type AdminUnit, type UnitValues } from "../../lib/adminApi";
import { inputClass } from "./ui";

const TEXT_FIELDS: { key: keyof UnitValues; placeholder: string }[] = [
  { key: "unit_type", placeholder: "Apartment / Villa / Chalet" },
  { key: "bedrooms_text", placeholder: "3 Bedrooms" },
  { key: "down_payment_text", placeholder: "5%" },
  { key: "installments_text", placeholder: "8 years" },
  { key: "delivery_text", placeholder: "2028-12-30 أو Delivery in 3 years" },
  { key: "finishing", placeholder: "Fully Finished" },
];
const STATUSES = ["available", "sold", "not_confirmed", "review_only", "new_launch"];

export default function UnitForm({
  unit,
  busy,
  onCancel,
  onSubmit,
}: {
  unit?: AdminUnit | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: UnitValues) => void;
}) {
  const [values, setValues] = useState<UnitValues>({
    unit_type: unit?.unit_type ?? "",
    bedrooms_text: unit?.bedrooms_text ?? "",
    area_sqm: unit?.area_sqm ?? "",
    starting_price: unit?.starting_price ?? "",
    down_payment_text: unit?.down_payment_text ?? "",
    installments_text: unit?.installments_text ?? "",
    delivery_text: unit?.delivery_text ?? "",
    finishing: unit?.finishing ?? "",
    availability_status: unit?.availability_status ?? "available",
    description: unit?.description ?? "",
  });

  const set = (key: keyof UnitValues, value: string) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map(({ key, placeholder }) => (
          <label key={key} className="block text-sm">
            <span className="mb-1 block font-bold">
              {UNIT_FIELD_LABELS[key]}
              {key === "unit_type" ? " *" : ""}
            </span>
            <input
              value={String(values[key] ?? "")}
              onChange={(event) => set(key, event.target.value)}
              placeholder={placeholder}
              required={key === "unit_type"}
              className={inputClass}
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block font-bold">المساحة (م²)</span>
          <input
            inputMode="decimal"
            value={String(values.area_sqm ?? "")}
            onChange={(event) => set("area_sqm", event.target.value)}
            placeholder="170"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">السعر (جنيه)</span>
          <input
            inputMode="numeric"
            value={String(values.starting_price ?? "")}
            onChange={(event) => set("starting_price", event.target.value)}
            placeholder="12500000"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">الحالة</span>
          <select
            value={String(values.availability_status ?? "available")}
            onChange={(event) => set("availability_status", event.target.value)}
            className={inputClass}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-bold">الوصف</span>
          <textarea
            value={String(values.description ?? "")}
            onChange={(event) => set("description", event.target.value)}
            rows={3}
            className={inputClass}
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-[#5c6a62]">
        لو السعر أو المساحة ناقصين، الوحدة هتتحفظ بحالة «محتاجة تأكيد» ومش هتظهر على الموقع لحد ما تتأكد.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold">
          إلغاء
        </button>
        <button type="submit" disabled={busy} className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40">
          {busy ? "بيحفظ…" : "حفظ"}
        </button>
      </div>
    </form>
  );
}
