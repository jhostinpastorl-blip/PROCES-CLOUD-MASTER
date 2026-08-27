import React from "react";

interface PremiumFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  placeholder?: string;
}

export function PremiumField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
  minLength,
  defaultValue,
  className = "",
  ...rest
}: PremiumFieldProps) {
  return (
    <label className="premium-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        className={className}
        {...rest}
      />
    </label>
  );
}