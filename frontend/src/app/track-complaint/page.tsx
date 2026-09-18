"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileImage,
  FileText,
  Loader2,
  Paperclip,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Complaint = {
  complaint_number: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  assigned_department: string | null;
  submitted_at: string;
  resolved_at: string | null;
};

type HistoryItem = {
  id: string;
  old_status: string | null;
  new_status: string;
  remarks: string | null;
  created_at: string;
};

type TrackResponse = {
  complaint: Complaint;
  history: HistoryItem[];
};

type EvidenceFile = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  signed_url: string | null;
};

type EvidenceResponse = {
  success: boolean;
  complaint_number: string;
  count: number;
  evidence: EvidenceFile[];
};

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string | null) {
  if (!date) return "Pending";

  return new Date(date).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return "Unknown size";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(fileType: string | null) {
  if (!fileType) return "File";
  if (fileType === "application/pdf") return "PDF";
  if (fileType === "image/jpeg") return "JPG";
  if (fileType === "image/png") return "PNG";

  return fileType;
}

export default function TrackComplaintPage() {
  const [complaintId, setComplaintId] = useState("");
  const [result, setResult] = useState<TrackResponse | null>(null);

  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadEvidence = async (
    cleanId: string,
    accessToken: string
  ) => {
    setEvidenceLoading(true);
    setEvidenceError("");
    setEvidence([]);

    try {
      const response = await fetch(
        `${API_URL}/complaints/${encodeURIComponent(
          cleanId
        )}/evidence`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data: EvidenceResponse | { detail?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          "detail" in data && data.detail
            ? data.detail
            : "Unable to load complaint evidence."
        );
      }

      const evidenceData = data as EvidenceResponse;
      setEvidence(evidenceData.evidence || []);
    } catch (err) {
      setEvidenceError(
        err instanceof Error
          ? err.message
          : "Unable to load complaint evidence."
      );
    } finally {
      setEvidenceLoading(false);
    }
  };

  const trackComplaint = async (id: string) => {
    const cleanId = id.trim().toUpperCase();

    if (!cleanId) {
      setError("Please enter your Complaint ID.");
      return;
    }

    setComplaintId(cleanId);
    setLoading(true);
    setError("");
    setResult(null);
    setEvidence([]);
    setEvidenceError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Please login to your student account to track this complaint."
        );
      }

      const response = await fetch(
        `${API_URL}/complaints/${encodeURIComponent(cleanId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Complaint not found.");
      }

      setResult(data);

      await loadEvidence(
        cleanId,
        session.access_token
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to track complaint."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
      void trackComplaint(id);
    }
  }, []);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await trackComplaint(complaintId);
  };

  const downloadEvidence = async (file: EvidenceFile) => {
    if (!file.signed_url) {
      setEvidenceError(
        "Secure download link is not available for this file."
      );
      return;
    }

    setDownloadingId(file.id);
    setEvidenceError("");

    try {
      const response = await fetch(file.signed_url);

      if (!response.ok) {
        throw new Error("Unable to download evidence file.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.file_name || "evidence";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(
        file.signed_url,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f8fb]">
      {/* Header */}
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
            href="/student-dashboard"
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#007ea7]"
          >
            <ArrowLeft size={17} />
            Student Dashboard
          </Link>
        </div>
      </header>

      {/* Title */}
      <section className="bg-gradient-to-r from-[#003d5b] to-[#007ea7] text-white">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <p className="font-bold uppercase tracking-[0.18em] text-cyan-200">
            Complaint Tracking
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            Track Your Complaint
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-slate-200">
            View the current status, assigned department,
            progress history and supporting evidence for your complaint.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        {/* Search */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-cyan-50 p-3 text-[#007ea7]">
              <Search size={27} />
            </div>

            <div>
              <h3 className="text-xl font-black text-[#003d5b]">
                Complaint Status Lookup
              </h3>

              <p className="text-sm text-slate-500">
                Enter the Complaint ID you received after submission.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="mt-7 flex flex-col gap-3 md:flex-row"
          >
            <input
              required
              value={complaintId}
              onChange={(e) => setComplaintId(e.target.value)}
              placeholder="e.g. QCP-2026-000005"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-4 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />

            <button
              disabled={loading}
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#007ea7] px-7 py-4 font-black text-white hover:bg-[#00698d] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Track Status
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <p className="font-bold">Unable to track complaint</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 space-y-7">
            {/* Summary */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 bg-[#003d5b] p-6 text-white md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-cyan-200">
                    Complaint ID
                  </p>

                  <h3 className="mt-1 text-2xl font-black">
                    {result.complaint.complaint_number}
                  </h3>
                </div>

                <span className="w-fit rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-amber-950">
                  {formatStatus(result.complaint.status)}
                </span>
              </div>

              <div className="p-6 md:p-8">
                <h3 className="text-xl font-black text-[#003d5b]">
                  {result.complaint.title}
                </h3>

                <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Category
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {result.complaint.category}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Assigned To
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {result.complaint.assigned_department ||
                        "Pending Assignment"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Priority
                    </p>
                    <p className="mt-1 font-bold capitalize text-slate-700">
                      {result.complaint.priority}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Submitted
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {formatDate(result.complaint.submitted_at)}
                    </p>
                  </div>
                </div>

                {result.complaint.resolved_at && (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-bold uppercase text-emerald-600">
                      Resolved At
                    </p>
                    <p className="mt-1 font-bold text-emerald-800">
                      {formatDate(result.complaint.resolved_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Evidence */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold uppercase tracking-[0.15em] text-[#008bb5]">
                    <Paperclip size={18} />
                    Supporting Evidence
                  </div>

                  <h3 className="mt-2 text-2xl font-black text-[#003d5b]">
                    Attached Files
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Secure evidence attached to this complaint.
                  </p>
                </div>

                {!evidenceLoading && (
                  <div className="w-fit rounded-xl bg-cyan-50 px-4 py-2 text-sm font-black text-[#007ea7]">
                    {evidence.length}{" "}
                    {evidence.length === 1 ? "File" : "Files"}
                  </div>
                )}
              </div>

              {evidenceLoading ? (
                <div className="mt-7 flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10">
                  <Loader2
                    size={25}
                    className="animate-spin text-[#007ea7]"
                  />
                  <span className="ml-3 font-bold text-slate-600">
                    Loading evidence...
                  </span>
                </div>
              ) : evidenceError ? (
                <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  <p className="font-bold">
                    Evidence could not be loaded
                  </p>
                  <p className="mt-1">{evidenceError}</p>
                </div>
              ) : evidence.length === 0 ? (
                <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <Paperclip
                    size={32}
                    className="mx-auto text-slate-400"
                  />
                  <p className="mt-3 font-bold text-slate-600">
                    No supporting evidence was attached to this complaint.
                  </p>
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  {evidence.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col gap-5 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#007ea7]">
                          {file.file_type?.startsWith("image/") ? (
                            <FileImage size={24} />
                          ) : (
                            <FileText size={24} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black text-[#003d5b]">
                            {file.file_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {getFileTypeLabel(file.file_type)}
                            {" • "}
                            {formatFileSize(file.file_size)}
                            {" • "}
                            Added {formatDate(file.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {file.signed_url ? (
                          <>
                            <a
                              href={file.signed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-black text-[#007ea7] hover:bg-cyan-100"
                            >
                              <Eye size={17} />
                              View
                            </a>

                            <button
                              type="button"
                              disabled={downloadingId === file.id}
                              onClick={() => void downloadEvidence(file)}
                              className="flex items-center gap-2 rounded-xl bg-[#007ea7] px-4 py-2.5 text-sm font-black text-white hover:bg-[#00698d] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {downloadingId === file.id ? (
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <Download size={17} />
                              )}
                              Download
                            </button>
                          </>
                        ) : (
                          <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">
                            Secure link unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="font-bold uppercase tracking-[0.15em] text-[#008bb5]">
                Progress History
              </p>

              <h3 className="mt-2 text-2xl font-black text-[#003d5b]">
                Complaint Timeline
              </h3>

              <div className="mt-8">
                {result.history.length === 0 ? (
                  <p className="text-slate-500">
                    No status history available yet.
                  </p>
                ) : (
                  result.history.map((item, index) => {
                    const last =
                      index === result.history.length - 1;

                    return (
                      <div
                        key={item.id}
                        className="relative flex gap-5"
                      >
                        {!last && (
                          <div className="absolute left-[23px] top-12 h-full w-[2px] bg-emerald-300" />
                        )}

                        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          {item.new_status === "resolved" ? (
                            <CheckCircle2 size={21} />
                          ) : item.new_status === "submitted" ? (
                            <FileCheck2 size={21} />
                          ) : (
                            <Clock3 size={21} />
                          )}
                        </div>

                        <div className="pb-9">
                          <h4 className="font-black text-[#003d5b]">
                            {formatStatus(item.new_status)}
                          </h4>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {item.remarks ||
                              "Complaint status updated."}
                          </p>

                          <p className="mt-2 text-xs font-semibold text-slate-400">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Info */}
            <div className="rounded-3xl bg-gradient-to-r from-[#003d5b] to-[#006d92] p-7 text-white">
              <div className="flex items-start gap-4">
                <ShieldCheck
                  size={30}
                  className="shrink-0 text-cyan-300"
                />

                <div>
                  <h3 className="text-xl font-black">
                    Transparent Complaint Processing
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-slate-200">
                    Verification, progress, resolution and complaint
                    history updates are recorded automatically for
                    transparent tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
