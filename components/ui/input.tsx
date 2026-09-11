import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({
  id,
  label,
  error,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={inputId}>
      <span className="font-medium text-zinc-200">{label}</span>
      <input
        id={inputId}
        className={`rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none ring-zinc-400 focus:ring-2 ${className}`}
        {...props}
      />
      {error ? <span className="text-sm text-red-400">{error}</span> : null}
    </label>
  );
}
