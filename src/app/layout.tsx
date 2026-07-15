import type { Metadata } from "next";
import { Inter, Orbitron, Geist_Mono } from "next/font/google";
import "./globals.css";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Robotic display face for headings/labels — fits an AI agent that hunts
// jobs for you. Kept off body text and form fields (input/select/textarea
// stay Inter) so the app is still legible for non-technical family members.
const display = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unemployment Final Boss",
  description: "The app that roasts you into employment. An AI agent hunts real jobs that fit your resume — you just have to actually apply.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
