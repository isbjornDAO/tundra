import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { QueryProvider } from "@/providers/QueryProvider";
import { PageProvider } from "@/contexts/PageContext";
import { AuthWrapper } from "@/components/AuthWrapper";
import { PrivyAuthGuard } from "@/components/PrivyAuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tundra - Team1 Tournament Platform",
  description: "Global tournament platform for Team1 community events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <Web3Provider>
            <PrivyAuthGuard>
              <PageProvider>
                <AuthWrapper>
                  {children}
                </AuthWrapper>
              </PageProvider>
            </PrivyAuthGuard>
          </Web3Provider>
        </QueryProvider>
      </body>
    </html>
  );
}
