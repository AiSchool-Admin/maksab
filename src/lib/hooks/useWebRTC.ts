/**
 * WebRTC hook for live auction broadcasting.
 *
 * Architecture: Broadcaster (seller) ↔ multiple Viewers
 *
 * Signaling via Supabase Realtime broadcast channel:
 *   1. Broadcaster goes live → sends "broadcaster-ready"
 *   2. Viewer subscribes → sends "viewer-join" with their ID
 *   3. Broadcaster receives viewer-join → creates a NEW peer connection
 *      for that viewer, adds local tracks, creates offer → sends targeted offer
 *   4. Viewer receives offer → sets remote description, creates answer → sends back
 *   5. ICE candidates are exchanged per-viewer pair
 *   6. Broadcaster periodically re-announces for late joiners
 *
 * Each signal has a `target` field so messages reach the right peer.
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

type SignalType =
  | "broadcaster-ready"
  | "broadcaster-ended"
  | "viewer-join"
  | "offer"
  | "answer"
  | "ice-candidate";

interface SignalPayload {
  type: SignalType;
  data: string;
  from: string;
  target?: string; // targeted peer ID (empty = broadcast to all)
}

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  isBroadcaster: boolean;
  onViewerCountChange?: (count: number) => void;
}

export function useWebRTC({
  roomId,
  userId,
  isBroadcaster,
  onViewerCountChange,
}: UseWebRTCOptions) {
  // ── Viewer state ────────────────────────────────────────
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>("new");
  const [broadcasterOnline, setBroadcasterOnline] = useState(false);

  // ── Broadcaster state ───────────────────────────────────
  const localStreamRef = useRef<MediaStream | null>(null);
  const viewerPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const isBroadcastingRef = useRef(false);

  // ── Shared channel ──────────────────────────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelReadyRef = useRef(false);

  // ── Setup signaling channel ─────────────────────────────
  const getChannel = useCallback(() => {
    if (channelRef.current) return channelRef.current;
    const channel = supabase.channel(`live-rtc-${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    return channel;
  }, [roomId]);

  // ── Send signal ─────────────────────────────────────────
  const sendSignal = useCallback(
    (type: SignalType, data: string, target?: string) => {
      const channel = getChannel();
      if (!channelReadyRef.current) return;
      channel.send({
        type: "broadcast",
        event: "signal",
        payload: { type, data, from: userId, target } as SignalPayload,
      });
    },
    [getChannel, userId],
  );

  // ═══════════════════════════════════════════════════════════
  // BROADCASTER: create a peer connection FOR a specific viewer
  // ═══════════════════════════════════════════════════════════
  const createPeerForViewer = useCallback(
    (viewerId: string) => {
      const stream = localStreamRef.current;
      if (!stream) return;

      // Close existing connection to this viewer if any
      const existing = viewerPeersRef.current.get(viewerId);
      if (existing) {
        existing.close();
        viewerPeersRef.current.delete(viewerId);
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      viewerPeersRef.current.set(viewerId, pc);

      // Add local media tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // ICE candidates → targeted to this viewer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(
            "ice-candidate",
            JSON.stringify(event.candidate),
            viewerId,
          );
        }
      };

      // Track viewer connection state
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          viewerPeersRef.current.delete(viewerId);
          onViewerCountChange?.(viewerPeersRef.current.size);
        }
        if (pc.connectionState === "connected") {
          onViewerCountChange?.(viewerPeersRef.current.size);
        }
      };

      return pc;
    },
    [sendSignal, onViewerCountChange],
  );

  // Broadcaster: handle a viewer joining
  const handleViewerJoin = useCallback(
    async (viewerId: string) => {
      if (!isBroadcastingRef.current) return;

      const pc = createPeerForViewer(viewerId);
      if (!pc) return;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal("offer", JSON.stringify(offer), viewerId);
      } catch (err) {
        console.error("Failed to create offer for viewer", viewerId, err);
      }
    },
    [createPeerForViewer, sendSignal],
  );

  // Broadcaster: handle answer from a viewer
  const handleAnswerFromViewer = useCallback(
    async (viewerId: string, answerSdp: string) => {
      const pc = viewerPeersRef.current.get(viewerId);
      if (!pc) return;
      try {
        const answer = JSON.parse(answerSdp) as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Failed to set answer from viewer", viewerId, err);
      }
    },
    [],
  );

  // Broadcaster: handle ICE candidate from a viewer
  const handleIceFromViewer = useCallback(
    async (viewerId: string, candidateJson: string) => {
      const pc = viewerPeersRef.current.get(viewerId);
      if (!pc) return;
      try {
        const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore failed ICE candidates
      }
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════
  // VIEWER: handle offer from broadcaster
  // ═══════════════════════════════════════════════════════════
  const handleOfferFromBroadcaster = useCallback(
    async (broadcasterId: string, offerSdp: string) => {
      // Close existing connection if any
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // ICE candidates → targeted to broadcaster
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(
            "ice-candidate",
            JSON.stringify(event.candidate),
            broadcasterId,
          );
        }
      };

      // Connection state tracking
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
      };

      // Receive remote media stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      try {
        const offer = JSON.parse(offerSdp) as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal("answer", JSON.stringify(answer), broadcasterId);
      } catch (err) {
        console.error("Failed to handle offer from broadcaster", err);
      }
    },
    [sendSignal],
  );

  // Viewer: handle ICE candidate from broadcaster
  const handleIceFromBroadcaster = useCallback(
    async (candidateJson: string) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore failed ICE candidates
      }
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════
  // BROADCASTER public API
  // ═══════════════════════════════════════════════════════════
  const startBroadcast = useCallback(
    (stream: MediaStream) => {
      localStreamRef.current = stream;
      isBroadcastingRef.current = true;
      setIsBroadcasting(true);

      // Announce to any viewers already listening
      sendSignal("broadcaster-ready", "");
    },
    [sendSignal],
  );

  const stopBroadcast = useCallback(() => {
    sendSignal("broadcaster-ended", "");
    isBroadcastingRef.current = false;
    setIsBroadcasting(false);

    // Close all viewer peer connections
    viewerPeersRef.current.forEach((pc) => pc.close());
    viewerPeersRef.current.clear();
    onViewerCountChange?.(0);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, [sendSignal, onViewerCountChange]);

  // ═══════════════════════════════════════════════════════════
  // SIGNALING: Listen to channel events
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!userId) return;

    const channel = getChannel();

    channel.on(
      "broadcast",
      { event: "signal" },
      (msg: { payload: SignalPayload }) => {
        const { type, data, from, target } = msg.payload;

        // Skip own messages
        if (from === userId) return;

        // Skip messages targeted to someone else
        if (target && target !== userId) return;

        if (isBroadcaster) {
          // ── BROADCASTER handles ──
          switch (type) {
            case "viewer-join":
              handleViewerJoin(from);
              break;
            case "answer":
              handleAnswerFromViewer(from, data);
              break;
            case "ice-candidate":
              handleIceFromViewer(from, data);
              break;
          }
        } else {
          // ── VIEWER handles ──
          switch (type) {
            case "broadcaster-ready":
              setBroadcasterOnline(true);
              // Request connection by sending viewer-join
              sendSignal("viewer-join", "", from);
              break;
            case "offer":
              setBroadcasterOnline(true);
              handleOfferFromBroadcaster(from, data);
              break;
            case "ice-candidate":
              handleIceFromBroadcaster(data);
              break;
            case "broadcaster-ended":
              setBroadcasterOnline(false);
              setRemoteStream(null);
              if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
              }
              break;
          }
        }
      },
    );

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        channelReadyRef.current = true;

        // If viewer, announce presence so broadcaster knows to send offer
        if (!isBroadcaster) {
          // Small delay to ensure broadcaster's listener is set up
          setTimeout(() => {
            sendSignal("viewer-join", "");
          }, 500);
        }
      }
    });

    return () => {
      channelReadyRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isBroadcaster, roomId]);

  // ── Broadcaster: re-announce periodically for late joiners ──
  useEffect(() => {
    if (!isBroadcaster) return;
    if (!isBroadcasting) return;

    const interval = setInterval(() => {
      if (isBroadcastingRef.current && channelReadyRef.current) {
        sendSignal("broadcaster-ready", "");
      }
    }, 5000); // every 5 seconds

    return () => clearInterval(interval);
  }, [isBroadcaster, isBroadcasting, sendSignal]);

  // ── Cleanup on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      // Viewer cleanup
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      // Broadcaster cleanup
      viewerPeersRef.current.forEach((pc) => pc.close());
      viewerPeersRef.current.clear();
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
