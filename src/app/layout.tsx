import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import KeepAlive from "@/components/keep-alive";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://egbresident.vercel.app"),
  title: "আবাসিক ম্যানেজমেন্ট",
  description: "অফিস আবাসিক এলাকার রুম, ভাড়াটে, মালামাল ও ট্রাবল রিপোর্ট ম্যানেজমেন্ট",
  keywords: ["Z.ai", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "AI development", "React"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "আবাসিক ম্যানেজমেন্ট",
    description: "অফিস আবাসিক এলাকার রুম, ভাড়াটে, মালামাল ও ট্রাবল রিপোর্ট ম্যানেজমেন্ট",
    type: "website",
    images: [{ url: "/logo.jpg", width: 200, height: 200, alt: "আবাসিক ম্যানেজমেন্ট" }],
  },
  twitter: {
    card: "summary",
    title: "আবাসিক ম্যানেজমেন্ট",
    description: "অফিস আবাসিক এলাকার রুম, ভাড়াটে, মালামাল ও ট্রাবল রিপোর্ট ম্যানেজমেন্ট",
    images: [{ url: "/logo.jpg", width: 200, height: 200, alt: "আবাসিক ম্যানেজমেন্ট" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="min-h-screen flex flex-col">
          <Toaster position="top-center" richColors />
          <KeepAlive />
          <main className="flex-1">{children}</main>
          <footer className="border-t pt-6 pb-8 text-center mt-auto">
            <p className="text-sm text-muted-foreground">
              আবাসিক ম্যানেজমেন্ট @২০২৬
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Md. Mehedi Hasan
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Caretaker, EGB PLC.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
