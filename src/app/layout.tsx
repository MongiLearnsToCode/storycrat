import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/convex-provider";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StoryCrat - Structured Storytelling with AI",
  description: "Create complete stories using proven frameworks with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    // Fallback layout for build time when Clerk keys aren't available
    return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        >
          <ConvexClientProvider>
            <header className="border-b p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                 <h1 className="text-xl font-bold">StoryCrat</h1>
                <div>
                  <Link href="/sign-in" className="text-sm hover:underline">
                    Sign In
                  </Link>
                </div>
              </div>
            </header>
            <main className="mb-16">{children}</main>
            <Toaster />
            <Footer />
          </ConvexClientProvider>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        >
          <ConvexClientProvider>
            <header className="border-b p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                 <h1 className="text-xl font-bold">StoryCrat</h1>
                <div>
                  <SignedOut>
                    <Link href="/sign-in" className="text-sm hover:underline">
                      Sign In
                    </Link>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              </div>
            </header>
            <main className="mb-16">{children}</main>
            <Toaster />
            <Footer />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
