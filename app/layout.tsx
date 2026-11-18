import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Feed",
  description: "Your read, watch and listen feed on the topics you pick",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-200 bg-background px-4 py-3 dark:border-zinc-800 [@media(min-height:500px)]:sticky [@media(min-height:500px)]:top-0 [@media(min-height:500px)]:z-10">
          <span className="text-lg font-semibold">Personal Feed</span>
          <nav className="flex gap-4">
            <Link href="/">Feed</Link>
            <Link href="/topics">Topics</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
