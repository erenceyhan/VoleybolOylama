import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Voleybol Takim Islemleri",
  description:
    "Voleybol takim islemleri icin isim oylama, rotasyon, antrenman plani, video ve uye yonetimini tek yerde toplayan panel.",
  metadataBase: new URL("https://erenceyhan.github.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Voleybol Takim Islemleri",
    description:
      "Voleybol takim islemleri icin isim oylama, rotasyon, antrenman plani, video ve uye yonetimini tek yerde toplayan panel.",
    url: "https://erenceyhan.github.io",
    siteName: "Voleybol Takim Islemleri",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Voleybol Takim Islemleri",
    description:
      "Voleybol takim islemleri icin isim oylama, rotasyon, antrenman plani, video ve uye yonetimini tek yerde toplayan panel.",
  },
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
