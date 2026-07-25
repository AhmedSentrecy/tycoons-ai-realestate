import { useCallback, useEffect, useRef, useState } from "react";

/**
 * OpenAI Realtime API عبر WebRTC — نفس بنية الـ quickstart الرسمي:
 * 1. GET من endpoint على سيرفرك بيرجّع ephemeral key (client_secret)
 * 2. اتصال WebRTC مباشر من المتصفح مع OpenAI
 * 3. صوت المستخدم بيتبعت كـ audio track، والرد بيرجع صوت + نص
 *
 * الـ endpoint الافتراضي: /api/realtime/session
 * ممكن يتغيّر من ملف .env بـ VITE_REALTIME_SESSION_URL
 * الرد المتوقع: { client_secret: { value: "ek_..." } } أو { client_secret: "ek_..." }
 *
 * لو الـ endpoint مش موجود أو رجّع خطأ → available=false
 * والـ SmartSearchBar بيتحول تلقائيًا لـ Web Speech API.
 */

const SESSION_URL =
  (import.meta as any).env?.VITE_REALTIME_SESSION_URL || "/api/realtime/session";

const REALTIME_MODEL = "gpt-4o-realtime-preview-2024-12-17";

const ASSISTANT_INSTRUCTIONS = `انت مساعد تايكونز العقاري. بتتكلم مصري ودود ومختصر.
شغلك: تفهم العميل عايز إيه (منطقة، نوع وحدة، ميزانية، استلام) وتقترح من المشاريع المتاحة.
المناطق المتاحة: الساحل الشمالي، التجمع/القاهرة الجديدة، الشيخ زايد، العين السخنة، العاصمة الإدارية.
أنواع الوحدات: شقق، فلل، تاون هاوس، شاليهات، بنتهاوس.
لو العميل قال طلب واضح، استخدم أداة search_properties عشان تعرض النتايج.
متتكلمش كتير — جملة أو اتنين بالمصري البسيط، واسأل سؤال واحد في المرة.`;

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
      // 1) هات ephemeral key من سيرفرك
      const tokenRes = await fetch(SESSION_URL, { method: "POST" }).catch(
        () => null
      ) as Response | null;

      if (!tokenRes || !tokenRes.ok) {
        setState("unavailable");
        return false;
      }

      const data = await tokenRes.json();
      const ephemeralKey: string | undefined =
        typeof data?.client_secret === "string"
          ? data.client_secret
          : data?.client_secret?.value;

      if (!ephemeralKey) {
        setState("unavailable");
        return false;
      }

      // 2) اتصال WebRTC
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // صوت الرد
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // مايك المستخدم
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // قناة البيانات (أحداث الجلسة)
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        // إعداد الجلسة بالتعليمات + أداة البحث
        dc.send(
          JSON.stringify({
            type: "session.update",
            session: {
              instructions: ASSISTANT_INSTRUCTIONS,
              voice: "alloy",
              input_audio_transcription: { model: "whisper-1" },
              turn_detection: { type: "server_vad" },
              tools: [
                {
                  type: "function",
                  name: "search_properties",
                  description:
                    "البحث في العقارات المتاحة حسب طلب العميل (منطقة/نوع/ميزانية)",
                  parameters: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description:
                          "وصف طلب العميل بالعربي، مثل: شاليه في الساحل تحت ٩ مليون",
                      },
                    },
                    required: ["query"],
                  },
                },
              ],
            },
          })
        );
        setState("connected");
      };

      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);

          switch (msg.type) {
            case "input_audio_buffer.speech_started":
              setState("listening");
              break;
            case "response.audio_transcript.delta":
              setState("speaking");
              break;
            case "response.audio_transcript.done":
              setTranscript(msg.transcript || "");
              setState("connected");
              break;
            case "conversation.item.input_audio_transcription.completed":
              // نص كلام المستخدم — نغذّي به البحث مباشرة
              if (msg.transcript?.trim()) onSearchQuery(msg.transcript.trim());
              break;
            case "response.function_call_arguments.done": {
              // المساعد قرر يبحث
              if (msg.name === "search_properties") {
                try {
                  const args = JSON.parse(msg.arguments || "{}");
                  if (args.query) {
                    onSearchQuery(args.query);
                    // رد على المساعد بنجاح التنفيذ
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
                  }
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

      // 3) SDP offer/answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      if (!sdpRes.ok) {
        throw new Error(`Realtime SDP failed: ${sdpRes.status}`);
      }

      await pc.setRemoteDescription({
        type: "answer",
        sdp: await sdpRes.text(),
      });

      return true;
    } catch (err: any) {
      cleanup();
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setState("error");
        setErrorMsg("اسمح بالمايكروفون من إعدادات المتصفح الأول");
      } else {
        // فشل الاتصال بالسيرفر — خليها unavailable عشان نرجع للـ fallback
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
