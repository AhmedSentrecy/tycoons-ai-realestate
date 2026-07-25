import { useCallback, useEffect, useRef, useState } from "react";

/**
 * OpenAI Realtime API — بنفس عقد Netlify Function بتاع تايكونز:
 *   POST /.netlify/functions/openai-realtime-connect
 *   body: SDP offer (application/sdp أو JSON { sdp })
 *   response: SDP answer (application/sdp)
 * الفانكشن بيكلم api.openai.com/v1/realtime/calls بالمفتاح المتخزن
 * في Netlify — مفيش مفاتيح في المتصفح خالص.
 *
 * ملاحظة: الجلسة (التعليمات/الصوت/الأدوات) بتتظبط جوه الفانكشن على
 * السيرفر — المتصفح بيفتح القناة وبيستقبل أحداث البيانات بس.
 */

const CONNECT_URL =
  (import.meta as any).env?.VITE_REALTIME_CONNECT_URL ||
  "/.netlify/functions/openai-realtime-connect";

export type RealtimeState =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "error"
  | "unavailable";

interface RealtimeOptions {
  onSearchQuery: (query: string) => void;
}

export function useRealtimeVoice({ onSearchQuery }: RealtimeOptions) {
  const [state, setState] = useState<RealtimeState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [transcript, setTranscript] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    try {
      dcRef.current?.close();
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioRef.current) audioRef.current.srcObject = null;
    } catch {
      /* تجاهل أخطاء الإغلاق */
    }
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const connect = useCallback(async (): Promise<boolean> => {
    setState("connecting");
    setErrorMsg("");

    try {
      // مايك المستخدم
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // صوت الرد من المساعد
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // قناة أحداث الجلسة
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => setState("connected");

      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          switch (msg.type) {
            case "input_audio_buffer.speech_started":
              setState("listening");
              break;
            case "response.audio.delta":
            case "response.audio_transcript.delta":
              setState("speaking");
              break;
            case "response.audio_transcript.done":
              setTranscript(msg.transcript || "");
              setState("connected");
              break;
            case "conversation.item.input_audio_transcription.completed":
              // كلام المستخدم بعد التفريغ — نغذّي به البحث على الشاشة
              if (msg.transcript?.trim()) onSearchQuery(msg.transcript.trim());
              break;
            case "response.function_call_arguments.done": {
              if (msg.name === "search_properties") {
                try {
                  const args = JSON.parse(msg.arguments || "{}");
                  if (args.query) onSearchQuery(args.query);
                  // رد على المساعد عشان يكمّل المحادثة
                  dc.send(
                    JSON.stringify({
                      type: "conversation.item.create",
                      item: {
                        type: "function_call_output",
                        call_id: msg.call_id,
                        output: JSON.stringify({
                          ok: true,
                          note: "النتايج ظهرت للعميل على الشاشة",
                        }),
                      },
                    })
                  );
                  dc.send(JSON.stringify({ type: "response.create" }));
                } catch {
                  /* arguments ناقصة — تجاهل */
                }
              }
              break;
            }
            case "error":
              setErrorMsg("حصلت مشكلة في المحادثة — جرّب تاني");
              setState("error");
              break;
          }
        } catch {
          /* رسالة غير JSON — تجاهل */
        }
      };

      // SDP offer → فانكشن نتليفاي → SDP answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // استنى اكتمال ICE gathering (مهم عشان الـ SDP يبقى كامل)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const onChange = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", onChange);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", onChange);
        setTimeout(resolve, 2500); // حد أقصى للأمان
      });

      const sdpOffer = pc.localDescription?.sdp;
      if (!sdpOffer) throw new Error("no-sdp");

      const res = await fetch(CONNECT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: sdpOffer }),
      });

      if (!res.ok) throw new Error(`connect ${res.status}`);

      const answerSdp = await res.text();
      if (!answerSdp.includes("v=0")) throw new Error("bad-answer");

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      return true;
    } catch (err: any) {
      cleanup();
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        setState("error");
        setErrorMsg("اسمح بالمايكروفون من إعدادات المتصفح الأول");
      } else if (err?.name === "NotFoundError") {
        setState("error");
        setErrorMsg("مفيش مايكروفون متاح على الجهاز");
      } else {
        // فشل الاتصال بالفانكشن — خليها unavailable عشان نرجع للـ fallback
        setState("unavailable");
      }
      return false;
    }
  }, [cleanup, onSearchQuery]);

  const disconnect = useCallback(() => {
    cleanup();
    setState("idle");
    setTranscript("");
  }, [cleanup]);

  return { state, errorMsg, transcript, connect, disconnect };
}
