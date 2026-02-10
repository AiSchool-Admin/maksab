"use client";

import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import Button from "@/components/ui/Button";

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
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      setIsFollowing(!isFollowing);
      setCount((prev) => (isFollowing ? prev - 1 : prev + 1));
      onToggle?.();
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
        <span className="text-[10px] opacity-70 mr-1">({count})</span>
      )}
    </Button>
  );
}
