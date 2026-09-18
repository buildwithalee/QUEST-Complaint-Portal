"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function OfficerAuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error("Unable to verify officer account.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id,full_name,email,role,department_id,is_active"
          )
          .eq("auth_user_id", data.user.id)
          .single();

      if (profileError) {
        await supabase.auth.signOut();
        throw profileError;
      }

      if (profile.role !== "department_officer") {
        await supabase.auth.signOut();

        throw new Error(
          "This account is not authorized as a Department Officer."
        );
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();

        throw new Error(
          "This Department Officer account is inactive."
        );
      }

      if (!profile.department_id) {
        await supabase.auth.signOut();

        throw new Error(
          "No QUEST department is assigned to this officer."
        );
      }

      setMessage(
        `Login successful. Welcome ${profile.full_name}.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Officer login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f8fb]">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-14 w-14">
              <Image
                src="/quest-logo.png"
                alt="QUEST Logo"
                fill
                className="object-contain"
              />
            </div>

            <div>
              <h1 className="font-black text-[#006d92]">
                QUEST COMPLAINT PORTAL
              </h1>

              <p className="text-xs text-slate-500">
                Department Officer Access
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-slate-600"
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-87px)] max-w-5xl items-center justify-center px-5 py-12">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">

          <div className="hidden bg-gradient-to-br from-[#003d5b] to-[#007ea7] p-10 text-white lg:block">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <Building2 size={34} />
            </div>

            <h2 className="mt-7 text-3xl font-black">
              Department Officer Portal
            </h2>

            <p className="mt-4 leading-7 text-slate-200">
              Review complaints assigned to your QUEST department,
              manage their progress and update complaint status.
            </p>

            <div className="mt-9 space-y-4 text-sm text-slate-200">
              <p>✓ Department-specific complaints</p>
              <p>✓ Secure officer authentication</p>
              <p>✓ Complaint status management</p>
              <p>✓ Complaint history and workflow</p>
            </div>
          </div>

          <div className="p-7 md:p-10">
            <p className="font-bold uppercase tracking-[0.16em] text-[#007ea7]">
              Authorized Access
            </p>

            <h1 className="mt-3 text-3xl font-black text-[#003d5b]">
              Department Officer Login
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign in using your authorized department officer account.
            </p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                {message}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="mt-7 space-y-5"
            >
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Officer Email
                </label>

                <div className="relative mt-2">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@quest.edu.pk"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Password
                </label>

                <div className="relative mt-2">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007ea7] px-6 py-4 font-black text-white hover:bg-[#00698d] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />
                    Verifying Officer...
                  </>
                ) : (
                  <>
                    <LogIn size={19} />
                    Officer Login
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}