import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = {
  variable: "",
};

const geistMono = {
  variable: "",
};

export const metadata: Metadata = {
  title: "QueueLess",
  description: "Virtual queue management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
