import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Underground Atlas",
  description:
    "Explore contemporary underground music scenes around the world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}