// One-off importer: copies official developer/project logos into the public
// brand-logos bucket. The job list is fixed here, so calling it can only
// re-upload these same files. Sources are the developers' own websites.
import { createClient } from "jsr:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const HP = "https://assets.live.beyond-creation.net/hydepark/";
const ORA = "https://d3lfybzdo3x59a.cloudfront.net/website-assets/";
const SODIC_SVG = "<svg width=\"104\" height=\"26\" viewBox=\"0 0 104 26\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><g clip-path=\"url(#clip0_3807_28)\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12.83 7.25294L24.9178 3.61529L12.83 0L0.742188 3.61529L12.83 7.25294ZM0 22.4052V4.69531L12.1847 8.36276V25.9996L0 22.4052ZM25.6534 22.4052V4.69531L13.4688 8.36276V25.9996L25.6534 22.4052ZM99.5795 8.82152C97.332 8.82152 95.4933 10.5487 95.4933 12.7289L95.4887 12.7274C95.4887 14.9329 97.4365 16.6348 99.6871 16.6348C101.413 16.6348 102.785 15.918 103.993 14.775L103.772 22.2723C102.565 22.8312 99.7671 23.0696 98.425 23.0696C93.8223 23.0696 90.0083 20.3663 88.5524 16.4649V22.7522H81.0381V16.0968C79.8021 20.2456 76.0127 22.7522 71.0748 22.7522H61.5574V16.1207C60.1077 20.5258 55.7618 23.0696 50.6364 23.0696C46.1798 23.0696 42.315 21.1442 40.4287 17.748C39.4387 21.3052 35.5632 23.0696 31.7045 23.0696C30.1811 23.0696 28.5162 22.8312 26.9297 22.4064V16.216C28.1703 17.0595 29.6061 17.7003 31.1296 17.7003C31.8706 17.7003 33.0497 17.4097 33.0497 16.5036C33.0497 15.6875 32.2488 15.5436 31.5887 15.4251C31.5161 15.412 31.4451 15.3993 31.3771 15.386L29.8675 15.1192C28.7929 14.9344 27.7814 14.5917 26.9297 14.079V4.57586C28.6392 3.14524 31.0758 2.38672 33.434 2.38672C35.7922 2.38672 37.9598 2.94406 39.9891 4.14072L37.9598 9.27157C36.6716 8.42065 35.2173 7.75601 33.5985 7.75601C32.9421 7.75601 31.9813 7.99743 31.9813 8.82152C31.9813 9.48519 32.7233 9.64201 33.2927 9.76235C33.3613 9.77684 33.4274 9.79081 33.4894 9.80507L35.1911 10.1776C36.8361 10.5338 38.2442 11.1493 39.2235 12.1283C39.5694 6.20021 44.581 2.38821 50.6395 2.38821C55.7464 2.38821 60.1077 5.09446 61.5605 9.49212V2.70563H69.2116C74.9934 2.70563 79.6484 4.75618 81.0412 9.69777V2.70563H88.5555V9.31628C90.0405 5.25988 93.9806 2.38672 98.7294 2.38672C100.43 2.38672 102.185 2.6788 103.775 3.20932L103.996 10.8408C102.788 9.74993 101.281 8.82152 99.5795 8.82152ZM46.7732 12.8884C46.7732 15.1744 48.3658 16.7421 50.641 16.7421C52.9162 16.7421 54.5089 15.1744 54.5089 12.8884C54.5089 10.7603 53.0254 8.978 50.641 8.978C48.2567 8.978 46.7732 10.7603 46.7732 12.8884ZM69.0764 16.7421H69.5437V16.7436C72.0387 16.7436 73.9588 15.6274 73.9588 12.9956C73.9588 10.1761 72.2862 8.97949 69.5437 8.97949H69.0764V16.7421Z\" fill=\"#0b2340\"></path></g><defs><clipPath id=\"clip0_3807_28\"><rect width=\"104\" height=\"26\" fill=\"#ffffff\"></rect></clipPath></defs></svg>";

type Job = { path: string; url?: string; svg?: string };
const JOBS: Job[] = [
  { path: "developers/mountain-view.png", url: "https://www.mountainviewegypt.com/images/MV_Logo_Horizontal.png" },
  { path: "developers/ora-developers.png", url: "https://www.oradevelopers.com/_nuxt/img/ora-logo-greyer.52c8cfb.png" },
  { path: "developers/palm-hills-developments.svg", url: "https://www.palmhillsdevelopments.com/assets/images/header/Logo.svg" },
  { path: "developers/hyde-park-developments.webp", url: "https://www.hydeparkdevelopments.com/icons/newLogoBlack.webp" },
  { path: "developers/madinet-masr.webp", url: "https://madinetmasr.com/images/logo_dark1.webp" },
  { path: "developers/la-vista-developments.png", url: "https://lavista-developments.com/wp-content/uploads/2022/02/cropped-lvdsmall-1.png" },
  { path: "developers/sodic.svg", svg: SODIC_SVG },
  { path: "projects/hydepark-central--hydepark-developments.png", url: HP + "logo_white_852dd5a0e8.png" },
  { path: "projects/hydepark-new-cairo--hydepark-developments.png", url: HP + "logo_Nc_left_26ec801308.png" },
  { path: "projects/hydepark-seashore--hydepark-developments.png", url: HP + "logo_Seashore_065a42dd7e.png" },
  { path: "projects/garden-lakes--hydepark-developments.png", url: HP + "Logo_GL_a3bb477e03.png" },
  { path: "projects/signature--hydepark-developments.webp", url: HP + "logo_Signature_51c1feff28.webp" },
  { path: "projects/business-district--hydepark-developments.png", url: HP + "Logo_business_left_bfd398d648.png" },
  { path: "projects/solana-west--ora.png", url: ORA + "Solana-logoFinal.png" },
  { path: "projects/zed-east--ora.png", url: ORA + "zed%20east.png" },
  { path: "projects/zed-west--ora.png", url: ORA + "zed%20sz.png" },
];

const TYPES: Record<string, string> = { png: "image/png", svg: "image/svg+xml", webp: "image/webp" };

Deno.serve(async () => {
  const results = [];
  for (const job of JOBS) {
    const ext = job.path.split(".").pop()!;
    try {
      let bytes: Uint8Array;
      if (job.svg) bytes = new TextEncoder().encode(job.svg);
      else {
        const res = await fetch(job.url!, { headers: { "user-agent": "Mozilla/5.0 TycoonsLogoImport" } });
        if (!res.ok) throw new Error("http_" + res.status);
        bytes = new Uint8Array(await res.arrayBuffer());
      }
      if (bytes.length < 200 || bytes.length > 1_000_000) throw new Error("bad_size_" + bytes.length);
      const { error } = await db.storage.from("brand-logos").upload(job.path, bytes, { contentType: TYPES[ext], upsert: true, cacheControl: "604800" });
      if (error) throw error;
      results.push({ path: job.path, ok: true, bytes: bytes.length });
    } catch (e) {
      results.push({ path: job.path, ok: false, error: String((e as Error).message || e) });
    }
  }
  return new Response(JSON.stringify(results), { headers: { "content-type": "application/json" } });
});
