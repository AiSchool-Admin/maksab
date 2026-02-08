"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  Radio,
  X,
  Users,
  Gavel,
  Clock,
  TrendingUp,
  Trophy,
  MessageCircle,
  Send,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatPrice, formatCountdown } from "@/lib/utils/format";

type BroadcastState = "preview" | "live" | "ended";

interface LiveComment {
  id: string;
  userName: string;
  text: string;
  timestamp: number;
}

interface LiveBid {
  bidderName: string;
  amount: number;
  timestamp: number;
}

export default function LiveBroadcastPage() {
  const params = useParams();
  const router = useRouter();
  const adId = params.id as string;
  const { user, requireAuth } = useAuth();

  // Ad data
  const [adTitle, setAdTitle] = useState("");
  const [adImage, setAdImage] = useState<string | null>(null);
  const [startPrice, setStartPrice] = useState(0);
  const [currentHighestBid, setCurrentHighestBid] = useState<number | null>(null);
  const [bidsCount, setBidsCount] = useState(0);
  const [isOwner, setIsOwner] = useState(false);

  // Broadcast state
  const [broadcastState, setBroadcastState] = useState<BroadcastState>("preview");
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [auctionEndsAt, setAuctionEndsAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Comments & bids
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [liveBids, setLiveBids] = useState<LiveBid[]>([]);
  const [commentInput, setCommentInput] = useState("");

  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch ad data
  useEffect(() => {
    async function fetchAd() {
      const { data, error: fetchError } = await supabase
        .from("ads" as never)
        .select("*")
        .eq("id", adId)
        .maybeSingle();

      if (fetchError || !data) {
        setError("الإعلان مش موجود");
        return;
      }

      const ad = data as Record<string, unknown>;
      setAdTitle(ad.title as string);
      setAdImage(((ad.images as string[]) ?? [])[0] ?? null);
      setStartPrice(Number(ad.auction_start_price) || 0);
      setAuctionEndsAt(ad.auction_ends_at as string);
      setIsOwner(user?.id === ad.user_id);

      // Fetch bids
      const { data: bidsData } = await supabase
        .from("auction_bids" as never)
        .select("amount")
        .eq("ad_id", adId)
        .order("amount", { ascending: false });

      if (bidsData && (bidsData as Record<string, unknown>[]).length > 0) {
        setCurrentHighestBid(Number((bidsData as Record<string, unknown>[])[0].amount));
        setBidsCount((bidsData as Record<string, unknown>[]).length);
      }
    }

    fetchAd();
  }, [adId, user?.id]);

  // Countdown timer
  useEffect(() => {
    if (!auctionEndsAt) return;

    const tick = () => {
      const diff = new Date(auctionEndsAt).getTime() - Date.now();
      setRemaining(diff);
    };
    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auctionEndsAt]);

  // Simulate viewer count fluctuation when live
  useEffect(() => {
    if (broadcastState !== "live") return;

    // Start with 1 (the broadcaster)
    setViewerCount(1);
    const interval = setInterval(() => {
      setViewerCount((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        return Math.max(1, prev + change);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [broadcastState]);

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, liveBids]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: isFrontCamera ? "user" : "environment" },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("مش قادرين نوصل للكاميرا. اسمح بالوصول للكاميرا والميكروفون.");
    }
  }, [isFrontCamera]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera on preview
  useEffect(() => {
    if (broadcastState === "preview" || broadcastState === "live") {
      startCamera();
    }
    return () => {
      if (broadcastState === "ended") stopCamera();
    };
  }, [broadcastState, startCamera, stopCamera]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn((prev) => !prev);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioOn((prev) => !prev);
    }
  }, []);

  // Switch camera
  const switchCamera = useCallback(async () => {
    stopCamera();
    setIsFrontCamera((prev) => !prev);
    // Camera will restart via the effect
  }, [stopCamera]);

  // Go live
  const goLive = useCallback(async () => {
    const authed = await requireAuth();
    if (!authed) return;

    if (!isOwner) {
      setError("فقط صاحب الإعلان يقدر يبدأ البث");
      return;
    }

    setBroadcastState("live");
  }, [requireAuth, isOwner]);

  // End broadcast
  const endBroadcast = useCallback(() => {
    stopCamera();
    setBroadcastState("ended");
  }, [stopCamera]);

  // Send comment
  const sendComment = useCallback(() => {
    if (!commentInput.trim()) return;

    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        userName: user?.display_name || "زائر",
        text: commentInput.trim(),
        timestamp: Date.now(),
      },
    ]);
    setCommentInput("");
  }, [commentInput, user?.display_name]);

  // Subscribe to real-time bids
  useEffect(() => {
    const channel = supabase
      .channel(`live-auction-${adId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: "auction_bids",
          filter: `ad_id=eq.${adId}`,
        } as never,
        (payload: { new: Record<string, unknown> }) => {
          const newBid = payload.new;
          const bidAmount = Number(newBid.amount);

          setCurrentHighestBid((prev) =>
            prev === null || bidAmount > prev ? bidAmount : prev,
          );
          setBidsCount((prev) => prev + 1);

          setLiveBids((prev) => [
            {
              bidderName: "مزايد",
              amount: bidAmount,
              timestamp: Date.now(),
            },
            ...prev,
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adId]);

  if (error && !adTitle) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white p-6">
          <p className="text-lg mb-4">{error}</p>
          <Button onClick={() => router.back()}>رجوع</Button>
        </div>
      </main>
    );
  }

  const currentPrice = currentHighestBid ?? startPrice;

  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      {/* ── Video Area ─────────────────────────────────── */}
      <div className="relative w-full h-screen">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""} ${
            isFrontCamera ? "scale-x-[-1]" : ""
          }`}
        />

        {/* Video off placeholder */}
        {!isVideoOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <VideoOff size={48} className="text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">الكاميرا مقفولة</p>
            </div>
          </div>
        )}

        {/* ── Top overlay: status bar ─────────────────── */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
          {/* Close / back button */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                stopCamera();
                router.back();
              }}
              className="p-2 rounded-full bg-black/40 text-white"
            >
              <X size={20} />
            </button>

            {broadcastState === "live" && (
              <div className="flex items-center gap-2">
                {/* Live badge */}
                <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  <span className="text-white text-xs font-bold">مباشر</span>
                </div>

                {/* Viewer count */}
                <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
                  <Users size={14} className="text-white" />
                  <span className="text-white text-xs font-bold">{viewerCount}</span>
                </div>
              </div>
            )}

            {/* Timer */}
            {remaining > 0 && (
              <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
                <Clock size={14} className="text-white" />
                <span className="text-white text-xs font-bold" dir="ltr">
                  {formatCountdown(remaining)}
                </span>
              </div>
            )}
          </div>

          {/* Ad info */}
          <div className="bg-black/40 rounded-xl px-3 py-2">
            <p className="text-white text-sm font-bold line-clamp-1">{adTitle}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-brand-gold text-xs font-bold flex items-center gap-1">
                <Gavel size={12} />
                أعلى مزايدة: {formatPrice(currentPrice)}
              </span>
              <span className="text-gray-300 text-xs flex items-center gap-1">
                <TrendingUp size={12} />
                {bidsCount} مزايدة
              </span>
            </div>
          </div>
        </div>

        {/* ── Live bids feed (floating on video) ──────── */}
        {broadcastState === "live" && liveBids.length > 0 && (
          <div className="absolute start-4 top-1/3 z-10 space-y-1 max-w-[60%]">
            {liveBids.slice(0, 5).map((bid, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 ${
                  i === 0 ? "animate-bounce" : "opacity-70"
                }`}
              >
                <Trophy size={12} className="text-brand-gold flex-shrink-0" />
                <span className="text-white text-xs font-bold truncate">
                  {bid.bidderName}
                </span>
                <span className="text-brand-gold text-xs font-bold">
                  {formatPrice(bid.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Comments feed (bottom) ─────────────────── */}
        {broadcastState === "live" && (
          <div className="absolute bottom-36 inset-x-0 z-10 px-4">
            <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-1.5 max-w-[80%]">
                  <span className="text-brand-green text-xs font-bold flex-shrink-0">
                    {comment.userName}:
                  </span>
                  <span className="text-white text-xs">{comment.text}</span>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          </div>
        )}

        {/* ── Bottom controls ────────────────────────── */}
        <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-6 px-4">
          {/* Comment input (when live) */}
          {broadcastState === "live" && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 flex items-center bg-white/20 rounded-full px-4 py-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendComment()}
                  placeholder="اكتب تعليق..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-400 outline-none"
                />
                <button
                  onClick={sendComment}
                  disabled={!commentInput.trim()}
                  className="text-white disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Camera controls */}
          {broadcastState === "preview" && (
            <div className="space-y-4">
              {/* Fee notice */}
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 text-center">
                <p className="text-yellow-200 text-xs font-bold">
                  رسوم البث المباشر: 50 جنيه + 2% من سعر البيع النهائي
                </p>
                <p className="text-yellow-200/70 text-[11px] mt-1">
                  بالضغط على &quot;ابدأ البث&quot; أنت موافق على الرسوم
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full ${isVideoOn ? "bg-white/20" : "bg-red-500"}`}
                >
                  {isVideoOn ? (
                    <Video size={22} className="text-white" />
                  ) : (
                    <VideoOff size={22} className="text-white" />
                  )}
                </button>

                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full ${isAudioOn ? "bg-white/20" : "bg-red-500"}`}
                >
                  {isAudioOn ? (
                    <Mic size={22} className="text-white" />
                  ) : (
                    <MicOff size={22} className="text-white" />
                  )}
                </button>

                <button
                  onClick={switchCamera}
                  className="p-3 rounded-full bg-white/20"
                >
                  <SwitchCamera size={22} className="text-white" />
                </button>
              </div>

              <Button
                fullWidth
                size="lg"
                onClick={goLive}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Radio size={18} />
                ابدأ البث المباشر
              </Button>
            </div>
          )}

          {broadcastState === "live" && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${isVideoOn ? "bg-white/20" : "bg-red-500"}`}
              >
                {isVideoOn ? (
                  <Video size={20} className="text-white" />
                ) : (
                  <VideoOff size={20} className="text-white" />
                )}
              </button>

              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${isAudioOn ? "bg-white/20" : "bg-red-500"}`}
              >
                {isAudioOn ? (
                  <Mic size={20} className="text-white" />
                ) : (
                  <MicOff size={20} className="text-white" />
                )}
              </button>

              <button
                onClick={switchCamera}
                className="p-3 rounded-full bg-white/20"
              >
                <SwitchCamera size={20} className="text-white" />
              </button>

              <button
                onClick={endBroadcast}
                className="px-6 py-3 rounded-full bg-red-600 text-white font-bold text-sm"
              >
                إنهاء البث
              </button>
            </div>
          )}

          {broadcastState === "ended" && (
            <div className="space-y-3 text-center">
              <p className="text-white text-lg font-bold">انتهى البث المباشر</p>
              {currentHighestBid && (
                <p className="text-brand-gold text-sm">
                  أعلى مزايدة: {formatPrice(currentHighestBid)} ({bidsCount} مزايدة)
                </p>
              )}
              <Button fullWidth onClick={() => router.push(`/ad/${adId}`)}>
                العودة للإعلان
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
