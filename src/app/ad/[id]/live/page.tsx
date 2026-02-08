"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
  Send,
  Plus,
  Minus,
  ShoppingCart,
  Eye,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWebRTC } from "@/lib/hooks/useWebRTC";
import { formatPrice, formatCountdown } from "@/lib/utils/format";
import { calcMinNextBid } from "@/lib/auction/types";
import toast from "react-hot-toast";

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
  const [minIncrementFromDb, setMinIncrementFromDb] = useState(0);
  const [buyNowPrice, setBuyNowPrice] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null); // null = loading
  const [sellerName, setSellerName] = useState("");

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

  // Viewer bid state
  const [bidAmount, setBidAmount] = useState(0);
  const [isBidding, setIsBidding] = useState(false);

  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);        // seller local camera
  const remoteVideoRef = useRef<HTMLVideoElement>(null);  // viewer receives seller stream
  const streamRef = useRef<MediaStream | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ── WebRTC for real video streaming ────────────────────
  const {
    remoteStream,
    connectionState,
    broadcasterOnline,
    startBroadcast,
    stopBroadcast: stopWebRTC,
  } = useWebRTC({
    roomId: adId,
    userId: user?.id || "anon-" + Math.random().toString(36).slice(2),
    isBroadcaster: isOwner === true,
    onViewerCountChange: (count) => setViewerCount(count),
  });

  // Attach remote stream to viewer video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ── Fetch ad data ───────────────────────────────────
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
      setMinIncrementFromDb(Number(ad.auction_min_increment) || 0);
      setBuyNowPrice(ad.auction_buy_now_price ? Number(ad.auction_buy_now_price) : null);

      const owner = user?.id === ad.user_id;
      setIsOwner(owner);

      // Get seller name
      if (ad.user_id) {
        const { data: profile } = await supabase
          .from("profiles" as never)
          .select("display_name")
          .eq("id", ad.user_id)
          .maybeSingle();
        if (profile) {
          setSellerName((profile as Record<string, unknown>).display_name as string || "البائع");
        }
      }

      // Fetch bids
      const { data: bidsData } = await supabase
        .from("auction_bids" as never)
        .select("amount")
        .eq("ad_id", adId)
        .order("amount", { ascending: false });

      if (bidsData && (bidsData as Record<string, unknown>[]).length > 0) {
        const highest = Number((bidsData as Record<string, unknown>[])[0].amount);
        setCurrentHighestBid(highest);
        setBidsCount((bidsData as Record<string, unknown>[]).length);
      }
    }

    fetchAd();
  }, [adId, user?.id]);

  // ── Initialize bid amount when data loads ────────────
  const currentPrice = currentHighestBid ?? startPrice;
  const sellerIncrement = minIncrementFromDb > 0 ? minIncrementFromDb : undefined;
  const minIncrement = sellerIncrement ?? Math.max(Math.ceil(currentPrice * 0.02), 50);
  const minNextBid = calcMinNextBid(currentPrice, sellerIncrement);

  useEffect(() => {
    if (minNextBid > 0) setBidAmount(minNextBid);
  }, [minNextBid]);

  // ── Countdown timer ──────────────────────────────────
  useEffect(() => {
    if (!auctionEndsAt) return;
    const tick = () => setRemaining(new Date(auctionEndsAt).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auctionEndsAt]);

  // ── Simulate viewer count (when live) ────────────────
  useEffect(() => {
    if (broadcastState !== "live") return;
    setViewerCount(1);
    const interval = setInterval(() => {
      setViewerCount((p) => Math.max(1, p + (Math.random() > 0.5 ? 1 : -1)));
    }, 5000);
    return () => clearInterval(interval);
  }, [broadcastState]);

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, liveBids]);

  // ── Camera functions (SELLER ONLY) ───────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? "user" : "environment" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("مش قادرين نوصل للكاميرا. اسمح بالوصول للكاميرا والميكروفون.");
    }
  }, [isFrontCamera]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Only start camera for SELLER
  useEffect(() => {
    if (isOwner !== true) return; // not the seller
    if (broadcastState === "preview" || broadcastState === "live") {
      startCamera();
    }
    return () => {
      if (broadcastState === "ended") stopCamera();
    };
  }, [broadcastState, isOwner, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const toggleVideo = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsVideoOn((p) => !p);
  }, []);

  const toggleAudio = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsAudioOn((p) => !p);
  }, []);

  const switchCamera = useCallback(() => {
    stopCamera();
    setIsFrontCamera((p) => !p);
  }, [stopCamera]);

  const goLive = useCallback(async () => {
    const authed = await requireAuth();
    if (!authed) return;
    setBroadcastState("live");
    // Start WebRTC broadcast with the current camera stream
    if (streamRef.current) {
      startBroadcast(streamRef.current);
    }
  }, [requireAuth, startBroadcast]);

  const endBroadcast = useCallback(() => {
    stopWebRTC();
    stopCamera();
    setBroadcastState("ended");
  }, [stopWebRTC, stopCamera]);

  // ── Comments ─────────────────────────────────────────
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

  // ── Viewer: Place bid ────────────────────────────────
  const handlePlaceBid = useCallback(async () => {
    const authed = await requireAuth();
    if (!authed) return;
    if (bidAmount < minNextBid) {
      toast.error(`الحد الأدنى للمزايدة ${formatPrice(minNextBid)}`);
      return;
    }

    setIsBidding(true);
    try {
      const res = await fetch("/api/auctions/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_id: adId,
          bidder_id: authed.id,
          bidder_name: authed.display_name || "مزايد",
          amount: bidAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "حصلت مشكلة");
      } else {
        toast.success("تم تسجيل مزايدتك!");
      }
    } catch {
      toast.error("مش قادرين نوصل للسيرفر");
    }
    setIsBidding(false);
  }, [requireAuth, bidAmount, minNextBid, adId]);

  // ── Real-time bids subscription ──────────────────────
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
          const amount = Number(newBid.amount);

          setCurrentHighestBid((prev) => (prev === null || amount > prev ? amount : prev));
          setBidsCount((prev) => prev + 1);
          setLiveBids((prev) => [
            { bidderName: "مزايد", amount, timestamp: Date.now() },
            ...prev,
          ]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [adId]);

  // ── Error screen ─────────────────────────────────────
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

  // ── Loading ──────────────────────────────────────────
  if (isOwner === null) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white text-sm">جاري التحميل...</p>
        </div>
      </main>
    );
  }

  // ══════════════════════════════════════════════════════
  // ██ SELLER VIEW — Camera + Broadcast Controls
  // ══════════════════════════════════════════════════════
  if (isOwner) {
    return (
      <main className="min-h-screen bg-black relative overflow-hidden">
        <div className="relative w-full h-screen">
          {/* Camera feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""} ${
              isFrontCamera ? "scale-x-[-1]" : ""
            }`}
          />

          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff size={48} className="text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">الكاميرا مقفولة</p>
            </div>
          )}

          {/* Top overlay */}
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => { stopCamera(); router.back(); }}
                className="p-2 rounded-full bg-black/40 text-white"
              >
                <X size={20} />
              </button>

              {broadcastState === "live" && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    <span className="text-white text-xs font-bold">أنت تبث الآن</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
                    <Users size={14} className="text-white" />
                    <span className="text-white text-xs font-bold">{viewerCount}</span>
                  </div>
                </div>
              )}

              {remaining > 0 && (
                <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
                  <Clock size={14} className="text-white" />
                  <span className="text-white text-xs font-bold" dir="ltr">
                    {formatCountdown(remaining)}
                  </span>
                </div>
              )}
            </div>

            {/* Ad info + bid stats */}
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

          {/* Live bids feed on video */}
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
                  <span className="text-white text-xs font-bold truncate">{bid.bidderName}</span>
                  <span className="text-brand-gold text-xs font-bold">{formatPrice(bid.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Comments (when live) */}
          {broadcastState === "live" && (
            <div className="absolute bottom-36 inset-x-0 z-10 px-4">
              <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-1.5 max-w-[80%]">
                    <span className="text-brand-green text-xs font-bold flex-shrink-0">{c.userName}:</span>
                    <span className="text-white text-xs">{c.text}</span>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-6 px-4">
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
                  <button onClick={sendComment} disabled={!commentInput.trim()} className="text-white disabled:opacity-40">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}

            {broadcastState === "preview" && (
              <div className="space-y-4">
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 text-center">
                  <p className="text-yellow-200 text-xs font-bold">
                    رسوم البث المباشر: 50 جنيه + 2% من سعر البيع النهائي
                  </p>
                  <p className="text-yellow-200/70 text-[11px] mt-1">
                    بالضغط على &quot;ابدأ البث&quot; أنت موافق على الرسوم
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button onClick={toggleVideo} className={`p-3 rounded-full ${isVideoOn ? "bg-white/20" : "bg-red-500"}`}>
                    {isVideoOn ? <Video size={22} className="text-white" /> : <VideoOff size={22} className="text-white" />}
                  </button>
                  <button onClick={toggleAudio} className={`p-3 rounded-full ${isAudioOn ? "bg-white/20" : "bg-red-500"}`}>
                    {isAudioOn ? <Mic size={22} className="text-white" /> : <MicOff size={22} className="text-white" />}
                  </button>
                  <button onClick={switchCamera} className="p-3 rounded-full bg-white/20">
                    <SwitchCamera size={22} className="text-white" />
                  </button>
                </div>

                <Button fullWidth size="lg" onClick={goLive} className="bg-red-600 hover:bg-red-700 text-white">
                  <Radio size={18} />
                  ابدأ البث المباشر
                </Button>
              </div>
            )}

            {broadcastState === "live" && (
              <div className="flex items-center justify-center gap-4">
                <button onClick={toggleVideo} className={`p-3 rounded-full ${isVideoOn ? "bg-white/20" : "bg-red-500"}`}>
                  {isVideoOn ? <Video size={20} className="text-white" /> : <VideoOff size={20} className="text-white" />}
                </button>
                <button onClick={toggleAudio} className={`p-3 rounded-full ${isAudioOn ? "bg-white/20" : "bg-red-500"}`}>
                  {isAudioOn ? <Mic size={20} className="text-white" /> : <MicOff size={20} className="text-white" />}
                </button>
                <button onClick={switchCamera} className="p-3 rounded-full bg-white/20">
                  <SwitchCamera size={20} className="text-white" />
                </button>
                <button onClick={endBroadcast} className="px-6 py-3 rounded-full bg-red-600 text-white font-bold text-sm">
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

  // ══════════════════════════════════════════════════════
  // ██ VIEWER VIEW — Watch stream + Bid + Comment
  // ══════════════════════════════════════════════════════
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Top: Stream area ─────────────────────────── */}
      <div className="relative w-full aspect-[9/16] max-h-[55vh] bg-black flex-shrink-0">
        {/* ── LIVE VIDEO from seller (WebRTC remote stream) ── */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        ) : (
          <>
            {/* Blurred product image as background while waiting */}
            {adImage ? (
              <Image
                src={adImage}
                alt={adTitle}
                fill
                className="object-cover opacity-30 blur-sm"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-900" />
            )}
          </>
        )}

        {/* Stream overlay content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {/* Live badge */}
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full mb-4 ${
            remoteStream ? "bg-red-600" : "bg-gray-700"
          }`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                remoteStream ? "bg-white" : "bg-gray-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                remoteStream ? "bg-white" : "bg-gray-400"
              }`} />
            </span>
            <Radio size={14} className="text-white" />
            <span className="text-white text-sm font-bold">
              {remoteStream ? "مباشر الآن" : broadcasterOnline ? "جاري الاتصال..." : "في انتظار البائع"}
            </span>
          </div>

          {/* Show product image + info ONLY when not streaming */}
          {!remoteStream && (
            <>
              {adImage && (
                <div className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-white/20 mb-4 shadow-2xl">
                  <Image
                    src={adImage}
                    alt={adTitle}
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <p className="text-white font-bold text-base text-center px-4 mb-1">{adTitle}</p>
              <p className="text-gray-400 text-xs">البائع: {sellerName || "—"}</p>

              {!broadcasterOnline && (
                <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 text-center max-w-[80%]">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-gray-300 text-xs">البائع لسه ما بدأش البث</p>
                  <p className="text-gray-500 text-[10px] mt-1">هيظهرلك الفيديو تلقائي لما يبدأ</p>
                </div>
              )}

              {broadcasterOnline && !remoteStream && (
                <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 text-center max-w-[80%]">
                  <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-gray-300 text-xs">البائع بيبث — جاري الاتصال...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Top bar: close + timer + viewers */}
        <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between z-20">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-black/40 text-white"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
              <Eye size={13} className="text-white" />
              <span className="text-white text-[11px] font-bold">{viewerCount || "—"}</span>
            </div>
            {remaining > 0 && (
              <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
                <Clock size={13} className="text-white" />
                <span className="text-white text-[11px] font-bold" dir="ltr">{formatCountdown(remaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live bids floating */}
        {liveBids.length > 0 && (
          <div className="absolute start-3 bottom-3 z-20 space-y-1 max-w-[70%]">
            {liveBids.slice(0, 3).map((bid, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 ${
                  i === 0 ? "animate-bounce" : "opacity-60"
                }`}
              >
                <Trophy size={11} className="text-brand-gold flex-shrink-0" />
                <span className="text-white text-[11px] font-bold truncate">{bid.bidderName}</span>
                <span className="text-brand-gold text-[11px] font-bold">{formatPrice(bid.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom: Bid panel + Comments ──────────────── */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 relative z-20 flex flex-col overflow-hidden">
        {/* Auction stats bar */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-text">أعلى مزايدة</span>
              <p className="text-lg font-bold text-brand-green">{formatPrice(currentPrice)}</p>
            </div>
            <div className="text-end">
              <span className="text-xs text-gray-text flex items-center gap-1 justify-end">
                <TrendingUp size={12} />
                {bidsCount} مزايدة
              </span>
              {remaining > 0 && (
                <p className="text-xs font-bold text-brand-gold mt-0.5" dir="ltr">
                  {formatCountdown(remaining)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Comments section */}
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0 max-h-32">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-text text-center py-2">اكتب تعليق للتفاعل مع البث</p>
          ) : (
            <div className="space-y-1.5">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-1.5">
                  <span className="text-brand-green text-xs font-bold flex-shrink-0">{c.userName}:</span>
                  <span className="text-dark text-xs">{c.text}</span>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Comment input */}
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
              placeholder="اكتب تعليق..."
              className="flex-1 bg-gray-100 rounded-full px-3.5 py-2 text-xs text-dark placeholder:text-gray-400 outline-none"
            />
            <button onClick={sendComment} disabled={!commentInput.trim()} className="text-brand-green disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* ── Bid stepper ──────────────────────────────── */}
        {remaining > 0 && (
          <div className="px-4 pt-3 pb-4 border-t border-gray-100 bg-gray-50 space-y-3">
            {/* Stepper */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setBidAmount((p) => Math.max(minNextBid, p - minIncrement))}
                disabled={bidAmount <= minNextBid || isBidding}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 active:scale-95 flex items-center justify-center transition-all disabled:opacity-40"
              >
                <Minus size={18} className="text-dark" />
              </button>

              <div className="flex-1 max-w-[180px] text-center">
                <div className="bg-brand-green-light border-2 border-brand-green rounded-2xl px-3 py-2.5">
                  <span className="text-xl font-bold text-brand-green" dir="ltr">
                    {bidAmount.toLocaleString("en-US")}
                  </span>
                  <span className="text-xs font-medium text-brand-green me-1"> جنيه</span>
                </div>
                <p className="text-[10px] text-gray-text mt-1">
                  الحد الأدنى: {formatPrice(minNextBid)} — الزيادة: {formatPrice(minIncrement)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setBidAmount((p) => p + minIncrement)}
                disabled={isBidding}
                className="w-10 h-10 rounded-full bg-brand-green-light hover:bg-brand-green/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-40"
              >
                <Plus size={18} className="text-brand-green" />
              </button>
            </div>

            {/* Quick chips */}
            <div className="flex justify-center gap-1.5">
              {[1, 2, 5, 10].map((m) => (
                <button
                  key={m}
                  onClick={() => setBidAmount(minNextBid + minIncrement * m - minIncrement)}
                  disabled={isBidding}
                  className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-gray-200 text-gray-text hover:bg-brand-gold-light hover:text-brand-gold active:scale-95 transition-all disabled:opacity-40"
                >
                  +{formatPrice(minIncrement * m)}
                </button>
              ))}
            </div>

            {/* Bid + Buy Now buttons */}
            <div className="flex gap-2">
              <Button
                fullWidth
                size="lg"
                onClick={handlePlaceBid}
                disabled={isBidding}
                isLoading={isBidding}
                variant="secondary"
              >
                <Gavel size={16} />
                زايد بـ {formatPrice(bidAmount)}
              </Button>

              {buyNowPrice && (
                <Button
                  size="lg"
                  onClick={async () => {
                    const authed = await requireAuth();
                    if (!authed) return;
                    try {
                      const res = await fetch("/api/auctions/buy-now", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ad_id: adId, buyer_id: authed.id }),
                      });
                      if (res.ok) {
                        toast.success("تم الشراء!");
                        router.push(`/ad/${adId}`);
                      } else {
                        const d = await res.json();
                        toast.error(d.error || "حصلت مشكلة");
                      }
                    } catch {
                      toast.error("مش قادرين نوصل للسيرفر");
                    }
                  }}
                  className="flex-shrink-0 whitespace-nowrap"
                >
                  <ShoppingCart size={16} />
                  {formatPrice(buyNowPrice)}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
