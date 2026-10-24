import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام إدارة المخزون والمشتريات | مطعم المندي والمأكولات اليمنية",
  description: "برنامج مبسط وعملي لإدارة مخزون المواد الخام والمشتريات والاستهلاك وتصدير تقارير Excel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
