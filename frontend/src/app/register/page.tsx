"use client";

import AuthForm from "../../components/AuthForm";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../utils/auth";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (data: { 
    email: string; 
    password: string; 
    name?: string; 
    gender?: 'male' | 'female' | 'other'; 
    userType?: 'free' | 'pro';
    dateOfBirth?: string;
  }) => {
    setLoading(true);
    setError("");
    try {
      if (!data.name || !data.dateOfBirth) {
        throw new Error("Name and Date of Birth are required");
      }
      await register(data.name, data.email, data.password, data.dateOfBirth, data.gender, data.userType);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <AuthForm type="register" onSubmit={handleRegister} loading={loading} error={error} />
    </div>
  );
}
