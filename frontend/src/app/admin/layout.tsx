"use client";

import Header from '../../components/Header';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, isModerator } from '../../utils/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin() && !isModerator()) {
      router.push('/');
    }
  }, [router]);

  if (!isAdmin() && !isModerator()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
