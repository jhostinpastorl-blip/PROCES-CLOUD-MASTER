import React from "react";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
}

export function Badge({
  tone = "neutral",
  size = "sm",
  dot = false,
  children,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span className={`pc-badge pc-badge-${tone} pc-badge-${size} ${className}`.trim()} {...props}>
      {dot && <span className="pc-badge-dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
