"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  LogIn,
  KeyRound,
  User,
  ShieldCheck,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ViewMode = "loading" | "login" | "setup" | "recover-step1" | "recover-step2";

export default function LoginPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("login");

  // Login form
  const [username, setUsername] = useState("mehedi4894");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Setup form
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [setupSecurityQuestion, setSetupSecurityQuestion] = useState("");
  const [setupSecurityAnswer, setSetupSecurityAnswer] = useState("");
  const [setupShowPassword, setSetupShowPassword] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // Recovery form
  const [recoverUsername, setRecoverUsername] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverShowPassword, setRecoverShowPassword] = useState(false);

  // ── Pre-warm system: warm up serverless function before user interacts ──
  useEffect(() => {
    // Single warm ping with timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    fetch("/api/warm", { cache: "no-store", priority: "low", signal: controller.signal })
      .catch(() => {})
      .finally(() => clearTimeout(timeoutId));
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Show login form immediately — check setup status in background only
    const checkSetup = async () => {
      try {
        const controller = new AbortController();
        const initTimeout = setTimeout(() => controller.abort(), 5000);
        const initRes = await fetch("/api/auth/init", { signal: controller.signal });
        clearTimeout(initTimeout);
        if (!initRes || cancelled) return;
        const initData = await initRes.json();
        if (initData?.needsInit) {
          setViewMode("setup");
        }
      } catch { /* stay on login form */ }
    };
    checkSetup();
    return () => { cancelled = true; };
  }, []);

  // ── Login Handler (with warm-up + retry) ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("ইউজারনেম ও পাসওয়ার্ড দিন");
      return;
    }
    try {
      setLoginLoading(true);

      // Step 1: Quick warm-up with timeout (don't block login)
      try {
        const wc = new AbortController();
        const wt = setTimeout(() => wc.abort(), 5000);
        await Promise.race([
          fetch("/api/warm", { cache: "no-store", signal: wc.signal }),
          new Promise(r => setTimeout(r, 5000)),
        ]).catch(() => {});
        clearTimeout(wt);
      } catch {
        /* warm-up failed, continue anyway */
      }

      // Step 2: Attempt login with up to 2 retries
      let res: Response | null = null;
      let data: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const controller = new AbortController();
          const loginTimeout = setTimeout(() => controller.abort(), 12000);
          res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username.trim(), password: password.trim() }),
            signal: controller.signal,
          });
          clearTimeout(loginTimeout);
          data = await res.json();
          // If server responds (even with error), no need to retry
          break;
        } catch (fetchErr) {
          console.log(`[login] Fetch attempt ${attempt + 1} failed:`, (fetchErr as any)?.message);
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 2000));
          } else {
            throw fetchErr;
          }
        }
      }

      if (!res || !res.ok) {
        toast.error(data?.error || "লগইন ব্যর্থ হয়েছে");
        return;
      }

      toast.success("সফলভাবে লগইন হয়েছে");
      if (data.needsSetup) {
        // Redirect to setup
        router.push("/setup");
      } else {
        // Use full page navigation to ensure cookie is sent with /api/auth/me
        window.location.href = "/";
      }
    } catch {
      toast.error("লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Setup Handler (first time) ──
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !setupUsername.trim() ||
      !setupPassword.trim() ||
      !setupSecurityQuestion.trim() ||
      !setupSecurityAnswer.trim()
    ) {
      toast.error("সব তথ্য দিন");
      return;
    }
    if (setupPassword.length < 4) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }
    try {
      setSetupLoading(true);
      const res = await fetch("/api/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: setupUsername.trim(),
          password: setupPassword.trim(),
          securityQuestion: setupSecurityQuestion.trim(),
          securityAnswer: setupSecurityAnswer.trim(),
        }),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        toast.error("সার্ভার ত্রুটি হয়েছে। আবার চেষ্টা করুন।");
        return;
      }
      if (!res.ok) {
        const debugMsg = data.debug ? ` (${data.debug})` : '';
        toast.error(data.error + debugMsg || "সেটআপ ব্যর্থ হয়েছে");
        return;
      }
      toast.success("এডমিন অ্যাকাউন্ট তৈরি হয়েছে! এখন লগইন করুন");
      setViewMode("login");
      setUsername(setupUsername.trim());
    } catch (err: any) {
      console.error("Setup error:", err?.message || err);
      toast.error("অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSetupLoading(false);
    }
  };

  // ── Recovery Step 1: Get security question ──
  const handleRecoverStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverUsername.trim()) {
      toast.error("ইউজারনেম দিন");
      return;
    }
    try {
      setRecoverLoading(true);
      const res = await fetch(
        `/api/auth/recover-password?username=${encodeURIComponent(recoverUsername.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "ইউজার পাওয়া যায়নি");
        return;
      }
      setSecurityQuestion(data.securityQuestion);
      setViewMode("recover-step2");
    } catch {
      toast.error("তথ্য পেতে সমস্যা হয়েছে");
    } finally {
      setRecoverLoading(false);
    }
  };

  // ── Recovery Step 2: Verify answer & reset ──
  const handleRecoverStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer.trim() || !newPassword.trim()) {
      toast.error("সব তথ্য দিন");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
      return;
    }
    try {
      setRecoverLoading(true);
      const res = await fetch("/api/auth/recover-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recoverUsername.trim(),
          securityAnswer: securityAnswer.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "পাসওয়ার্ড পুনরুদ্ধার ব্যর্থ হয়েছে");
        return;
      }
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন");
      setViewMode("login");
      setUsername(recoverUsername.trim());
      setPassword("");
    } catch {
      toast.error("পাসওয়ার্ড পুনরুদ্ধার করতে সমস্যা হয়েছে");
    } finally {
      setRecoverLoading(false);
    }
  };

  // ── Loading screen ── (kept minimal - actual form shows almost instantly)
  if (viewMode === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <img src="/logo.jpg" alt="লোগো" className="size-16 rounded-2xl shadow-lg shadow-emerald-200 mb-4 mx-auto animate-pulse" />
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="size-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="size-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="size-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-muted-foreground mt-3">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="লোগো" className="size-14 rounded-2xl shadow-lg shadow-emerald-200 mb-4 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">
            আবাসিক ম্যানেজমেন্ট
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            আবাসিক এলাকার সামগ্রিক পরিচালনা ব্যবস্থা
          </p>
        </div>

        {/* ═══ SETUP MODE (first time - no user exists) ═══ */}
        {viewMode === "setup" && (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto size-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                <ShieldCheck className="size-5" />
              </div>
              <CardTitle className="text-lg">প্রথমবার সেটআপ</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-amber-200 bg-amber-50">
                <ShieldCheck className="size-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  সিস্টেমে কোনো অ্যাকাউন্ট নেই। এডমিন অ্যাকাউন্ট তৈরি করুন।
                </AlertDescription>
              </Alert>
              <form onSubmit={handleSetup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>ইউজারনেম *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="ইউজারনেম লিখুন"
                      value={setupUsername}
                      onChange={(e) => setSetupUsername(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>পাসওয়ার্ড *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9 pr-10"
                      type={setupShowPassword ? "text" : "password"}
                      placeholder="পাসওয়ার্ড লিখুন (কমপক্ষে ৪ অক্ষর)"
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setSetupShowPassword(!setupShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {setupShowPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>পাসওয়ার্ড নিশ্চিত করুন *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type={setupShowPassword ? "text" : "password"}
                      placeholder="আবার পাসওয়ার্ড লিখুন"
                      value={setupConfirmPassword}
                      onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    />
                  </div>
                  {setupConfirmPassword && setupPassword !== setupConfirmPassword && (
                    <p className="text-xs text-red-500">পাসওয়ার্ড মিলছে না</p>
                  )}
                </div>
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    পাসওয়ার্ড ভুলে গেলে পুনরুদ্ধারের জন্য নিরাপত্তা প্রশ্ন দিন
                  </p>
                  <div className="space-y-1.5">
                    <Label>নিরাপত্তা প্রশ্ন *</Label>
                    <Input
                      placeholder="যেমন: আপনার জন্মস্থান কোথায়?"
                      value={setupSecurityQuestion}
                      onChange={(e) => setSetupSecurityQuestion(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 mt-2">
                    <Label>উত্তর *</Label>
                    <Input
                      placeholder="নিরাপত্তা প্রশ্নের উত্তর"
                      value={setupSecurityAnswer}
                      onChange={(e) => setSetupSecurityAnswer(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  disabled={setupLoading}
                >
                  {setupLoading ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  অ্যাকাউন্ট তৈরি করুন
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ═══ LOGIN MODE ═══ */}
        {viewMode === "login" && (
          <>
            {/* Contact number - plain text with icon, outside card */}
            <div className="text-center mb-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                <Phone className="size-4" />
                যোগাযোগ - <span className="text-base">01930-338334</span>
              </span>
            </div>
          <Card>
            <CardHeader className="text-center pb-2 pt-6">
              <img src="/mehedi.png" alt="লগইন" className="mx-auto rounded-full mb-2 shadow-lg shadow-emerald-100" style={{ maxHeight: "100px", width: "auto" }} onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; (e.target as HTMLImageElement).style.maxHeight = "80px"; (e.target as HTMLImageElement).style.borderRadius = "16px"; }} />
              <CardTitle className="text-lg">লগইন করুন</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>ইউজারনেম</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="ইউজারনেম লিখুন"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>পাসওয়ার্ড</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9 pr-10"
                      type={showPassword ? "text" : "password"}
                      placeholder="পাসওয়ার্ড লিখুন"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  লগইন
                </Button>
              </form>

              <div className="mt-4 pt-3 border-t text-center">
                <button
                  onClick={() => {
                    setRecoverUsername(username);
                    setSecurityAnswer("");
                    setNewPassword("");
                    setViewMode("recover-step1");
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1.5"
                >
                  <KeyRound className="size-3.5" />
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {/* ═══ RECOVERY STEP 1 ═══ */}
        {viewMode === "recover-step1" && (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto size-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                <KeyRound className="size-5" />
              </div>
              <CardTitle className="text-lg">পাসওয়ার্ড পুনরুদ্ধার</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                আপনার ইউজারনেম দিন, নিরাপত্তা প্রশ্ন দেখানো হবে
              </p>
              <form onSubmit={handleRecoverStep1} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>ইউজারনেম</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="ইউজারনেম লিখুন"
                      value={recoverUsername}
                      onChange={(e) => setRecoverUsername(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  disabled={recoverLoading}
                >
                  {recoverLoading ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowLeft className="size-4" />
                  )}
                  পরবর্তী ধাপ
                </Button>
              </form>
              <div className="mt-4 pt-3 border-t text-center">
                <button
                  onClick={() => { setViewMode("login"); setRecoverUsername(""); }}
                  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="size-3.5" />
                  লগইনে ফিরে যান
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ RECOVERY STEP 2 ═══ */}
        {viewMode === "recover-step2" && (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto size-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                <KeyRound className="size-5" />
              </div>
              <CardTitle className="text-lg">নিরাপত্তা যাচাই</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-600 font-medium mb-1">নিরাপত্তা প্রশ্ন:</p>
                <p className="text-sm font-semibold text-amber-900">{securityQuestion}</p>
              </div>
              <form onSubmit={handleRecoverStep2} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>আপনার উত্তর</Label>
                  <Input placeholder="নিরাপত্তা প্রশ্নের উত্তর লিখুন" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>নতুন পাসওয়ার্ড</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9 pr-10"
                      type={recoverShowPassword ? "text" : "password"}
                      placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setRecoverShowPassword(!recoverShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {recoverShowPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2" disabled={recoverLoading}>
                  {recoverLoading ? (<div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<ShieldCheck className="size-4" />)}
                  পাসওয়ার্ড পরিবর্তন করুন
                </Button>
              </form>
              <div className="mt-4 pt-3 border-t text-center">
                <button onClick={() => { setViewMode("login"); setSecurityAnswer(""); setNewPassword(""); }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
                  <ArrowLeft className="size-3.5" />
                  লগইনে ফিরে যান
                </button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
