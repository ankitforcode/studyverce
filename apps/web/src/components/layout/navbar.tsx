import Link from "next/link";
import { BookOpen } from "lucide-react";
import { NavbarInteractive } from "@/components/layout/navbar-interactive";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-bold text-lg leading-none"
        >
          <BookOpen className="h-6 w-6 shrink-0 text-primary" />
          <span>StudyVerce</span>
        </Link>

        <NavbarInteractive />
      </div>
    </header>
  );
}
