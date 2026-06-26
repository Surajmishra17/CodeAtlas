"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  Calendar,
  ChevronDown,
  Home,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  Save,
  Settings,
  Share2,
  UserRound,
  UserRoundCog,
  X,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Info
} from "lucide-react";
import { FaGithub } from "react-icons/fa";

import { createClient } from "@/app/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type SettingsDashboardProps = {
  profile: any;
};

export default function SettingsDashboard({ profile }: SettingsDashboardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  // Form states
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [college, setCollege] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isThemeInitialized, setIsThemeInitialized] = useState(false);

  // Status states
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse initial data
  const initialAbout = React.useMemo(() => {
    if (!profile?.about) return {};
    try {
      const parsed = JSON.parse(profile.about);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (e) {
      return { bio: profile.about };
    }
    return {};
  }, [profile]);

  const remainingChanges = typeof initialAbout.username_changes_remaining === "number"
    ? initialAbout.username_changes_remaining
    : 3;

  // Initialize theme from sessionStorage or system preference on client mount
  useEffect(() => {
    const sessionTheme = sessionStorage.getItem("theme") as "light" | "dark" | null;
    if (sessionTheme) {
      setTheme(sessionTheme);
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(systemTheme);
    }
    setIsThemeInitialized(true);
  }, []);

  // Initialize fields on load
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setCollege(profile.college || "");
      
      setDob(initialAbout.dob || "");
      setAge(initialAbout.age || "");
      setAvatarUrl(initialAbout.avatar_url || "");
      setVisibility(initialAbout.visibility || "public");
    }
  }, [profile, initialAbout]);

  // Dropdown click outside handler
  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#profile-dropdown-container")) {
        setIsProfileDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isProfileDropdownOpen]);

  // Sync theme to document class
  useEffect(() => {
    if (!isThemeInitialized) return;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    sessionStorage.setItem("theme", theme);
  }, [theme, isThemeInitialized]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          first_name: firstName,
          last_name: lastName,
          college,
          about: {
            dob,
            age,
            visibility,
            avatar_url: avatarUrl,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile settings.");
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const publicProfilePath = profile?.username ? `/u/${encodeURIComponent(profile.username)}` : null;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-50 dark:bg-black p-4 md:p-8 font-sans selection:bg-zinc-300 dark:selection:bg-zinc-700">
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[420px] opacity-40 dark:opacity-20">
        <div className="absolute -top-[100px] -left-[10%] w-[120%] h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-300 via-transparent to-transparent dark:from-zinc-800" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1450px] overflow-hidden rounded-[26px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white/55 dark:bg-zinc-900/55 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Component */}
        <aside className={`absolute inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950 transition-transform duration-300 lg:static lg:bg-white/35 lg:dark:bg-zinc-950/30 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 px-5 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-white">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight text-black dark:text-white">CodeAtlas</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Unified coding analytics</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-7 px-4 py-6 text-[15px]">
            <div className="space-y-2">
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  if (publicProfilePath) {
                    router.push(publicProfilePath);
                  } else {
                    router.push("/dashboard");
                  }
                  setIsSidebarOpen(false);
                }}
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  router.push("/dashboard/links");
                  setIsSidebarOpen(false);
                }}
              >
                <UserRoundCog className="h-4 w-4" />
                Manage Links
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  router.push("/calender");
                  setIsSidebarOpen(false);
                }}
              >
                <Calendar className="h-4 w-4" />
                Calender
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  router.push("/");
                  setIsSidebarOpen(false);
                }}
              >
                <Home className="h-4 w-4" />
                Back To Home
              </button>
            </div>
            <Separator className="bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-2">
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  if (publicProfilePath) {
                    router.push(publicProfilePath);
                  } else {
                    router.push("/dashboard");
                  }
                  setIsSidebarOpen(false);
                }}
              >
                <FaGithub className="h-4 w-4" />
                GitHub
              </button>
              <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-500 dark:text-zinc-400">
                <BookOpenText className="h-4 w-4" />
                Documentation
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-zinc-200/80 dark:border-zinc-800/80 p-4">
            <Button
              className="w-full justify-start gap-2 rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-red-500 dark:text-white dark:hover:bg-red-200 active:scale-97"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 bg-white/15 dark:bg-zinc-950/10 flex flex-col">
          {/* Header */}
          <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-2">
                  <Settings className="h-6 w-6 text-zinc-700 dark:text-zinc-350" />
                  Settings
                </h1>
              </div>

              {/* Profile dropdown header */}
              <div className="flex items-center gap-2">
                <div className="relative" id="profile-dropdown-container">
                  <div
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3.5 py-1.5 cursor-pointer transition select-none shadow-sm"
                  >
                    <div className="relative h-7 w-7 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <UserRound className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 max-w-[120px] truncate">
                      {profile?.username || "Developer"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
                  </div>

                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-1.5 shadow-lg z-50 flex flex-col gap-1">
                      <button
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-semibold text-zinc-900 dark:text-zinc-100"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          router.push("/dashboard/links");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition font-medium"
                      >
                        <UserRoundCog className="h-4 w-4" />
                        Manage Links
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          router.push("/dashboard");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition font-medium"
                      >
                        <Share2 className="h-4 w-4" />
                        Profile Card
                      </button>
                      {publicProfilePath && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            window.open(publicProfilePath, "_blank", "noopener,noreferrer");
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition font-medium border-t border-zinc-100 dark:border-zinc-900 pt-2"
                        >
                          <UserRound className="h-4 w-4" />
                          View Public Profile
                        </button>
                      )}
                      <Separator className="my-1 bg-zinc-100 dark:bg-zinc-900" />
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition font-semibold"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">
            
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSaveProfile} className="space-y-6">
                
                {/* 1. Account Settings Card */}
                <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-xl backdrop-blur-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-zinc-950 dark:text-zinc-100">Account Credentials</CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                      Manage your unique handle identifier inside the CodeAtlas web application.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                        Username
                      </label>
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={remainingChanges <= 0}
                          className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-950"
                          placeholder="enter custom username (optional)"
                        />
                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 text-zinc-400" />
                            Used as: codeatlas.com/u/<strong>{username || "your-username"}</strong>
                          </span>
                          <span className={`font-semibold ${remainingChanges <= 0 ? "text-red-500" : "text-violet-600 dark:text-violet-400"}`}>
                            {remainingChanges <= 0 
                              ? "No username changes left" 
                              : `${remainingChanges} changes remaining`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Personal Information Card */}
                <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-zinc-950 dark:text-zinc-100">Personal Details</CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                      Basic information for your developer profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                          placeholder="First Name"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                          placeholder="Last Name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                          Date of Birth
                        </label>
                        <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white scheme-light dark:scheme-dark dark:[&::-webkit-calendar-picker-indicator]:invert"
                      />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                          Age
                        </label>
                        <input
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                          placeholder="Age"
                          min="1"
                          max="150"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                        Institute Name / College
                      </label>
                      <input
                        type="text"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                        placeholder="e.g. Stanford University"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Appearance & Visibility Card */}
                <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-zinc-950 dark:text-zinc-100">Preferences & Appearance</CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                      Configure custom avatar, visual theme, and profile public visibility.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar URL and preview */}
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="flex-1 flex flex-col gap-2 w-full">
                        <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                          Avatar Image URL
                        </label>
                        <input
                          type="text"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                          placeholder="https://example.com/avatar.png"
                        />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Paste a URL of your image (JPG/PNG). Fallback is a user letter/icon.
                        </span>
                      </div>
                      
                      {/* Avatar Preview */}
                      <div className="flex flex-col items-center shrink-0 w-24">
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-1.5">Preview</span>
                        <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center shadow-md">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Avatar Preview"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <UserRound className="h-7 w-7 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-zinc-200 dark:bg-zinc-800" />

                    {/* Theme Toggling */}
                    <div className="flex flex-col gap-2.5">
                      <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                        Interface Theme
                      </label>
                      <div className="grid grid-cols-2 gap-3 max-w-sm">
                        <button
                          type="button"
                          onClick={() => setTheme("light")}
                          className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition ${
                            theme === "light"
                              ? "bg-white border-zinc-300 text-black shadow-md ring-1 ring-zinc-200 font-semibold"
                              : "bg-zinc-50/40 border-zinc-200/50 text-zinc-500 hover:bg-zinc-100/50 dark:bg-transparent dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/30"
                          }`}
                        >
                          <Sun className="h-4 w-4" />
                          Light Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme("dark")}
                          className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition ${
                            theme === "dark"
                              ? "bg-zinc-900 border-zinc-850 text-white shadow-md dark:bg-zinc-900 dark:border-zinc-700 font-semibold"
                              : "bg-zinc-50/40 border-zinc-200/50 text-zinc-500 hover:bg-zinc-100/50 dark:bg-transparent dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/30"
                          }`}
                        >
                          <Moon className="h-4 w-4" />
                          Dark Mode
                        </button>
                      </div>
                    </div>

                    <Separator className="bg-zinc-200 dark:bg-zinc-800" />

                    {/* Visibility Settings */}
                    <div className="flex flex-col gap-2.5">
                      <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                        Profile Visibility
                      </label>
                      <div className="grid grid-cols-2 gap-3 max-w-sm">
                        <button
                          type="button"
                          onClick={() => setVisibility("public")}
                          className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition ${
                            visibility === "public"
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/80 dark:text-emerald-400 shadow-sm font-semibold"
                              : "bg-zinc-50/40 border-zinc-200/50 text-zinc-500 hover:bg-zinc-100/50 dark:bg-transparent dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/30"
                          }`}
                        >
                          <Eye className="h-4 w-4" />
                          Public
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibility("private")}
                          className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition ${
                            visibility === "private"
                              ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/20 dark:border-red-900/80 dark:text-red-400 shadow-sm font-semibold"
                              : "bg-zinc-50/40 border-zinc-200/50 text-zinc-500 hover:bg-zinc-100/50 dark:bg-transparent dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/30"
                          }`}
                        >
                          <EyeOff className="h-4 w-4" />
                          Private
                        </button>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {visibility === "public" 
                          ? "Anyone can view your public profile at codeatlas.com/u/[username]"
                          : "Only you can see your profile dashboard when logged in."}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Error and Success alerts */}
                {error && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-805 dark:text-red-400">
                    {error}
                  </div>
                )}

                {savedSuccess && (
                  <div className="rounded-xl border border-emerald-250 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-sm text-emerald-800 dark:text-emerald-400">
                    Profile configurations saved successfully!
                  </div>
                )}

                {/* Submit action */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                    className="rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="gap-2 rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>

              </form>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
