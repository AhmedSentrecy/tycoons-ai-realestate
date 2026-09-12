import { useCallback, useEffect, useRef, useState } from "react";
import { getLastSearchVoicePayload } from "@/hooks/usePropertySearch";

const CONNECT_URL =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.
    VITE_REALTIME_CONNECT_URL || "/.netlify/functions/openai-realtime-connect";
const CONNECT_TIMEOUT_MS = 15_000;

export type RealtimeState =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "error"
  | "unavailable";

interface RealtimeOptions {
  onSearchQuery: (query: string) => Record<string, unknown> | void;
}

export function useRealtimeVoice({ onSearchQuery }: RealtimeOptions) {
  const [state, setState] = useState<RealtimeState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [transcript, setTranscript] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const connectingRef = useRef(false);
  const speechTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    connectingRef.current = false;
    if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    speechTimerRef.current = null;
    closeTimerRef.current = null;

    try {
      dcRef.current?.close();
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    } catch {
      // تجاهل أخطاء الإغلاق
    }

    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
    audioRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const sendFunctionOutput = useCallback(
    (dc: RTCDataChannel, callId: string, output: Record<string, unknown>) => {
      if (dc.readyState !== "open") return;
      dc.send(
        JSON.stringify({
          type: "response.item.create",
          event_id: crypto.randomUUID(),
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify(output),
          },
        }),
      );
      dc.send(JSON.stringify({ type: "response.create", event_id: crypto.randomUUID() }));
    },
    [],
  );

  const connect = useCallback(async (): Promise<boolean> => {
    if (connectingRef.current) return false;
    if (typeof window === "undefined" || !window.isSecureContext) {
      setState("unavailable");
      setErrorMsg("المحادثة الصوتية محتاجة اتصال آمن HTTPS");
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setState("unavailable");
      return false;
    }

    connectingRef.current = true;
    setState("connecting");
    setErrorMsg("");

    try {
      cleanup();
      connectingRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.setAttribute("playsinline", "");
      audioRef.current = audioEl;
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0] || new MediaStream([event.track]);
        void audioEl.play().catch(() => undefined);
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          cleanup();
          setState(pc.connectionState === "closed" ? "idle" : "unavailable");
        }
      };

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => undefined;
      dc.onclose = () => setState((current) => (current === "idle" ? current : "unavailable"));
      dc.onerror = () => {
        setErrorMsg("حصلت مشكلة في الاتصال الصوتي");
        setState("error");
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          const scheduleConnectedState = () => {
            if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
            speechTimerRef.current = window.setTimeout(() => {
              setState((current) => (current === "speaking" || current === "listening" ? "connected" : current));
            }, 900);
          };

          const handleFunctionCall = (item: Record<string, unknown>) => {
            if (item.type !== "function_call" || item.name !== "search_properties") return;
            const callId = typeof item.call_id === "string" ? item.call_id : "";
            if (!callId) return;

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(typeof item.arguments === "string" ? item.arguments : "{}");
            } catch {
              sendFunctionOutput(dc, callId, { ok: false, error: "invalid_arguments" });
              return;
            }

            const query = typeof args.query === "string" ? args.query.trim() : "";
            if (!query) {
              sendFunctionOutput(dc, callId, { ok: false, error: "missing_query" });
              return;
            }

            const callbackPayload = onSearchQuery(query);
            const payload = callbackPayload ?? getLastSearchVoicePayload();
            sendFunctionOutput(dc, callId, {
              ok: true,
              note: "النتائج ظهرت للعميل على الشاشة",
              ...payload,
            });
          };

          switch (msg.type) {
            case "session.started":
              connectingRef.current = false;
              setState("connected");
              break;
            case "session.input_transcript.delta":
              setState("listening");
              if (typeof msg.delta === "string") setTranscript(msg.delta);
              scheduleConnectedState();
              break;
            case "session.output_transcript.delta":
              setState("speaking");
              if (typeof msg.delta === "string") setTranscript(msg.delta);
              scheduleConnectedState();
              break;
            case "session.closed":
              cleanup();
              setState("idle");
              break;
            case "response.event": {
              const nested = msg.event;
              if (nested?.type === "response.output_item.done" && nested.item) {
                handleFunctionCall(nested.item);
              }
              break;
            }
            case "error":
              setErrorMsg("حصلت مشكلة في المحادثة — جرّب تاني");
              setState("error");
              break;
          }
        } catch {
          // رسالة غير JSON
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          pc.removeEventListener("icegatheringstatechange", onChange);
          resolve();
        };
        const onChange = () => {
          if (pc.iceGatheringState === "complete") finish();
        };
        pc.addEventListener("icegatheringstatechange", onChange);
        window.setTimeout(finish, 3_000);
      });

      const sdpOffer = pc.localDescription?.sdp;
      if (!sdpOffer) throw new Error("no-sdp");

      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
      const response = await fetch(CONNECT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: sdpOffer,
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeout));

      const responseText = await response.text();
      if (!response.ok) throw new Error(`connect ${response.status}: ${responseText.slice(0, 120)}`);
      const result = JSON.parse(responseText);
      const answerSdp = result?.transport?.sdp;
      if (typeof answerSdp !== "string" || !answerSdp.trimStart().startsWith("v=0")) {
        throw new Error("bad-answer");
      }

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      return true;
    } catch (error: unknown) {
      cleanup();
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setState("error");
        setErrorMsg("اسمح بالمايكروفون من إعدادات المتصفح الأول");
      } else if (name === "NotFoundError") {
        setState("error");
        setErrorMsg("مفيش مايكروفون متاح على الجهاز");
      } else {
        setState("unavailable");
      }
      return false;
    }
  }, [cleanup, onSearchQuery, sendFunctionOutput]);

  const disconnect = useCallback(() => {
    const dc = dcRef.current;
    if (dc?.readyState === "open") {
      dc.send(JSON.stringify({ type: "session.close", event_id: crypto.randomUUID() }));
      closeTimerRef.current = window.setTimeout(() => {
        cleanup();
        setState("idle");
        setErrorMsg("");
        setTranscript("");
      }, 2_000);
      return;
    }
    cleanup();
    setState("idle");
    setErrorMsg("");
    setTranscript("");
  }, [cleanup]);

  return { state, errorMsg, transcript, connect, disconnect };
}
