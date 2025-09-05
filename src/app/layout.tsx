import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/convex-provider";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StoryGenPro - Structured Storytelling with AI",
  description: "Create complete stories using proven frameworks with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        >
          <ConvexClientProvider>
            <header className="border-b p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <h1 className="text-xl font-bold">StoryGenPro</h1>
                <div>
                  <SignedOut>
                    <SignInButton />
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              </div>
            </header>
            {children}
            <Toaster />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
