import type { Metadata } from "next";
import "./globals.css";
import { PresenceProvider } from "@/context/PresenceContext";

export const metadata: Metadata = {
  title: "Pharmacy Inventory System",
  description: "Advanced pharmacy inventory management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col">
        <PresenceProvider>
          {children}
        </PresenceProvider>
      </body>
    </html>
  );
}
