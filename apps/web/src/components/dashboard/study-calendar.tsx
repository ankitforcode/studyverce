"use client";

import { subDays, format, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StudyCalendarProps {
  sessionDates: string[];
}

export function StudyCalendar({ sessionDates }: StudyCalendarProps) {
  const days = Array.from({ length: 28 }, (_, i) => subDays(new Date(), 27 - i));

  function hasSession(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return sessionDates.includes(dateStr);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground pb-1">
              {d}
            </div>
          ))}
          {days.map((day) => (
            <div
              key={day.toISOString()}
              title={format(day, "MMM d, yyyy")}
              className={cn(
                "aspect-square rounded-md flex items-center justify-center text-xs",
                hasSession(day)
                  ? "bg-primary/30 text-primary font-medium"
                  : isSameDay(day, new Date())
                    ? "bg-secondary text-foreground"
                    : "bg-muted/50 text-muted-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-primary/30" /> Study day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-secondary" /> Today
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
