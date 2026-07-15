"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Matches", line: "bg-violet-500" },
  { href: "/dashboard/tracker", label: "Tracker", line: "bg-green-500" },
  { href: "/dashboard/settings", label: "Settings", line: "bg-red-500" },
  { href: "/admin", label: "Admin", line: "bg-orange-500", adminOnly: true },
] as const;

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const links = LINKS.filter((link) => !("adminOnly" in link && link.adminOnly) || isAdmin);

  return (
    <nav className="font-display flex items-center gap-4 text-sm sm:gap-5">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group relative py-1 transition-colors ${
              active ? "font-semibold text-white" : "text-white/55 hover:text-white"
            }`}
          >
            {link.label}
            <span
              className={`absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out ${link.line} ${
                active ? "scale-x-100" : "group-hover:scale-x-100"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
