import Link from "next/link";
import { BookOpen } from "lucide-react";
import { NavbarInteractive } from "@/components/layout/navbar-interactive";
import { SITE_NAME } from "@/lib/site-metadata";

export function Navbar() {
  return (
    <header
      data-navbar
      className="navbar-fluid relative sticky top-0 z-50 border-b border-transparent transition-[background-color,border-color,box-shadow] duration-300"
    >
      <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-bold text-lg leading-none"
        >
          <BookOpen className="h-6 w-6 shrink-0 text-primary" />
          <span>{SITE_NAME}</span>
        </Link>

        <NavbarInteractive />
      </div>
    </header>
  );
}
