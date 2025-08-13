"use client";

import AuthForm from "../../components/AuthForm";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex items-center justify-center min-h-screen">
      <AuthForm type="login" onSubmit={handleLogin} loading={loading} error={error} />
    </div>
  );
}
