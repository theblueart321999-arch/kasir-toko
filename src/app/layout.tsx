import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackofficeShell from "./BackofficeShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kasir Toko",
  description: "Aplikasi kasir alat dan bahan bangunan serta pertanian",
  icons: {
    icon: [{ url: "/icon.svg?v=3", type: "image/svg+xml" }],
    shortcut: ["/icon.svg?v=3"],
    apple: ["/icon.svg?v=3"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><BackofficeShell>{children}</BackofficeShell></body>
    </html>
  );
}
