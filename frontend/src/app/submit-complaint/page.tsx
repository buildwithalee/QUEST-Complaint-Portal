"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const API_URL = "http://127.0.0.1:8000";
const API_FALLBACK_URL = "http://localhost:8000";

const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

async function fetchDepartmentsWithFallback() {
  const urls = [API_URL, API_FALLBACK_URL];
  let lastError: unknown = null;

  for (const baseUrl of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${baseUrl}/departments`, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Department API returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to connect to the backend.");
}

const categories = [
  "Academics",
  "Examination",
  "Hostel",
  "Transport",
  "IT Support",
  "Administration",
  "Library",
  "Maintenance",
  "Other",
];

type Department = {
  id: string;
  name: string;
  department_type: string;
  is_active: boolean;
};

type SuccessData = {
  complaint_number: string;
  status: string;
  priority: string;
  category: string;
  assigned_department: string | null;
  sla_hours: number;
};

type AIAnalysis = {
  summary: string;
  category: string;
  priority: string;
  urgency: string;
  confidence: number;
  reason: string;
  recommended_department: string | null;
  recommended_department_id: string | null;
  sla_hours: number | null;
};

export default function SubmitComplaintPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [departmentError, setDepartmentError] = useState("");

  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [semester, setSemester] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [confidential, setConfidential] = useState(false);

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceUploaded, setEvidenceUploaded] = useState<boolean | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    setDepartmentError("");

    try {
      const data = await fetchDepartmentsWithFallback();

      const academicDepartments = (data.departments || []).filter(
        (department: Department) =>
          department.department_type === "academic" &&
          department.is_active === true
      );

      if (academicDepartments.length === 0) {
        throw new Error("No active academic departments were returned.");
      }

      setDepartments(academicDepartments);
    } catch (err) {
      setDepartments([]);
      setDepartmentError(
        err instanceof Error
          ? `Departments could not be loaded: ${err.message}`
          : "Departments could not be loaded."
      );
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    void loadDepartments();

    const params = new URLSearchParams(window.location.search);
    const selectedCategory = params.get("category");

    if (selectedCategory && categories.includes(selectedCategory)) {
      setCategory(selectedCategory);
    }
  }, []);

  const analyzeWithAI = async () => {
    setAiError("");
    setAiAnalysis(null);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) {
      setAiError("Please enter a complaint title before AI analysis.");
      return;
    }

    if (cleanDescription.length < 10) {
      setAiError(
        "Please enter a more detailed complaint description before AI analysis."
      );
      return;
    }

    setAiAnalyzing(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          "Please login to your student account before using AI analysis."
        );
      }

      const response = await fetch(`${API_URL}/ai/analyze-complaint`, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: cleanTitle,
          description: cleanDescription,
        }),
      });

      let data: {
        detail?: string;
        analysis?: AIAnalysis;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "AI complaint analysis could not be completed."
        );
      }

      if (!data.analysis) {
        throw new Error("AI analysis response was incomplete.");
      }

      setAiAnalysis(data.analysis);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Unable to analyze complaint with AI."
      );
    } finally {
      setAiAnalyzing(false);
    }
  };

  const applyAISuggestion = () => {
    if (!aiAnalysis) return;

    if (categories.includes(aiAnalysis.category)) {
      setCategory(aiAnalysis.category);
    }
  };

  const handleEvidenceChange = (file: File | null) => {
    setEvidenceError("");

    if (!file) {
      setEvidenceFile(null);
      return;
    }

    if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
      setEvidenceFile(null);
      setEvidenceError("Only JPG, PNG and PDF files are allowed.");
      return;
    }

    if (file.size > MAX_EVIDENCE_SIZE) {
      setEvidenceFile(null);
      setEvidenceError("Evidence file must not exceed 10 MB.");
      return;
    }

    setEvidenceFile(file);
  };

   const uploadEvidence = async (
    complaintNumber: string,
    file: File
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const formData = new FormData();
    formData.append("file", file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `${API_URL}/complaints/${encodeURIComponent(
          complaintNumber
        )}/evidence`,
        {
          method: "POST",
          mode: "cors",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      let data: { detail?: string } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Evidence upload failed."
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSubmitting(true);
    setError("");
    setEvidenceError("");
    setEvidenceUploaded(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          "Please login to your student account before submitting a complaint."
        );
      }

      const response = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          student_name: studentName,
          roll_number: rollNumber,
          email,
          phone: phone || null,
          student_department_id: departmentId || null,
          semester: semester ? Number(semester) : null,
          category,
          title,
          description,
          confidential,

          // Save the AI advisory snapshot with the complaint.
          // Official category/priority/SLA are still controlled by the
          // normal complaint fields and backend routing rules.
          ai_analyzed: Boolean(aiAnalysis),
          ai_summary: aiAnalysis?.summary || null,
          ai_category: aiAnalysis?.category || null,
          ai_priority: aiAnalysis?.priority || null,
          ai_urgency: aiAnalysis?.urgency || null,
          ai_confidence:
            typeof aiAnalysis?.confidence === "number"
              ? aiAnalysis.confidence
              : null,
          ai_reason: aiAnalysis?.reason || null,
          ai_recommended_department_id:
            aiAnalysis?.recommended_department_id || null,
          ai_sla_hours: aiAnalysis?.sla_hours ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Complaint could not be submitted."
        );
      }

      const complaint: SuccessData = data.complaint;

      if (!complaint?.complaint_number) {
        throw new Error(
          "Complaint was created but the backend did not return a Complaint ID."
        );
      }

      if (evidenceFile) {
        try {
          await uploadEvidence(complaint.complaint_number, evidenceFile);
          setEvidenceUploaded(true);
        } catch (uploadError) {
          setEvidenceUploaded(false);

          if (
            uploadError instanceof DOMException &&
            uploadError.name === "AbortError"
          ) {
            setEvidenceError(
              "Complaint was submitted successfully, but evidence upload timed out."
            );
          } else {
            setEvidenceError(
              uploadError instanceof Error
                ? `Complaint was submitted successfully, but evidence upload failed: ${uploadError.message}`
                : "Complaint was submitted successfully, but evidence upload failed."
            );
          }
        }
      }

      setSuccessData(complaint);

      alert(
        `Complaint submitted successfully!\nComplaint ID: ${complaint.complaint_number}`
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "The submission request timed out. Please check the backend server and verify the complaints table before trying again."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while submitting the complaint."
        );
      }
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <main className="min-h-screen bg-[#f4f8fb]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-5 py-12">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl md:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={42} />
            </div>

            <h1 className="mt-6 text-3xl font-black text-[#003d5b]">
              Complaint Submitted Successfully
            </h1>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
              Your complaint has been registered successfully in the QUEST
              Complaint Portal.
            </p>

            <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
              <p className="text-sm font-semibold text-slate-500">
                Your Complaint ID
              </p>

              <p className="mt-2 text-2xl font-black tracking-wide text-[#007ea7]">
                {successData.complaint_number}
              </p>

              <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 font-bold capitalize text-slate-700">
                    {successData.status}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Priority
                  </p>
                  <p className="mt-1 font-bold capitalize text-slate-700">
                    {successData.priority}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Assigned To
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {successData.assigned_department || "Pending assignment"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Response SLA
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {successData.sla_hours} Hours
                  </p>
                </div>
              </div>
            </div>

            {evidenceUploaded === true && (
              <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-emerald-700">
                <p className="font-black">Supporting evidence uploaded</p>
                <p className="mt-1">
                  Your selected file was securely attached to this complaint.
                </p>
              </div>
            )}

            {evidenceUploaded === false && (
              <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800">
                <p className="font-black">Complaint saved, evidence not uploaded</p>
                <p className="mt-1">
                  {evidenceError ||
                    "The complaint was created successfully, but the evidence file could not be uploaded."}
                </p>
              </div>
            )}

            <p className="mt-5 text-sm text-slate-500">
              Please save your Complaint ID. You will need it to track the
              complaint later.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Home
              </Link>

              <Link
                href="/track-complaint"
                className="rounded-xl bg-[#007ea7] px-6 py-3 font-bold text-white transition hover:bg-[#00698d]"
              >
                Track Complaint
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb]">
      {/* HEADER */}
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
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#007ea7]"
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>
        </div>
      </header>

      {/* TITLE */}
      <section className="bg-gradient-to-r from-[#003d5b] to-[#007ea7] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <p className="font-bold uppercase tracking-[0.18em] text-cyan-200">
            Student Grievance System
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            Submit a Complaint
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-slate-200">
            Provide complete and accurate information so the system can route
            your complaint to the appropriate QUEST department.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_330px]">
        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
            <div className="rounded-xl bg-cyan-50 p-3 text-[#007ea7]">
              <FileText size={24} />
            </div>

            <div>
              <h3 className="text-xl font-black text-[#003d5b]">
                Complaint Details
              </h3>
              <p className="text-sm text-slate-500">
                Fields marked with * are required.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Full Name *
              </label>

              <input
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
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
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Email Address *
              </label>

              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Phone Number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03XX XXXXXXX"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
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
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">
                  {loadingDepartments
                    ? "Loading QUEST departments..."
                    : "Select your department"}
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

              {departmentError && (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p>{departmentError}</p>
                  <button
                    type="button"
                    onClick={() => void loadDepartments()}
                    className="mt-2 font-bold text-[#007ea7] underline"
                  >
                    Retry loading departments
                  </button>
                </div>
              )}

              {!loadingDepartments &&
                !departmentError &&
                departments.length > 0 && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    {departments.length} QUEST academic departments loaded.
                  </p>
                )}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Semester *
              </label>

              <select
                required
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">Select semester</option>

                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <option key={item} value={item}>
                    Semester {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Complaint Category *
              </label>

              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">Select complaint category</option>

                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Complaint Title *
              </label>

              <input
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setAiAnalysis(null);
                  setAiError("");
                }}
                maxLength={120}
                placeholder="Briefly describe the issue"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Detailed Description *
              </label>

              <textarea
                required
                rows={7}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setAiAnalysis(null);
                  setAiError("");
                }}
                placeholder="Explain what happened, where the issue occurred and any other useful details..."
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            {/* AI COMPLAINT ANALYSIS */}
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-cyan-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                      <Sparkles size={22} />
                    </div>

                    <div>
                      <h4 className="font-black text-[#003d5b]">
                        AI Complaint Assistant
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Analyze your complaint to get a suggested category,
                        priority, urgency, routing department and SLA.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void analyzeWithAI()}
                    disabled={aiAnalyzing || submitting}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiAnalyzing ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={17} />
                        Analyze with AI
                      </>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {aiError}
                  </div>
                )}

                {aiAnalysis && (
                  <div className="mt-5 rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
                          AI Analysis Result
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Review the suggestion before submitting.
                        </p>
                      </div>

                      <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-700">
                        Confidence:{" "}
                        {Math.round(
                          Math.max(
                            0,
                            Math.min(1, Number(aiAnalysis.confidence) || 0)
                          ) * 100
                        )}
                        %
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Suggested Category
                        </p>
                        <p className="mt-1 font-black text-[#003d5b]">
                          {aiAnalysis.category}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Suggested Priority
                        </p>
                        <p className="mt-1 font-black capitalize text-[#003d5b]">
                          {aiAnalysis.priority}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Urgency
                        </p>
                        <p className="mt-1 font-black capitalize text-[#003d5b]">
                          {aiAnalysis.urgency}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Recommended Department
                        </p>
                        <p className="mt-1 font-black text-[#003d5b]">
                          {aiAnalysis.recommended_department ||
                            "Routing rule will determine department"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Target SLA
                        </p>
                        <p className="mt-1 font-black text-[#003d5b]">
                          {aiAnalysis.sla_hours
                            ? `${aiAnalysis.sla_hours} Hours`
                            : "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                      <p className="text-xs font-bold uppercase text-[#007ea7]">
                        AI Summary
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {aiAnalysis.summary}
                      </p>
                    </div>

                    {aiAnalysis.reason && (
                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Why AI selected this
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {aiAnalysis.reason}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-slate-500">
                        Applying the suggestion updates the complaint category.
                        Final priority and SLA remain controlled by the portal&apos;s
                        official routing rules when the complaint is submitted.
                      </p>

                      <button
                        type="button"
                        onClick={applyAISuggestion}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#007ea7] px-5 py-3 text-sm font-black text-white transition hover:bg-[#00698d]"
                      >
                        <CheckCircle2 size={17} />
                        Apply AI Suggestion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* REAL EVIDENCE UPLOAD */}
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Supporting Evidence
              </label>

              <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-7">
                <div className="flex flex-col items-center justify-center text-center">
                  <Paperclip size={30} className="text-[#007ea7]" />

                  <span className="mt-3 font-black text-slate-700">
                    Attach Evidence
                  </span>

                  <span className="mt-1 text-xs leading-5 text-slate-500">
                    JPG, PNG or PDF only. Maximum file size: 10 MB.
                  </span>

                  <label
                    htmlFor="evidence-file"
                    className="mt-5 cursor-pointer rounded-xl bg-white px-5 py-3 text-sm font-black text-[#007ea7] shadow-sm ring-1 ring-slate-200 transition hover:bg-cyan-50"
                  >
                    Choose File
                  </label>

                  <input
                    id="evidence-file"
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) =>
                      handleEvidenceChange(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />

                  {evidenceFile && (
                    <div className="mt-5 w-full max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left">
                      <p className="text-sm font-black text-emerald-700">
                        File selected
                      </p>

                      <p className="mt-1 break-all text-sm text-slate-700">
                        {evidenceFile.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {(evidenceFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setEvidenceFile(null);
                          setEvidenceError("");

                          const input = document.getElementById(
                            "evidence-file"
                          ) as HTMLInputElement | null;

                          if (input) input.value = "";
                        }}
                        className="mt-3 text-xs font-black text-red-600 underline"
                      >
                        Remove file
                      </button>
                    </div>
                  )}

                  {evidenceError && (
                    <div className="mt-4 w-full max-w-xl rounded-xl border border-red-200 bg-red-50 p-3 text-left text-sm font-medium text-red-700">
                      {evidenceError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={confidential}
                onChange={(e) => setConfidential(e.target.checked)}
                className="mt-1 h-4 w-4"
              />

              <div>
                <p className="font-bold text-[#005f7f]">
                  Request confidential handling
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Complaint visibility may be restricted to authorized
                  university personnel where appropriate.
                </p>
              </div>
            </label>
          </div>

          <button
            disabled={submitting}
            type="submit"
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#007ea7] px-6 py-4 font-black text-white shadow-lg transition hover:bg-[#00698d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Submitting Complaint...
              </>
            ) : (
              <>
                <Send size={19} />
                Submit Complaint
              </>
            )}
          </button>
        </form>

        {/* SIDEBAR */}
        <aside className="space-y-5">
          <div className="rounded-3xl bg-[#003d5b] p-6 text-white shadow-lg">
            <ShieldCheck size={32} className="text-cyan-300" />

            <h3 className="mt-5 text-xl font-black">
              Your complaint matters.
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-200">
              Every complaint receives a unique tracking ID and is routed
              according to QUEST complaint workflow rules.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Info className="text-[#007ea7]" />

              <h3 className="font-black text-[#003d5b]">
                Before submitting
              </h3>
            </div>

            <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <li>• Provide accurate student information.</li>
              <li>• Select your actual academic department.</li>
              <li>• Choose the relevant complaint category or use AI assistance.</li>
              <li>• Describe the issue clearly before AI analysis.</li>
              <li>• Attach JPG, PNG or PDF evidence if available.</li>
              <li>• Avoid duplicate complaints.</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}