"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pl-9 pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        <span className="relative h-4 w-4">
          <Eye
            aria-hidden
            className={cn(
              "absolute inset-0 h-4 w-4 transition-all duration-200 ease-out motion-reduce:transition-none",
              visible ? "scale-75 rotate-12 opacity-0" : "scale-100 rotate-0 opacity-100"
            )}
          />
          <EyeOff
            aria-hidden
            className={cn(
              "absolute inset-0 h-4 w-4 transition-all duration-200 ease-out motion-reduce:transition-none",
              visible ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-12 opacity-0"
            )}
          />
        </span>
      </button>
    </div>
  );
}
