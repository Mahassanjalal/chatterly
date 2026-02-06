import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "../components/CookieConsent";

export const metadata: Metadata = {
  title: "Chatterly - Connect with the World Through Video",
  description: "Experience seamless video conversations with people worldwide. Chatterly offers secure, high-quality video chat with AI-powered matching, real-time translation, and stunning virtual backgrounds.",
  keywords: ["video chat", "random chat", "meet strangers", "online chat", "webcam chat", "video call", "social networking", "live chat", "anonymous chat"],
  authors: [{ name: "Chatterly Team" }],
  creator: "Chatterly",
  publisher: "Chatterly",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chatterly.com",
    siteName: "Chatterly",
    title: "Chatterly - Connect with the World Through Video",
    description: "Experience seamless video conversations with people worldwide. Secure, high-quality video chat with AI-powered matching.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Chatterly - Video Chat Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@chatterly",
    creator: "@chatterly",
    title: "Chatterly - Connect with the World Through Video",
    description: "Experience seamless video conversations with people worldwide.",
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
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased min-h-screen relative overflow-x-hidden">
        {/* Aurora Background */}
        <div className="aurora-bg" aria-hidden="true" />
        
        {/* Noise Texture Overlay */}
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />
        
        {/* Main Content */}
        <main className="relative z-10 min-h-screen flex flex-col">
          {children}
        </main>
        
        {/* Cookie Consent */}
        <CookieConsent />
      </body>
    </html>
  );
}
