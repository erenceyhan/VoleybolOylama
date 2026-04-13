import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Takim Ismi Oylamasi",
  description:
    "Voleybol takim ismini birlikte belirlemek icin hizli ve mobil uyumlu oylama uygulamasi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} text-[#182127] antialiased`}>
        {children}
      </body>
    </html>
  );
}
