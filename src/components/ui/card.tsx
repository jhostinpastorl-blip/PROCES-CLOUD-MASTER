import React from "react";

export function Card({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`pc-card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`pc-card-header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  as: Component = "h3",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" | "h4" }) {
  return (
    <Component className={`pc-card-title ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`pc-card-desc ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`pc-card-content ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`pc-card-footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
