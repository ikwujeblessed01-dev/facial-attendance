"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, LayoutDashboard, UserCheck, ShieldAlert } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Admin Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      activeColor: "text-blue-500 dark:text-blue-400 border-blue-500",
    },
    {
      name: "Student Portal",
      href: "/student",
      icon: UserCheck,
      activeColor: "text-emerald-500 dark:text-emerald-400 border-emerald-500",
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/80 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <Camera className="h-5 w-5 animate-pulse" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 blur opacity-40 group-hover:opacity-75 transition-opacity duration-300 -z-10"></div>
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              FaceCheck<span className="text-blue-600 dark:text-blue-400 font-extrabold">.</span>
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex space-x-1 sm:space-x-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-zinc-100/80 dark:bg-zinc-900/80 text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                    isActive
                      ? pathname.startsWith("/admin")
                        ? "text-blue-500"
                        : "text-emerald-500"
                      : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                  }`}
                />
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Role Indicator / Actions */}
        <div className="flex items-center gap-2">
          {pathname?.startsWith("/admin") ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              Lecturer Mode
            </span>
          ) : pathname?.startsWith("/student") ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-700/10 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Terminal Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-400/15">
              Secure Auth
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
