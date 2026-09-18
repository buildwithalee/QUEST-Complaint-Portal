"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileImage,
  FileText,
  FileText as FileTextIcon,
  Loader2,
  LogOut,
  Paperclip,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API_URL = "http://127.0.0.1:8000";

type Complaint = {
  id: string;
  complaint_number: string;
  student_name: string;
  roll_number: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  confidential: boolean;
  submitted_at: string;
  resolved_at: string | null;

  ai_analyzed: boolean;
  ai_summary: string | null;
  ai_category: string | null;
  ai_priority: string | null;
  ai_urgency: string | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  ai_recommended_department_id: string | null;
  ai_sla_hours: number | null;
  ai_analyzed_at: string | null;
};

type Officer = {
  full_name: string;
  email: string;
  department_id: string;
};

type UpdateResponse = {
  success?: boolean;
  message?: string;
  complaint_number?: string;
  old_status?: string;
  new_status?: string;
  detail?: string;
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

function formatDate(date: string) {
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

function getNextStatus(status: string) {
  if (status === "submitted") return "verified";
  if (status === "verified" || status === "assigned") return "in_progress";
  if (status === "in_progress") return "resolved";
  return null;
}

function getActionLabel(status: string) {
  if (status === "submitted") return "Verify Complaint";
  if (status === "verified" || status === "assigned") return "Start Progress";
  if (status === "in_progress") return "Resolve Complaint";
  return "No Further Action";
}

export default function OfficerDashboardPage() {
  const router = useRouter();

  const [officer, setOfficer] = useState<Officer | null>(null);
  const [departmentName, setDepartmentName] =
    useState("Loading department...");

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] =
    useState<Complaint | null>(null);

  const [remarks, setRemarks] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");

  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [downloadingId, setDownloadingId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/officer-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/department-complaints`,
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
        throw new Error(
          data.detail ||
            "Unable to load department complaints."
        );
      }

      setOfficer(data.officer);
      setComplaints(data.complaints || []);

      if (data.officer?.department_id) {
        const { data: departmentData } = await supabase
          .from("departments")
          .select("name")
          .eq("id", data.officer.department_id)
          .single();

        if (departmentData) {
          setDepartmentName(departmentData.name);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load officer dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const submitted = complaints.filter(
      (item) => item.status === "submitted"
    ).length;

    const inProgress = complaints.filter(
      (item) =>
        item.status === "in_progress" ||
        item.status === "assigned" ||
        item.status === "verified"
    ).length;

    const urgent = complaints.filter(
      (item) =>
        item.priority === "high" ||
        item.priority === "critical"
    ).length;

    return {
      total: complaints.length,
      submitted,
      inProgress,
      urgent,
    };
  }, [complaints]);

  const loadOfficerEvidence = async (
    complaintNumber: string
  ) => {
    setEvidence([]);
    setEvidenceError("");
    setEvidenceLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/officer-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/department-complaints/${encodeURIComponent(
          complaintNumber
        )}/evidence`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
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

  const openManage = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setRemarks("");
    setUpdateError("");
    setUpdateMessage("");
    setEvidence([]);
    setEvidenceError("");

    await loadOfficerEvidence(
      complaint.complaint_number
    );
  };

  const closeManage = () => {
    if (updatingStatus) return;

    setSelectedComplaint(null);
    setRemarks("");
    setUpdateError("");
    setUpdateMessage("");
    setEvidence([]);
    setEvidenceError("");
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

  const updateComplaintStatus = async () => {
    if (!selectedComplaint) return;

    const nextStatus = getNextStatus(
      selectedComplaint.status
    );

    if (!nextStatus) {
      setUpdateError(
        "This complaint has no further department status action."
      );
      return;
    }

    if (!remarks.trim()) {
      setUpdateError(
        "Please enter remarks before updating the complaint status."
      );
      return;
    }

    setUpdatingStatus(true);
    setUpdateError("");
    setUpdateMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/officer-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/department-complaints/${encodeURIComponent(
          selectedComplaint.complaint_number
        )}/status`,
        {
          method: "PATCH",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            status: nextStatus,
            remarks: remarks.trim(),
          }),
        }
      );

      const data: UpdateResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Complaint status could not be updated."
        );
      }

      setUpdateMessage(
        data.message ||
          "Complaint status updated successfully."
      );

      const updatedComplaint = {
        ...selectedComplaint,
        status: nextStatus,
        resolved_at:
          nextStatus === "resolved"
            ? new Date().toISOString()
            : selectedComplaint.resolved_at,
      };

      setSelectedComplaint(updatedComplaint);

      setComplaints((current) =>
        current.map((item) =>
          item.id === updatedComplaint.id
            ? updatedComplaint
            : item
        )
      );

      setRemarks("");

      await loadDashboard();
    } catch (err) {
      setUpdateError(
        err instanceof Error
          ? err.message
          : "Unable to update complaint status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();

    router.replace("/officer-auth");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <div className="text-center">
          <Loader2
            size={42}
            className="mx-auto animate-spin text-[#007ea7]"
          />

          <p className="mt-4 font-bold text-slate-600">
            Loading Department Dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb] px-5">
        <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-black text-red-700">
            Unable to load dashboard
          </h1>

          <p className="mt-3 text-slate-600">
            {error}
          </p>

          <Link
            href="/officer-auth"
            className="mt-6 inline-block rounded-xl bg-[#007ea7] px-6 py-3 font-bold text-white"
          >
            Officer Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb]">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
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
                Department Officer Dashboard
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <section className="bg-gradient-to-r from-[#003d5b] to-[#007ea7] text-white">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <p className="font-bold uppercase tracking-[0.16em] text-cyan-200">
            Department Complaint Management
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Welcome, {officer?.full_name}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-slate-200">
            <Building2 size={18} />
            {departmentName}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <FileTextIcon size={28} className="text-[#007ea7]" />
            <p className="mt-5 text-sm font-bold text-slate-500">
              Total Assigned
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.total}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Clock3 size={28} className="text-amber-500" />
            <p className="mt-5 text-sm font-bold text-slate-500">
              Newly Submitted
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.submitted}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <ShieldCheck size={28} className="text-emerald-600" />
            <p className="mt-5 text-sm font-bold text-slate-500">
              In Progress
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.inProgress}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <AlertTriangle size={28} className="text-red-500" />
            <p className="mt-5 text-sm font-bold text-slate-500">
              High / Critical
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.urgent}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div>
            <p className="font-bold uppercase tracking-[0.14em] text-[#007ea7]">
              Assigned Complaints
            </p>

            <h3 className="mt-2 text-2xl font-black text-[#003d5b]">
              Department Complaint Queue
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Only complaints assigned to {departmentName} are shown here.
            </p>
          </div>

          {complaints.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="font-bold text-slate-600">
                No complaints are currently assigned to this department.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-cyan-300 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-black uppercase tracking-wide text-[#007ea7]">
                          {complaint.complaint_number}
                        </p>

                        {complaint.confidential && (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
                            Confidential
                          </span>
                        )}
                      </div>

                      <h4 className="mt-2 text-lg font-black text-[#003d5b]">
                        {complaint.title}
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {complaint.description}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
                      {formatStatus(complaint.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Student
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {complaint.student_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Roll Number
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {complaint.roll_number}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Category
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {complaint.category}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Priority
                      </p>
                      <p className="mt-1 text-sm font-bold capitalize text-slate-700">
                        {complaint.priority}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Submitted
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {formatDate(complaint.submitted_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void openManage(complaint)}
                      className="rounded-xl bg-[#007ea7] px-5 py-2.5 text-sm font-black text-white hover:bg-[#00698d]"
                    >
                      Manage Complaint
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#007ea7]">
                  {selectedComplaint.complaint_number}
                </p>

                <h3 className="mt-2 text-2xl font-black text-[#003d5b]">
                  Manage Complaint
                </h3>
              </div>

              <button
                type="button"
                onClick={closeManage}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <h4 className="text-lg font-black text-slate-800">
                {selectedComplaint.title}
              </h4>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {selectedComplaint.description}
              </p>

              <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Student
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {selectedComplaint.student_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Roll Number
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {selectedComplaint.roll_number}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Current Status
                  </p>
                  <p className="mt-1 font-black text-[#007ea7]">
                    {formatStatus(selectedComplaint.status)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Priority
                  </p>
                  <p className="mt-1 font-bold capitalize text-slate-700">
                    {selectedComplaint.priority}
                  </p>
                </div>
              </div>

              {/* AI Advisory Analysis */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50">
                <div className="flex flex-col gap-3 border-b border-violet-100 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                      <Sparkles size={21} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-[#003d5b]">
                          AI Complaint Analysis
                        </h4>

                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
                          Advisory
                        </span>
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        AI-assisted triage for officer review. Official
                        workflow values remain controlled by QUEST routing
                        rules.
                      </p>
                    </div>
                  </div>

                  {selectedComplaint.ai_analyzed &&
                    selectedComplaint.ai_confidence !== null && (
                      <span className="w-fit rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-black text-violet-700">
                        Confidence:{" "}
                        {Math.round(
                          Math.max(
                            0,
                            Math.min(
                              1,
                              Number(selectedComplaint.ai_confidence) || 0
                            )
                          ) * 100
                        )}
                        %
                      </span>
                    )}
                </div>

                {selectedComplaint.ai_analyzed ? (
                  <div className="p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-violet-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          AI Category
                        </p>
                        <p className="mt-1 font-black text-[#003d5b]">
                          {selectedComplaint.ai_category || "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-violet-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          AI Priority
                        </p>
                        <p className="mt-1 font-black capitalize text-[#003d5b]">
                          {selectedComplaint.ai_priority || "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-violet-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Urgency
                        </p>
                        <p className="mt-1 font-black capitalize text-[#003d5b]">
                          {selectedComplaint.ai_urgency || "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-violet-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          AI SLA
                        </p>
                        <p className="mt-1 font-black text-[#003d5b]">
                          {selectedComplaint.ai_sla_hours
                            ? `${selectedComplaint.ai_sla_hours} Hours`
                            : "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                      <p className="text-xs font-bold uppercase text-[#007ea7]">
                        AI Summary
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {selectedComplaint.ai_summary ||
                          "No AI summary recorded."}
                      </p>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">
                        AI Reasoning
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {selectedComplaint.ai_reason ||
                          "No AI reasoning recorded."}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Official Priority
                        </p>
                        <p className="mt-1 font-black capitalize text-slate-700">
                          {selectedComplaint.priority}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          AI Suggested Priority
                        </p>
                        <p className="mt-1 font-black capitalize text-slate-700">
                          {selectedComplaint.ai_priority || "Not available"}
                        </p>
                      </div>
                    </div>

                    {selectedComplaint.ai_recommended_department_id && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          AI Recommended Department
                        </p>
                        <p className="mt-1 font-black text-slate-700">
                          {selectedComplaint.ai_recommended_department_id ===
                          officer?.department_id
                            ? departmentName
                            : "Another department was suggested by AI"}
                        </p>
                      </div>
                    )}

                    {selectedComplaint.ai_analyzed_at && (
                      <p className="mt-4 text-xs font-semibold text-slate-400">
                        AI analyzed:{" "}
                        {formatDate(selectedComplaint.ai_analyzed_at)}
                      </p>
                    )}

                    {selectedComplaint.ai_priority &&
                      selectedComplaint.ai_priority !==
                        selectedComplaint.priority && (
                        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <AlertTriangle
                            size={18}
                            className="mt-0.5 shrink-0 text-amber-600"
                          />
                          <div>
                            <p className="text-sm font-black text-amber-800">
                              AI priority differs from official priority
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                              AI suggested{" "}
                              <strong className="capitalize">
                                {selectedComplaint.ai_priority}
                              </strong>
                              , while QUEST routing assigned{" "}
                              <strong className="capitalize">
                                {selectedComplaint.priority}
                              </strong>
                              . Follow the official workflow value.
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="rounded-xl border border-dashed border-violet-200 bg-white/70 p-6 text-center">
                      <Sparkles
                        size={25}
                        className="mx-auto text-violet-300"
                      />
                      <p className="mt-3 font-black text-slate-700">
                        No AI analysis recorded
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        This complaint was submitted without AI analysis.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence */}
              <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-[#007ea7]">
                      <Paperclip size={17} />
                      Supporting Evidence
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Secure files attached by the student.
                    </p>
                  </div>

                  {!evidenceLoading && (
                    <span className="w-fit rounded-xl bg-cyan-50 px-3 py-2 text-xs font-black text-[#007ea7]">
                      {evidence.length}{" "}
                      {evidence.length === 1 ? "File" : "Files"}
                    </span>
                  )}
                </div>

                {evidenceLoading ? (
                  <div className="mt-5 flex items-center justify-center rounded-xl bg-slate-50 p-7">
                    <Loader2
                      size={22}
                      className="animate-spin text-[#007ea7]"
                    />
                    <span className="ml-3 text-sm font-bold text-slate-600">
                      Loading evidence...
                    </span>
                  </div>
                ) : evidenceError ? (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {evidenceError}
                  </div>
                ) : evidence.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
                    <Paperclip
                      size={28}
                      className="mx-auto text-slate-400"
                    />
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      No supporting evidence attached.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {evidence.map((file) => (
                      <div
                        key={file.id}
                        className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#007ea7]">
                            {file.file_type?.startsWith("image/") ? (
                              <FileImage size={22} />
                            ) : (
                              <FileText size={22} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800">
                              {file.file_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getFileTypeLabel(file.file_type)}
                              {" • "}
                              {formatFileSize(file.file_size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          {file.signed_url ? (
                            <>
                              <a
                                href={file.signed_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-[#007ea7] hover:bg-cyan-100"
                              >
                                <Eye size={16} />
                                View
                              </a>

                              <button
                                type="button"
                                disabled={downloadingId === file.id}
                                onClick={() =>
                                  void downloadEvidence(file)
                                }
                                className="flex items-center gap-2 rounded-xl bg-[#007ea7] px-3 py-2 text-xs font-black text-white hover:bg-[#00698d] disabled:opacity-60"
                              >
                                {downloadingId === file.id ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Download size={16} />
                                )}
                                Download
                              </button>
                            </>
                          ) : (
                            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                              Link unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {updateError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {updateError}
                </div>
              )}

              {updateMessage && (
                <div className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                  <CheckCircle2 size={20} className="shrink-0" />
                  {updateMessage}
                </div>
              )}

              {getNextStatus(selectedComplaint.status) ? (
                <>
                  <div className="mt-6">
                    <label className="text-sm font-black text-slate-700">
                      Officer Remarks *
                    </label>

                    <textarea
                      rows={4}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Write a clear update for the student and complaint history..."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>

                  <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Next Workflow Status
                    </p>

                    <p className="mt-1 font-black text-[#006d92]">
                      {formatStatus(
                        getNextStatus(
                          selectedComplaint.status
                        ) || ""
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={updateComplaintStatus}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#007ea7] px-6 py-4 font-black text-white hover:bg-[#00698d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingStatus ? (
                      <>
                        <Loader2
                          size={19}
                          className="animate-spin"
                        />
                        Updating Status...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={19} />
                        {getActionLabel(
                          selectedComplaint.status
                        )}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <CheckCircle2
                    size={32}
                    className="mx-auto text-emerald-600"
                  />

                  <p className="mt-3 font-black text-emerald-700">
                    Complaint workflow completed
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    Current status:{" "}
                    {formatStatus(
                      selectedComplaint.status
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
