/**
 * WebRTC hook for live auction broadcasting.
 *
 * Uses Supabase Realtime "broadcast" channel for signaling
 * (offer/answer/ICE candidate exchange).
 *
 * Seller (broadcaster) → captures camera → creates offer → sends stream
 * Viewer → receives offer → sends answer → displays remote stream
 */

import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

type SignalType = "offer" | "answer" | "ice-candidate" | "broadcaster-ready" | "broadcaster-ended";

interface SignalPayload {
  type: SignalType;
  data: string; // JSON stringified SDP or ICE candidate
  from: string; // sender ID
}

interface UseWebRTCOptions {
  roomId: string; // ad ID
  userId: string;
  isBroadcaster: boolean;
  onViewerCountChange?: (count: number) => void;
}

export function useWebRTC({ roomId, userId, isBroadcaster, onViewerCountChange }: UseWebRTCOptions) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>("new");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcasterOnline, setBroadcasterOnline] = useState(false);

  // Track connected viewers (broadcaster side)
  const viewerCountRef = useRef(0);

  // ── Setup signaling channel ───────────────────────────
  const getChannel = useCallback(() => {
    if (channelRef.current) return channelRef.current;

    const channel = supabase.channel(`live-rtc-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;
    return channel;
  }, [roomId]);

  // ── Send signal via Supabase broadcast ────────────────
  const sendSignal = useCallback(
    (type: SignalType, data: string) => {
      const channel = getChannel();
      channel.send({
        type: "broadcast",
        event: "signal",
        payload: { type, data, from: userId } as SignalPayload,
      });
    },
    [getChannel, userId],
  );

  // ── Create peer connection ────────────────────────────
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // ICE candidate → send to other peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", JSON.stringify(event.candidate));
      }
    };

    // Connection state tracking
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === "connected") {
        if (isBroadcaster) {
          viewerCountRef.current++;
          onViewerCountChange?.(viewerCountRef.current);
        }
      }
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        if (isBroadcaster) {
          viewerCountRef.current = Math.max(0, viewerCountRef.current - 1);
          onViewerCountChange?.(viewerCountRef.current);
        }
      }
    };

    // Receive remote stream (viewer side)
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    return pc;
  }, [sendSignal, isBroadcaster, onViewerCountChange]);

  // ═══════════════════════════════════════════════════════
  // BROADCASTER functions
  // ═══════════════════════════════════════════════════════

  const startBroadcast = useCallback(
    async (stream: MediaStream) => {
      localStreamRef.current = stream;
      const pc = createPeerConnection();

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Notify viewers that broadcaster is ready, and send offer
      sendSignal("broadcaster-ready", "");
      sendSignal("offer", JSON.stringify(offer));

      setIsBroadcasting(true);
    },
    [createPeerConnection, sendSignal],
  );

  const stopBroadcast = useCallback(() => {
    sendSignal("broadcaster-ended", "");
    setIsBroadcasting(false);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, [sendSignal]);

  // ═══════════════════════════════════════════════════════
  // VIEWER functions
  // ═══════════════════════════════════════════════════════

  const handleOffer = useCallback(
    async (offerSdp: string) => {
      const pc = createPeerConnection();
      const offer = JSON.parse(offerSdp) as RTCSessionDescriptionInit;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal("answer", JSON.stringify(answer));
    },
    [createPeerConnection, sendSignal],
  );

  const handleAnswer = useCallback(async (answerSdp: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const answer = JSON.parse(answerSdp) as RTCSessionDescriptionInit;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleIceCandidate = useCallback(async (candidateJson: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit;
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore failed ICE candidates
    }
  }, []);

  // ── Listen to signaling channel ───────────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = getChannel();

    channel.on("broadcast", { event: "signal" }, (msg: { payload: SignalPayload }) => {
      const { type, data, from } = msg.payload;

      // Don't process own signals
      if (from === userId) return;

      switch (type) {
        case "offer":
          if (!isBroadcaster) {
            handleOffer(data);
          }
          break;

        case "answer":
          if (isBroadcaster) {
            handleAnswer(data);
          }
          break;

        case "ice-candidate":
          handleIceCandidate(data);
          break;

        case "broadcaster-ready":
          if (!isBroadcaster) {
            setBroadcasterOnline(true);
          }
          break;

        case "broadcaster-ended":
          if (!isBroadcaster) {
            setBroadcasterOnline(false);
            setRemoteStream(null);
            if (peerConnectionRef.current) {
              peerConnectionRef.current.close();
              peerConnectionRef.current = null;
            }
          }
          break;
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, isBroadcaster, getChannel, handleOffer, handleAnswer, handleIceCandidate]);

  // ── Cleanup on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  return {
    remoteStream,
    connectionState,
    isBroadcasting,
    broadcasterOnline,
    startBroadcast,
    stopBroadcast,
    sendSignal,
  };
}
