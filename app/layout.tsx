import type { Metadata } from "next";
import { authClient } from "@/lib/auth/client";
import {
  NeonAuthUIProvider,
  UserButton,
} from "@neondatabase/neon-js/auth/react/ui";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Sprite Manager",
  description: "Manage your Sprites with ease",
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
        <NeonAuthUIProvider
          authClient={authClient}
          emailOTP
          social={{ providers: ["github"] }}
        >
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
