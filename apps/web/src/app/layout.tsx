import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Staylo", template: "%s · Staylo" },
  description: "Hotel ERP for Indian hotels — PMS, CRM, finance and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
