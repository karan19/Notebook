import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ConfigureAmplifyClientSide from "@/components/auth/ConfigureAmplify";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
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
  title: "Notebook | Professional Notebook",
  description: "A premium, minimalist, and block-based personal notebook interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConfigureAmplifyClientSide />
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
