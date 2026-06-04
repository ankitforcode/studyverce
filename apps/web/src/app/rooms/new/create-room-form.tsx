"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createRoomAction } from "@/app/rooms/new/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Clock,
  Loader2,
  Sparkles,
  Timer,
  Users,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUS_LENGTHS = [15, 20, 25, 30, 45, 50, 60] as const;
const BREAK_LENGTHS = [5, 10, 15, 20] as const;

export function CreateRoomForm() {
  const [state, formAction, pending] = useActionState(createRoomAction, {
    error: null as string | null,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [breaksEnabled, setBreaksEnabled] = useState(true);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [namesLoading, setNamesLoading] = useState(false);
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [isAnimatingDescription, setIsAnimatingDescription] = useState(false);

  const descriptionRequestRef = useRef(0);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animateDescription = useCallback((text: string) => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
    }
    setIsAnimatingDescription(true);
    setDescription("");

    let index = 0;
    typewriterRef.current = setInterval(() => {
      index += 1;
      setDescription(text.slice(0, index));
      if (index >= text.length) {
        if (typewriterRef.current) clearInterval(typewriterRef.current);
        typewriterRef.current = null;
        setIsAnimatingDescription(false);
      }
    }, 14);
  }, []);

  const fetchDescription = useCallback(
    async (roomName: string) => {
      const trimmed = roomName.trim();
      if (trimmed.length < 2) return;

      const requestId = ++descriptionRequestRef.current;
      setDescriptionLoading(true);

      try {
        const res = await fetch("/api/rooms/create-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "description", name: trimmed }),
        });
        const data = (await res.json()) as {
          description?: string;
          error?: string;
        };
        if (requestId !== descriptionRequestRef.current) return;
        if (res.ok && data.description) {
          animateDescription(data.description);
        }
      } catch {
        /* ignore */
      } finally {
        if (requestId === descriptionRequestRef.current) {
          setDescriptionLoading(false);
        }
      }
    },
    [animateDescription]
  );

  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 3) return;

    const timer = window.setTimeout(() => {
      void fetchDescription(trimmed);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [name, fetchDescription]);

  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, []);

  async function loadNameSuggestions() {
    setNamesLoading(true);
    try {
      const res = await fetch("/api/rooms/create-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "names" }),
      });
      const data = (await res.json()) as { names?: string[] };
      if (res.ok && data.names?.length) {
        setNameSuggestions(data.names);
      }
    } catch {
      /* ignore */
    } finally {
      setNamesLoading(false);
    }
  }

  function applySuggestion(suggestion: string) {
    setName(suggestion);
    void fetchDescription(suggestion);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50",
        "bg-card/55 shadow-xl backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-card/45"
      )}
    >
      <div className="border-b border-border/40 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Create a Study Room
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up a space for you and others to study together
            </p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-6 px-6 py-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="name" className="text-foreground">
              Room name
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
              disabled={namesLoading || pending}
              onClick={() => void loadNameSuggestions()}
            >
              {namesLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              Name ideas
            </Button>
          </div>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Late Night CS Study"
            required
            maxLength={80}
            className="h-11 rounded-xl border-border/60 bg-background/60"
          />
          {nameSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nameSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="description" className="text-foreground">
              Description
            </Label>
            <span className="text-xs text-muted-foreground">(optional)</span>
            {(descriptionLoading || isAnimatingDescription) && (
              <span className="ml-auto flex items-center gap-1 text-xs text-primary">
                <Sparkles className="h-3 w-3 animate-pulse" />
                {descriptionLoading ? "Writing…" : "Magic fill"}
              </span>
            )}
          </div>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => {
              if (typewriterRef.current) {
                clearInterval(typewriterRef.current);
                typewriterRef.current = null;
              }
              setIsAnimatingDescription(false);
              setDescription(e.target.value);
            }}
            placeholder="What will you study in this room?"
            maxLength={500}
            className={cn(
              "min-h-[96px] resize-y rounded-xl border-border/60 bg-background/60 transition-all duration-300",
              (descriptionLoading || isAnimatingDescription) &&
                "border-primary/40 ring-2 ring-primary/25"
            )}
          />
        </section>

        <section className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Timer className="h-4 w-4 text-primary" />
            Pomodoro defaults
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="focus_minutes" className="text-xs text-muted-foreground">
                Focus length (minutes)
              </Label>
              <select
                id="focus_minutes"
                name="focus_minutes"
                value={focusMinutes}
                onChange={(e) => setFocusMinutes(Number(e.target.value))}
                className="flex h-11 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm"
              >
                {FOCUS_LENGTHS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="break_minutes" className="text-xs text-muted-foreground">
                Break length (minutes)
              </Label>
              <select
                id="break_minutes"
                name="break_minutes"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                disabled={!breaksEnabled}
                className="flex h-11 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {BREAK_LENGTHS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="breaks_enabled"
              checked={breaksEnabled}
              onChange={(e) => setBreaksEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Clock className="h-4 w-4 text-muted-foreground" />
            Allow break sessions after each focus block
          </label>
        </section>

        <section className="space-y-2">
          <Label htmlFor="max_participants" className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Max participants
          </Label>
          <Input
            id="max_participants"
            name="max_participants"
            type="number"
            defaultValue={50}
            min={2}
            max={100}
            className="h-11 rounded-xl border-border/60 bg-background/60"
          />
        </section>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/40 bg-background/30 px-3 py-3 text-sm">
          <input
            type="checkbox"
            name="is_public"
            defaultChecked
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Make this room public
        </label>

        {state.error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <div className="flex justify-center pt-1">
          <Button
            type="submit"
            size="lg"
            disabled={pending || isAnimatingDescription}
            className="h-12 min-w-[11rem] rounded-xl px-8 text-base font-semibold shadow-md shadow-primary/20"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Room"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
