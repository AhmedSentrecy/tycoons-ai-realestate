import { developerLogoUrl, useDeveloper } from "@/lib/developers";

/** The developer's logo as a small badge (renders nothing when the developer has no logo). */
export default function DeveloperLogo({ developer, className = "" }: { developer: string; className?: string }) {
  const brand = useDeveloper(developer);
  const src = developerLogoUrl(brand);
  if (!src) return null;
  return (
    <span className={`inline-flex h-9 items-center rounded-lg px-2 shadow-md ${brand?.logo_on_dark ? "bg-[#14352a]" : "bg-white"} ${className}`}>
      <img src={src} alt={`${brand?.name ?? developer} logo`} loading="lazy" decoding="async" className="h-6 w-auto max-w-[110px] object-contain" />
    </span>
  );
}
