"use client";

import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";

interface FollowButtonProps {
  isFollowing: boolean;
  followersCount: number;
  onToggle?: () => void;
}

export default function FollowButton({
  isFollowing: initialFollowing,
  followersCount: initialCount,
  onToggle,
}: FollowButtonProps) {
  const { user, requireAuth } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    // Require auth before following
    const authedUser = user || await requireAuth();
    if (!authedUser) return;

    setIsLoading(true);
    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setCount((prev) => (wasFollowing ? prev - 1 : prev + 1));

    try {
      onToggle?.();
    } catch {
      // Revert optimistic update on failure
      setIsFollowing(wasFollowing);
      setCount((prev) => (wasFollowing ? prev + 1 : prev - 1));
      toast.error("حصل مشكلة، جرب تاني");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isFollowing ? "outline" : "primary"}
      size="sm"
      icon={
        isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />
      }
      isLoading={isLoading}
      onClick={handleToggle}
    >
      {isFollowing ? "متابَع" : "متابعة"}
      {count > 0 && (
        <span className="text-[10px] opacity-70 me-1">({count})</span>
      )}
    </Button>
  );
}
