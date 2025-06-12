import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { KYCProvider } from "@/contexts/kyc-context";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EmaPay Dashboard - Manage your money internationally",
  description: "Manage your international finances with EmaPay Dashboard. Send money, track transactions, and convert currencies.",
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
          className={`${inter.variable} ${jetbrainsMono.variable} antialiased font-inter`}
        >
          <KYCProvider>
            {children}
          </KYCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
