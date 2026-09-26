/**
 * Standalone Apps Script for the two CRM feedback sheets.
 * Set WAR_ROOM_SYNC_TOKEN, WAR_ROOM_DISTRIBUTION_SHEET_ID, and
 * WAR_ROOM_STATUS_SHEET_ID in Script Properties before setupWarRoomFeedbackSync().
 * The first setup run starts from that moment; it does not import old CRM feedback.
 */
const WAR_ROOM_ENDPOINT = "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/sales-war-room-sheet-sync";
function warRoomSources_(props) {
  const distributionId = props.getProperty("WAR_ROOM_DISTRIBUTION_SHEET_ID");
  const statusId = props.getProperty("WAR_ROOM_STATUS_SHEET_ID");
  if (!distributionId || !statusId) throw new Error("Set both CRM sheet IDs in Script Properties first");
  return [
    { id: distributionId, tab: "التوزيع", kind: "sodic" },
    { id: statusId, tab: "CRM Status", kind: "hyde" },
    { id: statusId, tab: "Wesam - CRM Status", kind: "hyde" },
  ];
}

function setupWarRoomFeedbackSync() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("WAR_ROOM_SYNC_TOKEN")) throw new Error("Set WAR_ROOM_SYNC_TOKEN in Script Properties first");
  warRoomSources_(props);
  if (!props.getProperty("WAR_ROOM_SYNC_SINCE")) props.setProperty("WAR_ROOM_SYNC_SINCE", new Date().toISOString());
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "syncWarRoomFeedback").forEach(ScriptApp.deleteTrigger);
  ScriptApp.newTrigger("syncWarRoomFeedback").timeBased().everyMinutes(5).create();
  return syncWarRoomFeedback();
}

function warRoomHeaderMap_(header) {
  const map = {};
  header.forEach((name, index) => { map[String(name).trim()] = index; });
  return map;
}

function warRoomCell_(row, map, name) {
  const index = map[name];
  return index === undefined ? "" : String(row[index] == null ? "" : row[index]).trim();
}

function warRoomRow_(values, map, source) {
  const get = name => warRoomCell_(values, map, name);
  if (source.kind === "sodic") {
    if (get("راح لمين") !== "CRM" || get("الحالة") !== "SENT") return null;
    let crmId = "";
    try { crmId = String(JSON.parse(get("رد الـ CRM")).data.id || ""); } catch (_) { return null; }
    const all = get("كل الفيدباك");
    const last = get("آخر فيدباك");
    if (!all && !last) return null;
    return {
      crm_id: crmId, name: get("الاسم"), phone: get("الموبايل"), agent: get("آخر إيجنت"),
      last_feedback: last, last_feedback_at: get("وقت آخر فيدباك"),
      all_feedback: all, source_sheet: "CRM distribution / التوزيع",
    };
  }
  const all = get("كل الكومنتات");
  const last = get("آخر كومنت");
  if (!all && !last) return null;
  return {
    crm_id: get("crm_id"), name: get("الاسم"), phone: get("الموبايل"), agent: get("الإيجنت"),
    last_feedback: last, last_feedback_at: get("آخر أكتيفيتي"),
    all_feedback: all, source_sheet: "CRM status / " + source.tab,
  };
}

function syncWarRoomFeedback() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status: "already_running" };
  try {
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty("WAR_ROOM_SYNC_TOKEN");
    const since = props.getProperty("WAR_ROOM_SYNC_SINCE");
    if (!token || !since) throw new Error("Run setupWarRoomFeedbackSync first");
    const sinceCairo = Utilities.formatDate(new Date(since), "Africa/Cairo", "yyyy-MM-dd HH:mm");
    const rows = [];
    for (const source of warRoomSources_(props)) {
      const sheet = SpreadsheetApp.openById(source.id).getSheetByName(source.tab);
      if (!sheet) throw new Error("Missing CRM tab: " + source.tab);
      if (sheet.getLastRow() < 2) continue;
      const data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
      const map = warRoomHeaderMap_(data[0]);
      for (const values of data.slice(1)) {
        const row = warRoomRow_(values, map, source);
        if (row && row.crm_id && row.name && row.agent &&
            (!row.last_feedback_at || row.last_feedback_at >= sinceCairo)) rows.push(row);
      }
    }
    const totals = {};
    for (let start = 0; start < rows.length; start += 50) {
      const response = UrlFetchApp.fetch(WAR_ROOM_ENDPOINT, {
        method: "post", contentType: "application/json",
        headers: { "x-war-room-sync-token": token },
        payload: JSON.stringify({ since: since, rows: rows.slice(start, start + 50) }),
        muteHttpExceptions: true,
      });
      if (response.getResponseCode() !== 200) {
        throw new Error("Sales War Room sync failed (HTTP " + response.getResponseCode() + "): " + response.getContentText().slice(0, 300));
      }
      const result = JSON.parse(response.getContentText());
      for (const item of result.results || []) totals[item.status] = (totals[item.status] || 0) + 1;
      const errors = (result.results || []).filter(x => ["error", "owner_conflict", "unknown_agent", "ambiguous_phone", "invalid_row", "feedback_too_long"].includes(x.status));
      if (errors.length) console.warn("War Room rows needing review: " + JSON.stringify(errors));
    }
    console.log("War Room feedback sync: " + JSON.stringify(totals));
    return totals;
  } finally { lock.releaseLock(); }
}
