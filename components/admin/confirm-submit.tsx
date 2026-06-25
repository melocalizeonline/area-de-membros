"use client";

import { cn } from "@/lib/utils";

type ConfirmSubmitProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string;
};

export function ConfirmSubmit({ message, className, children, ...props }: ConfirmSubmitProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      type="submit"
      {...props}
    >
      {children}
    </button>
  );
}
