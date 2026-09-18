"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function AdminAuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (!data.session) {
        throw new Error("Unable to create admin session.");
      }

      const response = await fetch(`${API_URL}/admin/me`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const adminData = await response.json();

      if (!response.ok) {
        await supabase.auth.signOut();
        throw new Error(
          adminData.detail || "Admin account required."
        );
      }

      router.replace("/admin-dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to login as admin."
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
                Administration Console
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#007ea7]"
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-87px)] lg:grid-cols-2">
        <div className="hidden bg-gradient-to-br from-[#003d5b] via-[#005b7c] to-[#007ea7] p-12 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="mx-auto max-w-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <ShieldCheck size={34} className="text-cyan-200" />
            </div>

            <p className="mt-8 font-bold uppercase tracking-[0.18em] text-cyan-200">
              Secure Administration
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight">
              University Complaint Management Console
            </h2>

            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-200">
              Review university-wide complaints, oversee departments,
              monitor resolution progress and manage complaint routing
              from one secure administrative workspace.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="font-black">Central Oversight</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Monitor complaints across academic, service and
                  administrative departments.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="font-black">Controlled Access</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Only authorized Admin and Super Admin accounts can
                  access this console.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl md:p-9">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-[#007ea7]">
                <LockKeyhole size={28} />
              </div>

              <p className="mt-6 text-sm font-black uppercase tracking-[0.14em] text-[#007ea7]">
                Admin Access
              </p>

              <h2 className="mt-2 text-3xl font-black text-[#003d5b]">
                Sign in to Admin Console
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use your authorized QUEST Complaint Portal admin account.
              </p>

              {error && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-7 space-y-5">
                <div>
                  <label className="text-sm font-black text-slate-700">
                    Admin Email
                  </label>

                  <div className="relative mt-2">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@quest.edu.pk"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-700">
                    Password
                  </label>

                  <div className="relative mt-2">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007ea7] px-6 py-4 font-black text-white hover:bg-[#00698d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      Verifying Admin...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={19} />
                      Login to Admin Console
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-xs leading-5 text-slate-500">
                  Unauthorized access is restricted. Admin sessions are
                  verified against the QUEST Complaint Portal backend.
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400">
              Academic prototype — Not an official QUEST service.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
