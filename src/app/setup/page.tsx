"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SetupPage() {
  const router = useRouter();
  const [currentUsername, setCurrentUsername] = useState("");
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error();
      })
      .then((data) => {
        if (!data.needsSetup) {
          // Already set up, redirect to home
          router.push("/");
          return;
        }
        setCurrentUsername(data.user.username);
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !securityQuestion.trim() || !securityAnswer.trim()) {
      toast.error("সব তথ্য দিন");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }
    try {
      setSetupLoading(true);
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUsername,
          newUsername: newUsername.trim(),
          newPassword: newPassword.trim(),
          securityQuestion: securityQuestion.trim(),
          securityAnswer: securityAnswer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "সেটআপ ব্যর্থ হয়েছে");
        return;
      }
      toast.success("সেটআপ সম্পন্ন হয়েছে!");
      router.push("/");
    } catch {
      toast.error("সেটআপ করতে সমস্যা হয়েছে");
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex items-center justify-center">
        <div className="size-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 mb-4">
            <Building2 className="size-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            আবাসিক ম্যানেজমেন্ট
          </h1>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto size-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle className="text-lg">নিরাপত্তা সেটআপ</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <ShieldCheck className="size-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-xs">
                প্রথমবার লগইন। আপনার নিরাপত্তা তথ্য সেট করুন।
                বর্তমান ইউজারনেম: <strong>{currentUsername}</strong>
              </AlertDescription>
            </Alert>
            <form onSubmit={handleSetup} className="space-y-3">
              <div className="space-y-1.5">
                <Label>নতুন ইউজারনেম *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="নতুন ইউজারনেম লিখুন"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>নতুন পাসওয়ার্ড *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9 pr-10"
                    type={showPassword ? "text" : "password"}
                    placeholder="পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
              <div className="space-y-1.5">
                <Label>পাসওয়ার্ড নিশ্চিত করুন *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    type={showPassword ? "text" : "password"}
                    placeholder="আবার পাসওয়ার্ড লিখুন"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
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
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 mt-2">
                  <Label>উত্তর *</Label>
                  <Input
                    placeholder="নিরাপত্তা প্রশ্নের উত্তর"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
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
                সেটআপ সম্পন্ন করুন
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          আবাসিক ম্যানেজমেন্ট &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
