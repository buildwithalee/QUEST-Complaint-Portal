"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Department = {
  id: string;
  name: string;
  department_type: string;
  is_active: boolean;
};

export default function StudentAuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");

  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [semester, setSemester] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "signup") return;

    const loadDepartments = async () => {
      setLoadingDepartments(true);

      try {
        const response = await fetch(`${API_URL}/departments`, {
          cache: "no-store",
        });

        const data = await response.json();

        const academic = (data.departments || []).filter(
          (department: Department) =>
            department.department_type === "academic" &&
            department.is_active === true
        );

        setDepartments(academic);
      } catch {
        setError("Unable to load QUEST departments.");
      } finally {
        setLoadingDepartments(false);
      }
    };

    void loadDepartments();
  }, [mode]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              roll_number: rollNumber.trim().toUpperCase(),
              phone: phone.trim(),
              department_id: departmentId,
              semester,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Student account created successfully.");
          router.push("/student-dashboard");
          router.refresh();
        } else {
          setMessage(
            "Student account created. Please verify your email before signing in."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

       router.push("/student-dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed."
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
                Raise • Track • Resolve
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

      <section className="mx-auto flex max-w-6xl items-center justify-center px-5 py-12">
        <div className="grid w-full overflow-hidden rounded-3xl border bg-white shadow-xl lg:grid-cols-2">

          <div className="hidden bg-gradient-to-br from-[#003d5b] to-[#007ea7] p-10 text-white lg:block">
            <Image
              src="/quest-logo.png"
              alt="QUEST"
              width={100}
              height={100}
              className="rounded-full bg-white p-2"
            />

            <h2 className="mt-8 text-3xl font-black">
              Student Complaint Portal
            </h2>

            <p className="mt-4 leading-7 text-slate-200">
              Create your student profile and securely submit and
              track complaints.
            </p>

            <div className="mt-10 space-y-4 text-sm text-slate-200">
              <p>✓ Secure authentication</p>
              <p>✓ Student profile</p>
              <p>✓ Department-based routing</p>
              <p>✓ Complaint tracking</p>
            </div>
          </div>

          <div className="p-7 md:p-10">
            <p className="font-bold uppercase tracking-[0.16em] text-[#007ea7]">
              Student Access
            </p>

            <h1 className="mt-3 text-3xl font-black text-[#003d5b]">
              {mode === "login"
                ? "Welcome Back"
                : "Create Student Account"}
            </h1>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">

              {mode === "signup" && (
                <>
                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Full Name *
                    </label>

                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Roll Number *
                    </label>

                    <input
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. 22BSIT01"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Phone Number
                    </label>

                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03XX XXXXXXX"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Academic Department *
                    </label>

                    <select
                      required
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      disabled={loadingDepartments}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900"
                    >
                      <option value="">
                        {loadingDepartments
                          ? "Loading departments..."
                          : "Select department"}
                      </option>

                      {departments.map((department) => (
                        <option
                          key={department.id}
                          value={department.id}
                        >
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Semester *
                    </label>

                    <select
                      required
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900"
                    >
                      <option value="">Select semester</option>

                      {[1,2,3,4,5,6,7,8].map((item) => (
                        <option key={item} value={item}>
                          Semester {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Email Address *
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
                    className="w-full rounded-xl border border-slate-300 py-3.5 pl-11 pr-4 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Password *
                </label>

                <div className="relative mt-2">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    required
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-3.5 pl-11 pr-4 text-slate-900"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007ea7] px-6 py-4 font-black text-white"
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Please wait...
                  </>
                ) : mode === "login" ? (
                  <>
                    <LogIn size={19} />
                    Student Login
                  </>
                ) : (
                  <>
                    <UserPlus size={19} />
                    Create Student Account
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 border-t pt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setMessage("");
                }}
                className="font-black text-[#007ea7]"
              >
                {mode === "login"
                  ? "Create Student Account"
                  : "Sign In Instead"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}