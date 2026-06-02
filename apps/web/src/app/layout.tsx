import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { ConditionalNavbar } from "@/components/layout/conditional-navbar";
import { PostHogProvider } from "@/lib/analytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyVerce — Discord for Studying",
  description: "Virtual study rooms, shared Pomodoro timers, and real-time accountability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <PostHogProvider>
          <ConditionalNavbar>
            <Navbar />
          </ConditionalNavbar>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
