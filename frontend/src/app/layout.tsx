import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAMONEMEDIA Reverse AI - Local Video Reverse Engineering",
  description: "AI video reverse-engineering and editing timeline reconstruction system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-editor-bg text-editor-text antialiased min-h-screen h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
