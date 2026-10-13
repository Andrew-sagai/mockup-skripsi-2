import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

const publicSans = Public_Sans({ 
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans"
});

const sourceSerif = Source_Serif_4({ 
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-serif"
});

export const metadata: Metadata = {
  title: "e-Surat Distan - Sistem Informasi Manajemen Persuratan",
  description: "Sistem Informasi Manajemen Persuratan Digital Dinas Pertanian Kabupaten Minahasa Selatan. Kelola surat masuk, disposisi, surat keluar, arsip digital, dan laporan.",
  keywords: "persuratan, dinas pertanian, minahasa selatan, e-surat, disposisi, arsip digital",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${publicSans.variable} ${sourceSerif.variable}`}>
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
