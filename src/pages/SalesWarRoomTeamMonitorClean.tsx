import { useEffect } from "react";
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

function removeRestrictionMessaging() {
  const nodes = Array.from(document.querySelectorAll("main div, main span, main p"));
  for (const node of nodes) {
    const text = (node.textContent || "").trim();
    if (!hiddenMessages.includes(text)) continue;
    node.remove();
  }
  document.title = "Tycoons Agent Dashboard";
}

export default function SalesWarRoomTeamMonitorClean() {
  useEffect(() => {
    removeRestrictionMessaging();
    const observer = new MutationObserver(removeRestrictionMessaging);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(removeRestrictionMessaging, 500);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return <SalesWarRoomTeamMonitor />;
}
