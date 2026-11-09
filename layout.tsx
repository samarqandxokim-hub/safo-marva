import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafaFlow — Telegram e’lonlar boshqaruvi",
  description: "Telegram kanal va guruhlaringiz uchun e’lonlarni reja asosida boshqaring.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body className="antialiased">{children}</body>
    </html>
  );
}
