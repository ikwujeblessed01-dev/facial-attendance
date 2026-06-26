"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  LayoutDashboard,
  UserCheck,
  Shield,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      name: "Admin Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      activeColor: "text-blue-500 dark:text-blue-400",
    },
    {
      name: "Student Portal",
      href: "/student",
      icon: UserCheck,
      activeColor: "text-emerald-500 dark:text-emerald-400",
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
            <span className="hidden sm:inline-block text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              FaceCheck<span className="text-blue-600 dark:text-blue-400 font-extrabold">.</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Items */}
        <nav className="hidden md:flex space-x-1 sm:space-x-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
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
                      ? item.activeColor
                      : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Role Indicator / Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {user.displayName || "Lecturer"}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
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

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 animate-slide-up">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isActive ? item.activeColor : "text-zinc-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
          
          {/* Mobile User Profile */}
          {user && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {user.displayName || "Lecturer"}
                  </div>
                  <div className="text-xs text-zinc-500">{user.email}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
