import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chatterly - Modern Random Video Chat",
  description: "Connect instantly for secure, adorable video chats worldwide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-gradient-to-br from-purple-600 via-pink-500 to-red-400 min-h-screen relative"
      >
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Glassmorphism animated background */}
          <div className="w-full h-full bg-white/30 backdrop-blur-lg animate-fadeIn" />
        </div>
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
