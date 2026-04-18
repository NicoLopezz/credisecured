import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import PageTransition from "@/components/PageTransition";
import CommandPalette from "@/components/CommandPalette";
import CommandPaletteTrigger from "@/components/CommandPaletteTrigger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Licitaciones-X | Marketplace de Factoring",
  description: "Plataforma de marketplace de factoring e invoices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <Sidebar />
        <CommandPalette />
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <CommandPaletteTrigger />
          <ThemeToggle />
        </div>
        <main className="ml-[80px] min-h-screen p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </body>
    </html>
  );
}
