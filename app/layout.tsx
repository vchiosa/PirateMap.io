import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pirate Map",
  description: "Created by vladchiosa",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/piratemaplogo.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
