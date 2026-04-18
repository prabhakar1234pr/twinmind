import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TwinMind — Live Suggestions",
  description:
    "Live meeting copilot: transcribes your conversation and surfaces 3 useful suggestions every 30 seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-full">
        <div className="flex h-screen flex-col overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
