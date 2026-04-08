import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans-app",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-marketing",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-app",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VectaHire · AI first-round interviews",
    template: "%s · VectaHire",
  },
  description:
    "Replace manual screening calls with async AI-led voice and video interviews.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} min-h-full font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
