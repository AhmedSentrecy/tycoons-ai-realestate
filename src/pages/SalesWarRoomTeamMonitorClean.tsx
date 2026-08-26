import { useLayoutEffect } from "react";
import SalesWarRoomTeamMonitor from "./SalesWarRoomTeamMonitor";

const hiddenMessages = [
  "Monitoring access only. Phone numbers are hidden, Export is disabled, and no changes can be made from this view.",
  "صلاحية متابعة فقط. أرقام التليفونات مخفية، والـExport مقفول، ومفيش أي تعديل من الشاشة دي.",
  "READ ONLY MONITOR",
  "متابعة فقط",
  "Live monitoring — controls are intentionally disabled.",
  "متابعة مباشرة — أدوات التعديل مقفولة عمدًا.",
  "Read-only client monitoring. Phone numbers are not included in the data response.",
  "متابعة العملاء فقط. أرقام التليفونات مش موجودة أصلًا في الداتا الراجعة للأدمن.",
];

function cleanRestrictionMessaging() {
  document.title = "Tycoons Agent Dashboard";

  for (const node of Array.from(document.querySelectorAll<HTMLElement>("main div, main span, main p"))) {
    const text = (node.textContent || "").trim();
    if (hiddenMessages.includes(text)) node.style.setProperty("display", "none", "important");
  }

  const header = document.querySelector("main header");
  if (header) {
    const actionArea = header.lastElementChild as HTMLElement | null;
    const first = actionArea?.firstElementChild as HTMLElement | null;
    if (first && /READ ONLY MONITOR|متابعة فقط/i.test((first.textContent || "").trim())) {
      first.style.setProperty("display", "none", "important");
    }

    const next = header.nextElementSibling as HTMLElement | null;
    if (next && /Monitoring access only|صلاحية متابعة فقط/.test(next.textContent || "")) {
      next.style.setProperty("display", "none", "important");
    }
  }
}

export default function SalesWarRoomTeamMonitorClean() {
  useLayoutEffect(() => {
    const style = document.createElement("style");
    style.id = "team-admin-clean-view";
    style.textContent = `
      main header + div.border-amber-300.bg-amber-50 { display: none !important; }
      main header span.bg-amber-100.text-amber-800 { display: none !important; }
    `;
    document.head.appendChild(style);

    cleanRestrictionMessaging();
    const observer = new MutationObserver(cleanRestrictionMessaging);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(cleanRestrictionMessaging, 250);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      style.remove();
    };
  }, []);

  return <SalesWarRoomTeamMonitor />;
}
