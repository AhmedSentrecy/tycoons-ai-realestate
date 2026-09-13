export type VoiceLine = { speaker: "client" | "assistant"; text: string; at: number };
export type VoiceDraft = { id: string; audio: Blob | null; transcript: VoiceLine[]; summary: string; name: string; phone: string; incomplete: boolean };
export const VOICE_INQUIRIES_URL = "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/voice-inquiries";

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
