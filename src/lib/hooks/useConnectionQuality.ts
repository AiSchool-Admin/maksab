/**
 * Connection quality monitoring hook for WebRTC live auctions.
 * Monitors RTCPeerConnection stats and provides quality indicators.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "disconnected";

interface ConnectionStats {
  quality: ConnectionQuality;
  qualityAr: string;
  emoji: string;
  bitrate: number; // kbps
  packetLoss: number; // percentage
  roundTripTime: number; // ms
}

export function useConnectionQuality(
  peerConnection: RTCPeerConnection | null,
  isActive: boolean,
): ConnectionStats {
  const [stats, setStats] = useState<ConnectionStats>({
    quality: "disconnected",
    qualityAr: "غير متصل",
    emoji: "⚫",
    bitrate: 0,
    packetLoss: 0,
    roundTripTime: 0,
  });

  const prevBytesRef = useRef(0);
  const prevTimestampRef = useRef(0);

  const checkQuality = useCallback(async () => {
    if (!peerConnection || !isActive) {
      setStats({
        quality: "disconnected",
        qualityAr: "غير متصل",
        emoji: "⚫",
        bitrate: 0,
        packetLoss: 0,
        roundTripTime: 0,
      });
      return;
    }

    try {
      const report = await peerConnection.getStats();
      let totalBytesReceived = 0;
      let packetLoss = 0;
      let rtt = 0;

      report.forEach((stat) => {
        if (stat.type === "inbound-rtp" && stat.kind === "video") {
          totalBytesReceived = stat.bytesReceived || 0;
          const packetsLost = stat.packetsLost || 0;
          const packetsReceived = stat.packetsReceived || 1;
          packetLoss = (packetsLost / (packetsLost + packetsReceived)) * 100;
        }
        if (stat.type === "candidate-pair" && stat.state === "succeeded") {
          rtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
        }
      });

      // Calculate bitrate
      const now = Date.now();
      let bitrate = 0;
      if (prevBytesRef.current > 0 && prevTimestampRef.current > 0) {
        const timeDiff = (now - prevTimestampRef.current) / 1000;
        const bytesDiff = totalBytesReceived - prevBytesRef.current;
        bitrate = Math.round((bytesDiff * 8) / timeDiff / 1000); // kbps
      }
      prevBytesRef.current = totalBytesReceived;
      prevTimestampRef.current = now;

      // Determine quality
      let quality: ConnectionQuality;
      let qualityAr: string;
      let emoji: string;

      if (bitrate > 1000 && packetLoss < 1 && rtt < 100) {
        quality = "excellent";
        qualityAr = "ممتاز";
        emoji = "🟢";
      } else if (bitrate > 500 && packetLoss < 3 && rtt < 200) {
        quality = "good";
        qualityAr = "كويس";
        emoji = "🟢";
      } else if (bitrate > 200 && packetLoss < 5 && rtt < 400) {
        quality = "fair";
        qualityAr = "مقبول";
        emoji = "🟡";
      } else {
        quality = "poor";
        qualityAr = "ضعيف";
        emoji = "🔴";
      }

      setStats({ quality, qualityAr, emoji, bitrate, packetLoss: Math.round(packetLoss), roundTripTime: Math.round(rtt) });
    } catch {
      // Stats not available
    }
  }, [peerConnection, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(checkQuality, 3000); // every 3 seconds
    return () => clearInterval(interval);
  }, [isActive, checkQuality]);

  return stats;
}
