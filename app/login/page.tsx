"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // API so'rovisiz, to'g'ridan-to'g'ri parollar bo'yicha yo'naltirish
    if (password === "admin123") {
      router.push("/admin");
    } else if (password === "teacher123") {
      router.push("/teacher");
    } else if (password === "student123") {
      router.push("/student/shop");
    } else {
      setError("Parol noto'g'ri! (admin123, teacher123 yoki student123 kiriting)");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-2 text-emerald-400">CRM Markaz</h1>
        <p className="text-zinc-400 text-center text-sm mb-6">Tizimga kirish uchun parolingizni kiriting</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Ismingiz (Username)</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masalan: Ali"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Parol</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123 / teacher123 / student123"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl transition-all duration-200 mt-2 shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            Tizimga Kirish
          </button>
        </form>
      </div>
    </div>
  );
}