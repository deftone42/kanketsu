import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AniTime - Anime Watch Timing Calculator",
  description:
    "Find out if it is a good time to start an anime or if you should wait.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-gray-950 text-gray-100 antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
