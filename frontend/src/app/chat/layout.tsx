"use client";

import Header from '../../components/Header';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../../utils/auth';
import LoadingSpinner from '../../components/LoadingSpinner';

function ChatContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950" suppressHydrationWarning>
      <Header />
      <Suspense fallback={<LoadingSpinner />}>
        <ChatContent>{children}</ChatContent>
      </Suspense>
    </div>
  );
}
