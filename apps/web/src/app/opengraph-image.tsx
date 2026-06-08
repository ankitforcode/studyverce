import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata";

export const alt = `${SITE_NAME} — Virtual study rooms with Pomodoro timers`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 45%, #064e3b 100%)",
          color: "#f8fafc",
          padding: "72px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#052e16",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            SV
          </div>
          <span style={{ fontSize: 34, fontWeight: 700 }}>{SITE_NAME}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Virtual study rooms for focused sessions
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: "#cbd5e1" }}>{SITE_DESCRIPTION}</div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 22, color: "#86efac" }}>
          <span>Pomodoro timer</span>
          <span>•</span>
          <span>Study together online</span>
          <span>•</span>
          <span>Lo-fi music</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
