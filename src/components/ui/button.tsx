import React from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "white";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  href,
  external = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClass = `pc-btn pc-btn-${variant} pc-btn-${size} ${className} ${isLoading ? "is-loading" : ""}`.trim();

  const content = (
    <>
      {isLoading && <span className="pc-btn-spinner" aria-hidden="true" />}
      {!isLoading && leftIcon && <span className="pc-btn-icon-left">{leftIcon}</span>}
      <span className="pc-btn-content">{children}</span>
      {!isLoading && rightIcon && <span className="pc-btn-icon-right">{rightIcon}</span>}
    </>
  );

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <button className={baseClass} disabled={disabled || isLoading} {...props}>
      {content}
    </button>
  );
}
