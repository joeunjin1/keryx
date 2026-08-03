/**
 * Avatar 컴포넌트
 * keryx-platform-dev 스킬 준수
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import React from "react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "brand" | "vip" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getColorClass(name?: string): string {
  const colors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-teal-500",
    "bg-orange-500",
  ];
  if (!name) return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function Avatar({ src, alt, name, size = "md", variant, className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt || name || "avatar"}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${getColorClass(name)} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}

export default Avatar;
