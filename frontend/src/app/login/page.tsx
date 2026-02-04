"use client";

import AuthForm from "../../components/AuthForm";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "../../utils/auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (data: { email: string; password: string }) => {
    setLoading(true);
    setError("");
    try {
      await login(data.email, data.password);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <AuthForm type="login" onSubmit={handleLogin} loading={loading} error={error} />
      <div className="mt-4">
        <Link href="/forgot-password" className="text-white/80 hover:text-white transition-colors">
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}
