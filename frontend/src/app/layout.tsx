import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chatterly - Random Video Chat with Strangers Worldwide",
  description: "Connect instantly with strangers worldwide through secure, anonymous video chat. Meet new people, make friends, and have fun conversations. Free and safe random video chat platform.",
  keywords: ["video chat", "random chat", "meet strangers", "online chat", "webcam chat", "video call", "social networking"],
  authors: [{ name: "Chatterly Team" }],
  creator: "Chatterly",
  publisher: "Chatterly",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chatterly.com",
    siteName: "Chatterly",
    title: "Chatterly - Random Video Chat with Strangers",
    description: "Connect instantly with strangers worldwide through secure, anonymous video chat.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Chatterly - Random Video Chat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@chatterly",
    creator: "@chatterly",
    title: "Chatterly - Random Video Chat with Strangers",
    description: "Connect instantly with strangers worldwide through secure, anonymous video chat.",
    images: ["/twitter-image.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
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
