export type VoiceLine = { speaker: "client" | "assistant"; text: string; at: number };
export type VoiceDraft = { id: string; audio: Blob | null; transcript: VoiceLine[]; summary: string; name: string; phone: string; incomplete: boolean };
export const VOICE_INQUIRIES_URL = "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/voice-inquiries";

const toLatinDigits = (text: string) => text.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776));

/** Last phone number the client said, e.g. "010 1234 5678" or "+971 50 123 4567". Empty when none. */
export function phoneFromTranscript(lines: VoiceLine[]): string {
  let found = "";
  for (const line of lines) {
    if (line.speaker !== "client") continue;
    const runs = toLatinDigits(line.text).match(/\+?\d[\d\s\-().]{6,22}\d/g) || [];
    for (const run of runs) {
      const digits = run.replace(/[^\d+]/g, "");
      if (/^(?:\+?20|0020)?0?1[0125]\d{8}$/.test(digits) || /^(?:\+|00)[1-9]\d{7,14}$/.test(digits)) found = digits;
    }
  }
  return found;
}

/** First name the client gave ("اسمي أحمد", "أنا اسمي منى", "my name is Sara"). Empty when none. */
export function nameFromTranscript(lines: VoiceLine[]): string {
  let found = "";
  for (const line of lines) {
    if (line.speaker !== "client") continue;
    const match = line.text.match(/(?:اسمي|إسمي|my name is|i am|i'm)\s+([\p{L}]{2,30})/iu);
    if (match) found = match[1];
  }
  return found;
}

export function beginVoiceRecording(stream: MediaStream, done: (draft: VoiceDraft) => void) {
  const draft: VoiceDraft = { id: crypto.randomUUID(), audio: null, transcript: [], summary: "", name: "", phone: "", incomplete: false };
  const started = Date.now();
  let ctx: AudioContext | null = null;
  let recorder: MediaRecorder | null = null;
  let stopped = false;
  let delivered = false;
  let chunks: Blob[] = [];
  let bytes = 0;
  let output: MediaStreamAudioDestinationNode | null = null;
  const finish = () => {
    if (delivered) return;
    delivered = true;
    if (chunks.length) draft.audio = new Blob(chunks, { type: recorder?.mimeType.split(";")[0] || "audio/webm" });
    chunks = [];
    void ctx?.close();
    // The assistant fills name/phone through prepare_lead_summary; if the call ended before it did,
    // take them from what the client actually said so the review form is not empty.
    if (!draft.phone.trim()) draft.phone = phoneFromTranscript(draft.transcript);
    if (!draft.name.trim()) draft.name = nameFromTranscript(draft.transcript);
    // Nothing is sent until the visitor confirms contact details in the review form.
    if (draft.audio || draft.transcript.length) done(draft);
  };
  try {
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) throw new Error("unsupported_recording");
    ctx = new AudioContext();
    output = ctx.createMediaStreamDestination();
    ctx.createMediaStreamSource(stream).connect(output);
    recorder = new MediaRecorder(output.stream, { mimeType: mime, audioBitsPerSecond: 64000 });
    recorder.ondataavailable = e => {
      if (!e.data.size) return;
      bytes += e.data.size;
      if (bytes <= 8 * 1024 * 1024) chunks.push(e.data);
      else { draft.incomplete = true; if (recorder?.state === "recording") recorder.stop(); }
    };
    recorder.onerror = () => { draft.incomplete = true; };
    recorder.onstop = finish;
    void ctx.resume();
    recorder.start(1000);
  } catch { draft.incomplete = true; }
  return {
    addRemote(remote: MediaStream) { if (ctx && output) ctx.createMediaStreamSource(remote).connect(output); },
    append(speaker: VoiceLine["speaker"], text: string) {
      if (stopped || draft.transcript.reduce((n,r)=>n+r.text.length,0) + text.length > 80000) return;
      const last = draft.transcript.at(-1);
      if (last?.speaker === speaker) last.text += text;
      else draft.transcript.push({ speaker, text, at: Date.now()-started });
    },
    qualify(input: Record<string,unknown>) {
      for (const key of ["name", "phone", "summary"] as const) if (typeof input[key] === "string") draft[key] = input[key].slice(0,key==="summary"?4000:100);
    },
    stop(incomplete = false) {
      if (stopped) return;
      stopped = true; draft.incomplete ||= incomplete;
      if (recorder?.state === "recording") recorder.stop(); else finish();
    },
  };
}
