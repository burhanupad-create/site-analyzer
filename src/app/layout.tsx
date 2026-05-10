import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import Link from "next/link";
import { Zap } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SiteAnalyzer — Full-Site Performance Reports",
  description:
    "Discover your sitemap, analyze every section with Google PageSpeed Insights, and get actionable recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>
          <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
              <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <Zap className="h-5 w-5 text-primary" />
                SiteAnalyzer
              </Link>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t py-6 text-center text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-medium text-foreground">Google PageSpeed Insights</span>
            {" · "}Ready for GA4 & GSC integration
          </footer>
        </TooltipProvider>
      </body>
    </html>
  );
}
