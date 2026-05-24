import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PCB Studio V2 - Professional PCB Design Suite",
  description: "Advanced web-based PCB design, schematic capture, and C++ prototype logic simulator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${firaCode.variable} h-full antialiased light`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#f8fafc] text-zinc-900">{children}</body>
    </html>
  );
}
