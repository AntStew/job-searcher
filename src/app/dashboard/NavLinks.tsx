"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Matches" },
  { href: "/dashboard/tracker", label: "Tracker" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <nav className="flex items-center gap-4 text-sm sm:gap-5">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group relative py-1 transition-colors ${
              active ? "font-semibold text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {link.label}
            <span
              className={`absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-accent transition-transform duration-300 ease-out ${
                active ? "scale-x-100" : "group-hover:scale-x-100"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
