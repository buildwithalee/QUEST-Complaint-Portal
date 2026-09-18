"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
type ComplaintStatus =
  | "submitted"
  | "verified"
  | "in_progress"
  | "resolved"
  | "escalated"
  | "rejected"
  | "closed";

type Priority = "low" | "medium" | "high" | "critical";

type Complaint = {
  id: string;
  complaintNumber: string;
  studentName: string;
  rollNumber: string;
  department: string;
  category: string;
  title: string;
  description: string;
  priority: Priority;
  status: ComplaintStatus;
  submittedAt: string;
  assignedTo: string;
  escalationLevel: number;
  slaDeadline: string | null;
  confidential: boolean;
  aiSummary: string;
};

type Overview = {
  total_complaints: number;
  open_complaints: number;
  resolved_complaints: number;
  resolution_rate: number;
  escalated_complaints: number;
  vc_level_complaints: number;
  high_priority_complaints: number;
  overdue_complaints: number;
};

type DepartmentWorkload = {
  department: string;
  total: number;
  open: number;
  resolved: number;
  escalated: number;
  overdue: number;
};

type DashboardData = {
  success: boolean;
  generated_at?: string;
  overview: Overview;
  department_workload?: DepartmentWorkload[];
};

type AdminProfile = {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
};

const emptyOverview: Overview = {
  total_complaints: 0,
  open_complaints: 0,
  resolved_complaints: 0,
  resolution_rate: 0,
  escalated_complaints: 0,
  vc_level_complaints: 0,
  high_priority_complaints: 0,
  overdue_complaints: 0,
};

function normalizeStatus(value: unknown): ComplaintStatus {
  const status = String(value || "submitted").toLowerCase();

  if (
    status === "submitted" ||
    status === "verified" ||
    status === "in_progress" ||
    status === "resolved" ||
    status === "escalated" ||
    status === "rejected" ||
    status === "closed"
  ) {
    return status;
  }

  return "submitted";
}

function normalizePriority(value: unknown): Priority {
  const priority = String(value || "medium").toLowerCase();

  if (
    priority === "low" ||
    priority === "medium" ||
    priority === "high" ||
    priority === "critical"
  ) {
    return priority;
  }

  return "medium";
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: ComplaintStatus) {
  const labels: Record<ComplaintStatus, string> = {
    submitted: "Submitted",
    verified: "Verified",
    in_progress: "In Progress",
    resolved: "Resolved",
    escalated: "Escalated",
    rejected: "Rejected",
    closed: "Closed",
  };

  return labels[status];
}

function statusClass(status: ComplaintStatus) {
  const classes: Record<ComplaintStatus, string> = {
    submitted: "bg-sky-50 text-sky-700 border-sky-200",
    verified: "bg-cyan-50 text-cyan-700 border-cyan-200",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    escalated: "bg-red-50 text-red-700 border-red-200",
    rejected: "bg-slate-100 text-slate-600 border-slate-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return classes[status];
}

function priorityClass(priority: Priority) {
  const classes: Record<Priority, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-orange-50 text-orange-700",
    critical: "bg-red-50 text-red-700",
  };

  return classes[priority];
}

function mapComplaint(item: any): Complaint {
  return {
    id: String(item?.id ?? item?.complaint_number ?? ""),

    complaintNumber: String(
      item?.complaint_number ??
        item?.complaintNumber ??
        item?.reference_number ??
        item?.id ??
        "N/A"
    ),

    studentName: String(
      item?.student_name ??
        item?.student_full_name ??
        item?.full_name ??
        item?.student?.full_name ??
        "Student"
    ),

    rollNumber: String(
      item?.roll_number ??
        item?.student_roll_number ??
        item?.student?.roll_number ??
        "N/A"
    ),

    department: String(
      item?.assigned_department_name ??
        item?.department_name ??
        item?.student_department_name ??
        item?.assigned_department_id ??
        "Unassigned"
    ),

    category: String(
      item?.category_name ??
        item?.category ??
        item?.complaint_category ??
        "General"
    ),

    title: String(item?.title ?? item?.subject ?? "Untitled Complaint"),

    description: String(item?.description ?? ""),

    priority: normalizePriority(
      item?.priority ?? item?.ai_priority ?? "medium"
    ),

    status: normalizeStatus(item?.status),

    submittedAt: String(
      item?.submitted_at ?? item?.created_at ?? ""
    ),

    assignedTo: String(
      item?.assigned_to_name ??
        item?.assigned_to ??
        item?.assigned_department_name ??
        item?.department_name ??
        "Not Assigned"
    ),

    escalationLevel: Number(item?.escalation_level ?? 0),

    slaDeadline:
      item?.sla_deadline != null ? String(item.sla_deadline) : null,

    confidential: Boolean(
      item?.is_confidential ?? item?.confidential ?? false
    ),

    aiSummary: String(item?.ai_summary ?? ""),
  };
}

export default function VCDashboardPage() {
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedComplaint, setSelectedComplaint] =
    useState<Complaint | null>(null);
  const [complaintDetail, setComplaintDetail] = useState<any>(null);
  const [complaintEscalations, setComplaintEscalations] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState<"acknowledge" | "resolve" | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function apiRequest(path: string, token: string) {
    const response = await fetch(`${API_URL}${path}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          `Request failed (${response.status})`
      );
    }

    return data;
  }

  async function loadDashboard(refresh = false) {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const token = session.access_token;

      const [dashboardData, complaintData, adminData] =
        await Promise.all([
          apiRequest("/vc/dashboard", token),
          apiRequest("/vc/complaints", token),
          apiRequest("/admin/me", token),
        ]);

      setDashboard(dashboardData);
      setAdmin(adminData);

      const rawComplaints = Array.isArray(complaintData)
        ? complaintData
        : complaintData?.complaints ?? [];

      setComplaints(
        Array.isArray(rawComplaints)
          ? rawComplaints.map(mapComplaint)
          : []
      );
    } catch (err) {
      console.error("VC Dashboard Error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load executive dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const overview = dashboard?.overview ?? emptyOverview;

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const text = search.trim().toLowerCase();

      const matchesSearch =
        !text ||
        complaint.complaintNumber.toLowerCase().includes(text) ||
        complaint.studentName.toLowerCase().includes(text) ||
        complaint.rollNumber.toLowerCase().includes(text) ||
        complaint.title.toLowerCase().includes(text) ||
        complaint.department.toLowerCase().includes(text) ||
        complaint.category.toLowerCase().includes(text);

      const matchesStatus =
        statusFilter === "all" || complaint.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        complaint.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [complaints, search, statusFilter, priorityFilter]);

  const recentEscalations = useMemo(() => {
    return complaints
      .filter(
        (complaint) =>
          complaint.status === "escalated" ||
          complaint.escalationLevel > 0
      )
      .slice(0, 5);
  }, [complaints]);

  async function openComplaintDetail(complaint: Complaint) {
    try {
      setSelectedComplaint(complaint);
      setComplaintDetail(null);
      setComplaintEscalations([]);
      setDetailError("");
      setActionRemarks("");
      setActionMessage("");
      setActionError("");
      setActionLoading(null);
      setDetailLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const token = session.access_token;

      const [detailData, escalationData] = await Promise.all([
        apiRequest(
          `/admin/complaints/${encodeURIComponent(
            complaint.complaintNumber
          )}`,
          token
        ),
        apiRequest("/admin/escalations", token),
      ]);

      setComplaintDetail(detailData);

      const allEscalations = Array.isArray(escalationData?.escalations)
        ? escalationData.escalations
        : [];

      const matchingEscalations = allEscalations.filter(
        (item: any) =>
          String(item?.complaint_number || "").toUpperCase() ===
          complaint.complaintNumber.toUpperCase()
      );

      setComplaintEscalations(matchingEscalations);
    } catch (error) {
      console.error("Complaint detail error:", error);
      setDetailError(
        error instanceof Error
          ? error.message
          : "Unable to load complaint details."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshComplaintAfterAction(complaint: Complaint) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/admin-auth");
      return;
    }

    const token = session.access_token;

    const [detailData, escalationData] = await Promise.all([
      apiRequest(
        `/admin/complaints/${encodeURIComponent(
          complaint.complaintNumber
        )}`,
        token
      ),
      apiRequest("/admin/escalations", token),
    ]);

    setComplaintDetail(detailData);

    const allEscalations = Array.isArray(escalationData?.escalations)
      ? escalationData.escalations
      : [];

    setComplaintEscalations(
      allEscalations.filter(
        (item: any) =>
          String(item?.complaint_number || "").toUpperCase() ===
          complaint.complaintNumber.toUpperCase()
      )
    );

    await loadDashboard(true);
  }

  async function handleEscalationAction(
    escalationId: string,
    action: "acknowledge" | "resolve"
  ) {
    if (!selectedComplaint || actionLoading) return;

    const confirmation =
      action === "resolve"
        ? window.confirm(
            "Resolve this VC-level complaint? This will mark the complaint as resolved, close its active escalations, update the timeline, and notify the student."
          )
        : window.confirm(
            "Acknowledge this VC-level escalation?"
          );

    if (!confirmation) return;

    try {
      setActionLoading(action);
      setActionMessage("");
      setActionError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/admin/escalations/${encodeURIComponent(
          escalationId
        )}/${action}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            remarks: actionRemarks.trim() || null,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Unable to ${action} escalation.`
        );
      }

      setActionMessage(
        data?.message ||
          (action === "resolve"
            ? "Complaint resolved successfully."
            : "Escalation acknowledged successfully.")
      );
      setActionRemarks("");

      await refreshComplaintAfterAction(selectedComplaint);
    } catch (error) {
      console.error("VC escalation action error:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to complete escalation action."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin-auth");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <div className="text-center">
          <img
            src="/quest-logo.png"
            alt="QUEST Logo"
            className="mx-auto h-20 w-20 object-contain"
          />

          <Loader2 className="mx-auto mt-5 h-8 w-8 animate-spin text-[#008eb5]" />

          <p className="mt-3 text-sm font-bold text-[#002b49]">
            Loading Executive Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#002b49]">
      {/* ======================================================
          TOP HEADER
      ====================================================== */}
      <header className="border-t-[5px] border-[#4b332b] bg-white shadow-sm">
        <div className="mx-auto flex min-h-[78px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/quest-logo.png"
              alt="QUEST University Logo"
              className="h-12 w-12 object-contain sm:h-14 sm:w-14"
            />

            <div>
              <h1 className="text-[14px] font-black tracking-wide text-[#006a91] sm:text-[16px]">
                QUEST COMPLAINT PORTAL
              </h1>

              <p className="text-[9px] font-medium text-[#68849a] sm:text-[10px]">
                Executive & Governance Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* NOTIFICATIONS */}
            <div className="relative">
              <button
                onClick={() =>
                  setNotificationOpen((current) => !current)
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6e0e7] bg-white text-[#007fa6] transition hover:bg-cyan-50"
                title="Escalations"
              >
                <Bell className="h-4 w-4" />

                {overview.escalated_complaints > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                    {overview.escalated_complaints}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-2xl border border-[#d6e0e7] bg-white shadow-2xl">
                  <div className="border-b border-[#edf2f5] px-4 py-3">
                    <p className="text-xs font-black text-[#002b49]">
                      Recent Escalations
                    </p>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {recentEscalations.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-400">
                        No escalated complaints.
                      </p>
                    ) : (
                      recentEscalations.map((complaint) => (
                        <button
                          key={complaint.id}
                          onClick={() => {
                            void openComplaintDetail(complaint);
                            setNotificationOpen(false);
                          }}
                          className="block w-full border-b border-[#edf2f5] px-4 py-3 text-left transition hover:bg-[#f8fcfd]"
                        >
                          <p className="text-xs font-black text-[#0083aa]">
                            {complaint.complaintNumber}
                          </p>

                          <p className="mt-1 truncate text-xs font-semibold text-[#002b49]">
                            {complaint.title}
                          </p>

                          <p className="mt-1 text-[9px] font-bold text-red-500">
                            Escalation Level{" "}
                            {complaint.escalationLevel}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* REFRESH */}
            <button
              onClick={() => void loadDashboard(true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-3 text-xs font-black text-[#007fa6] transition hover:bg-cyan-100 disabled:opacity-50 sm:px-4"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* ADMIN DASHBOARD */}
            <button
              onClick={() => router.push("/admin-dashboard")}
              className="flex h-10 items-center gap-2 rounded-xl border border-[#d6e0e7] bg-white px-3 text-xs font-black text-[#002b49] transition hover:bg-slate-50 sm:px-4"
            >
              <ArrowLeft className="h-4 w-4" />

              <span className="hidden sm:inline">
                Admin Dashboard
              </span>
            </button>

            {/* LOGOUT */}
            <button
              onClick={logout}
              title="Sign Out"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6e0e7] bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================
          HERO
      ====================================================== */}
      <section className="bg-gradient-to-r from-[#005d79] via-[#006f8f] to-[#087b9c] text-white">
        <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                <BarChart3 className="h-4 w-4" />
                University Executive Intelligence
              </div>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Vice Chancellor Executive Dashboard
              </h2>

              <p className="mt-3 max-w-3xl text-xs font-medium leading-6 text-cyan-50 sm:text-sm">
                Monitor university complaints, resolution
                performance, SLA pressure, escalations and
                department workload across QUEST.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="min-w-[170px] rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-[9px] font-black uppercase tracking-wider text-cyan-100">
                  Executive User
                </p>

                <p className="mt-1 max-w-[190px] truncate text-sm font-black">
                  {admin?.full_name || "QUEST Administration"}
                </p>

                <p className="mt-1 max-w-[190px] truncate text-[9px] text-cyan-100">
                  {admin?.email || admin?.role || "Administration"}
                </p>
              </div>

              <div className="min-w-[170px] rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-[9px] font-black uppercase tracking-wider text-cyan-100">
                  Last Generated
                </p>

                <p className="mt-1 text-xs font-black">
                  {formatDate(dashboard?.generated_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          PAGE CONTENT
      ====================================================== */}
      <div className="mx-auto max-w-[1600px] space-y-7 px-5 py-7 sm:px-8">
        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>

            <button
              onClick={() => void loadDashboard(true)}
              className="rounded-lg bg-white px-3 py-2 text-xs font-black shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* MAIN METRICS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Complaints"
            value={overview.total_complaints}
            description="University-wide complaints"
            icon={<FileText className="h-5 w-5" />}
            iconClass="bg-cyan-50 text-[#008eb5]"
          />

          <StatCard
            label="Open Complaints"
            value={overview.open_complaints}
            description="Currently requiring action"
            icon={<Clock3 className="h-5 w-5" />}
            iconClass="bg-orange-50 text-orange-500"
          />

          <StatCard
            label="Resolved"
            value={overview.resolved_complaints}
            description={`${Number(
              overview.resolution_rate || 0
            ).toFixed(0)}% resolution rate`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            label="Escalated"
            value={overview.escalated_complaints}
            description="Cases under escalation"
            icon={<AlertTriangle className="h-5 w-5" />}
            iconClass="bg-red-50 text-red-500"
          />
        </section>

        {/* SECOND METRICS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="High Priority"
            value={overview.high_priority_complaints}
            description="High & critical cases"
            icon={<Bell className="h-5 w-5" />}
            iconClass="bg-orange-50 text-orange-600"
          />

          <StatCard
            label="VC Level"
            value={overview.vc_level_complaints}
            description="Escalation level 4+"
            icon={<ShieldCheck className="h-5 w-5" />}
            iconClass="bg-violet-50 text-violet-600"
          />

          <StatCard
            label="Overdue Open"
            value={overview.overdue_complaints}
            description="Beyond SLA deadline"
            icon={<Clock3 className="h-5 w-5" />}
            iconClass="bg-red-50 text-red-500"
          />

          <StatCard
            label="Resolution Rate"
            value={`${Number(
              overview.resolution_rate || 0
            ).toFixed(1)}%`}
            description="Overall performance"
            icon={<BarChart3 className="h-5 w-5" />}
            iconClass="bg-cyan-50 text-[#008eb5]"
          />
        </section>

        {/* PERFORMANCE */}
        <section className="grid gap-5 lg:grid-cols-3">
          <PerformanceCard
            title="Resolution Performance"
            subtitle="Overall complaint resolution"
            percentage={Number(overview.resolution_rate || 0)}
            centerLabel="RESOLUTION"
          />

          <div className="rounded-3xl border border-[#d6e0e7] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-50 p-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-black text-[#002b49]">
                  Escalation Pressure
                </h3>
                <p className="text-[10px] text-slate-500">
                  University escalation overview
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <MetricRow
                label="All Escalated"
                value={overview.escalated_complaints}
                total={Math.max(overview.total_complaints, 1)}
                barClass="bg-red-500"
              />

              <MetricRow
                label="VC Level"
                value={overview.vc_level_complaints}
                total={Math.max(overview.total_complaints, 1)}
                barClass="bg-violet-500"
              />

              <MetricRow
                label="Overdue"
                value={overview.overdue_complaints}
                total={Math.max(overview.total_complaints, 1)}
                barClass="bg-orange-500"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[#d6e0e7] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-cyan-50 p-2 text-[#008eb5]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-black text-[#002b49]">
                  Executive Overview
                </h3>

                <p className="text-[10px] text-slate-500">
                  Important management indicators
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <SmallMetric
                label="Open"
                value={overview.open_complaints}
              />

              <SmallMetric
                label="Resolved"
                value={overview.resolved_complaints}
              />

              <SmallMetric
                label="High Priority"
                value={overview.high_priority_complaints}
              />

              <SmallMetric
                label="VC Level"
                value={overview.vc_level_complaints}
              />
            </div>
          </div>
        </section>

        {/* DEPARTMENT WORKLOAD */}
        <section className="rounded-3xl border border-[#d6e0e7] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-cyan-50 p-2 text-[#008eb5]">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-black text-[#002b49]">
                Department Workload
              </h3>

              <p className="text-[10px] text-slate-500">
                Complaint activity across university departments
              </p>
            </div>
          </div>

          {dashboard?.department_workload &&
          dashboard.department_workload.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.department_workload.map(
                (department, index) => (
                  <div
                    key={`${department.department}-${index}`}
                    className="rounded-2xl border border-[#e0e8ed] bg-[#fbfdfe] p-5 transition hover:border-cyan-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#008eb5]">
                          Department
                        </p>

                        <h4 className="mt-1 break-words text-sm font-black text-[#002b49]">
                          {department.department}
                        </h4>
                      </div>

                      <span className="rounded-xl bg-cyan-50 px-3 py-2 text-sm font-black text-[#007fa6]">
                        {department.total}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-4 gap-2">
                      <DepartmentMetric
                        label="Open"
                        value={department.open}
                      />

                      <DepartmentMetric
                        label="Resolved"
                        value={department.resolved}
                      />

                      <DepartmentMetric
                        label="Escalated"
                        value={department.escalated}
                      />

                      <DepartmentMetric
                        label="Overdue"
                        value={department.overdue}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              No department workload data available.
            </p>
          )}
        </section>

        {/* COMPLAINT TABLE */}
        <section className="overflow-hidden rounded-3xl border border-[#d6e0e7] bg-white shadow-sm">
          <div className="border-b border-[#e0e8ed] p-6">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-cyan-50 p-2 text-[#008eb5]">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-black text-[#002b49]">
                    Complaint Management
                  </h3>

                  <p className="text-[10px] text-slate-500">
                    Executive view of university complaints
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search complaints..."
                    className="h-10 w-full rounded-xl border border-[#d6e0e7] bg-[#f8fbfc] pl-10 pr-4 text-xs outline-none transition focus:border-[#25bddd] focus:bg-white sm:w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-10 rounded-xl border border-[#d6e0e7] bg-white px-3 text-xs font-bold outline-none focus:border-cyan-400"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="in_progress">
                    In Progress
                  </option>
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                  <option value="rejected">Rejected</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value)
                  }
                  className="h-10 rounded-xl border border-[#d6e0e7] bg-white px-3 text-xs font-bold outline-none focus:border-cyan-400"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-[#f7fafc]">
                <tr className="text-[9px] font-black uppercase tracking-wider text-[#6b8496]">
                  <th className="px-6 py-4">Complaint</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4 text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#edf2f5]">
                {filteredComplaints.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="transition hover:bg-[#f8fcfd]"
                  >
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-[#0083aa]">
                        {complaint.complaintNumber}
                      </p>

                      <p className="mt-1 max-w-[240px] truncate text-xs font-bold text-[#002b49]">
                        {complaint.title}
                      </p>

                      <p className="mt-1 text-[9px] text-slate-400">
                        {complaint.category}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-xs font-bold">
                        {complaint.studentName}
                      </p>

                      <p className="mt-1 text-[9px] text-slate-400">
                        {complaint.rollNumber}
                      </p>
                    </td>

                    <td className="max-w-[190px] px-6 py-4 text-xs font-medium text-slate-600">
                      {complaint.department}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${priorityClass(
                          complaint.priority
                        )}`}
                      >
                        {complaint.priority}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass(
                          complaint.status
                        )}`}
                      >
                        {statusLabel(complaint.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                          complaint.escalationLevel >= 4
                            ? "bg-red-50 text-red-600"
                            : complaint.escalationLevel > 0
                            ? "bg-orange-50 text-orange-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        L{complaint.escalationLevel}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-[9px] font-medium text-slate-500">
                      {formatDate(complaint.submittedAt)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() =>
                          void openComplaintDetail(complaint)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[9px] font-black text-[#007fa6] transition hover:bg-cyan-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredComplaints.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-16 text-center"
                    >
                      <FileText className="mx-auto h-9 w-9 text-slate-300" />

                      <p className="mt-3 text-sm font-bold text-slate-500">
                        No complaints found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Change search or filter criteria.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#edf2f5] bg-[#fbfdfe] px-6 py-4 text-[9px] font-semibold text-slate-500">
            Showing {filteredComplaints.length} of{" "}
            {complaints.length} complaint(s)
          </div>
        </section>
      </div>

      {/* ======================================================
          COMPLAINT MODAL
      ====================================================== */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002b49]/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e0e8ed] bg-white px-6 py-5">
              <div className="flex items-center gap-3">
                <img
                  src="/quest-logo.png"
                  alt="QUEST Logo"
                  className="h-11 w-11 object-contain"
                />

                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#008eb5]">
                    Executive Complaint Review
                  </p>

                  <h3 className="mt-1 text-xl font-black text-[#002b49]">
                    {selectedComplaint.complaintNumber}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {detailLoading && (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5 text-xs font-bold text-[#007fa6]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading complete complaint record...
                </div>
              )}

              {detailError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                  {detailError}
                </div>
              )}

              <div>
                <h4 className="text-xl font-black text-[#002b49]">
                  {complaintDetail?.complaint?.title || selectedComplaint.title}
                </h4>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase ${priorityClass(normalizePriority(complaintDetail?.complaint?.priority || selectedComplaint.priority))}`}>
                    {normalizePriority(complaintDetail?.complaint?.priority || selectedComplaint.priority)} Priority
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[9px] font-black ${statusClass(normalizeStatus(complaintDetail?.complaint?.status || selectedComplaint.status))}`}>
                    {statusLabel(normalizeStatus(complaintDetail?.complaint?.status || selectedComplaint.status))}
                  </span>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-[9px] font-black text-[#007fa6]">
                    Escalation L{selectedComplaint.escalationLevel}
                  </span>
                  {(complaintDetail?.complaint?.confidential ?? selectedComplaint.confidential) && (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-[9px] font-black text-violet-600">
                      Confidential
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailBox label="Student" value={complaintDetail?.complaint?.student_name || selectedComplaint.studentName} />
                <DetailBox label="Roll Number" value={complaintDetail?.complaint?.roll_number || selectedComplaint.rollNumber} />
                <DetailBox label="Student Department" value={complaintDetail?.complaint?.student_department || selectedComplaint.department} />
                <DetailBox label="Category" value={complaintDetail?.complaint?.category || selectedComplaint.category} />
                <DetailBox label="Assigned To" value={complaintDetail?.complaint?.assigned_department || selectedComplaint.assignedTo} />
                <DetailBox label="Submitted" value={formatDate(complaintDetail?.complaint?.submitted_at || selectedComplaint.submittedAt)} />
                <DetailBox label="Resolved At" value={formatDate(complaintDetail?.complaint?.resolved_at)} />
                <DetailBox label="Escalation Level" value={`Level ${selectedComplaint.escalationLevel}`} />
              </div>

              <div>
                <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-[#68849a]">
                  Complaint Description
                </p>
                <div className="rounded-2xl border border-[#e0e8ed] bg-[#f8fbfc] p-4 text-sm leading-7 text-slate-700">
                  {complaintDetail?.complaint?.description || selectedComplaint.description || "No description available."}
                </div>
              </div>

              {(complaintDetail?.complaint?.ai_summary || selectedComplaint.aiSummary) && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-violet-600">
                      Gemini AI Summary
                    </p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-sm leading-7 text-slate-700">
                    {complaintDetail?.complaint?.ai_summary || selectedComplaint.aiSummary}
                  </div>
                </div>
              )}

              {complaintDetail?.complaint?.ai_analyzed && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailBox label="AI Category" value={String(complaintDetail.complaint.ai_category || "N/A")} />
                  <DetailBox label="AI Priority" value={String(complaintDetail.complaint.ai_priority || "N/A")} />
                  <DetailBox label="AI Urgency" value={String(complaintDetail.complaint.ai_urgency || "N/A")} />
                </div>
              )}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#68849a]">
                    Evidence
                  </p>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[9px] font-black text-[#007fa6]">
                    {complaintDetail?.evidence?.length || 0} File(s)
                  </span>
                </div>
                {complaintDetail?.evidence?.length ? (
                  <div className="space-y-2">
                    {complaintDetail.evidence.map((file: any) => (
                      <a
                        key={file.id}
                        href={file.signed_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#e0e8ed] bg-[#fbfdfe] p-4 transition hover:border-cyan-300 hover:bg-cyan-50/30"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-[#002b49]">{file.file_name || "Evidence file"}</p>
                          <p className="mt-1 text-[9px] text-slate-500">{file.file_type || "File"} · {formatDate(file.created_at)}</p>
                        </div>
                        <Eye className="h-4 w-4 shrink-0 text-[#008eb5]" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d6e0e7] bg-[#fbfdfe] p-5 text-center text-xs text-slate-400">
                    {detailLoading ? "Checking evidence..." : "No evidence attached."}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#68849a]">
                    Complaint Timeline
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600">
                    {complaintDetail?.history?.length || 0} Update(s)
                  </span>
                </div>
                {complaintDetail?.history?.length ? (
                  <div className="space-y-3">
                    {complaintDetail.history.map((item: any, index: number) => (
                      <div key={item.id || index} className="relative rounded-2xl border border-[#e0e8ed] bg-white p-4 pl-5">
                        <div className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-[#008eb5]" />
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div>
                            <p className="text-xs font-black text-[#002b49]">
                              {item.old_status ? `${String(item.old_status).replaceAll("_", " ")} → ` : ""}
                              {String(item.new_status || "Updated").replaceAll("_", " ")}
                            </p>
                            {item.remarks && <p className="mt-2 text-xs leading-5 text-slate-600">{item.remarks}</p>}
                          </div>
                          <p className="shrink-0 text-[9px] font-semibold text-slate-400">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d6e0e7] bg-[#fbfdfe] p-5 text-center text-xs text-slate-400">
                    {detailLoading ? "Loading timeline..." : "No timeline records available."}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#68849a]">
                      Escalation History
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-black text-orange-600">
                    {complaintEscalations.length} Record(s)
                  </span>
                </div>

                {complaintEscalations.length ? (
                  <div className="space-y-3">
                    {complaintEscalations.map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-orange-100 px-2.5 py-1 text-[9px] font-black text-orange-700">
                              Level {item.escalation_level ?? "N/A"}
                            </span>
                            <span className={`rounded-lg px-2.5 py-1 text-[9px] font-black ${
                              String(item.status || "").toLowerCase() === "resolved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {String(item.status || "Active").replaceAll("_", " ")}
                            </span>
                          </div>

                          <span className="text-[9px] font-semibold text-slate-400">
                            {formatDate(item.escalated_at)}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DetailBox
                            label="Escalated To"
                            value={String(item.escalated_to || "N/A")}
                          />
                          <DetailBox
                            label="Resolved At"
                            value={formatDate(item.resolved_at)}
                          />
                        </div>

                        <div className="mt-3 rounded-xl border border-orange-100 bg-white p-3">
                          <p className="text-[8px] font-black uppercase tracking-wider text-orange-600">
                            Reason
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-700">
                            {item.reason || "No escalation reason recorded."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d6e0e7] bg-[#fbfdfe] p-5 text-center">
                    <ShieldCheck className="mx-auto h-5 w-5 text-slate-300" />
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      {detailLoading
                        ? "Loading escalation history..."
                        : "No escalation history for this complaint."}
                    </p>
                  </div>
                )}
              </div>

              {complaintEscalations.some(
                (item: any) =>
                  Number(item?.escalation_level || 0) >= 4
              ) && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-violet-100 p-2 text-violet-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#002b49]">
                        VC Secretariat Action
                      </p>
                      <p className="mt-1 text-[9px] leading-4 text-slate-500">
                        Actions are available only for Level 4 VC Secretariat escalations.
                      </p>
                    </div>
                  </div>

                  {actionMessage && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                      {actionMessage}
                    </div>
                  )}

                  {actionError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                      {actionError}
                    </div>
                  )}

                  {(() => {
                    const vcEscalation = complaintEscalations.find(
                      (item: any) =>
                        Number(item?.escalation_level || 0) >= 4
                    );

                    if (!vcEscalation) return null;

                    const escalationStatus = String(
                      vcEscalation.status || ""
                    ).toLowerCase();

                    const isResolved =
                      escalationStatus === "resolved" ||
                      normalizeStatus(
                        complaintDetail?.complaint?.status ||
                          selectedComplaint.status
                      ) === "resolved";

                    return (
                      <>
                        <div className="mt-4">
                          <label className="mb-2 block text-[8px] font-black uppercase tracking-wider text-[#68849a]">
                            Remarks (Optional)
                          </label>
                          <textarea
                            value={actionRemarks}
                            onChange={(event) =>
                              setActionRemarks(event.target.value)
                            }
                            disabled={isResolved || actionLoading !== null}
                            rows={3}
                            placeholder="Add executive remarks..."
                            className="w-full resize-none rounded-xl border border-[#d6e0e7] bg-white px-3 py-3 text-xs text-slate-700 outline-none transition focus:border-violet-400 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </div>

                        {isResolved ? (
                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            This VC-level complaint has been resolved.
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {escalationStatus === "active" && (
                              <button
                                onClick={() =>
                                  void handleEscalationAction(
                                    String(vcEscalation.id),
                                    "acknowledge"
                                  )
                                }
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-[10px] font-black text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoading === "acknowledge" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4" />
                                )}
                                Acknowledge
                              </button>
                            )}

                            {(escalationStatus === "active" ||
                              escalationStatus === "acknowledged") && (
                              <button
                                onClick={() =>
                                  void handleEscalationAction(
                                    String(vcEscalation.id),
                                    "resolve"
                                  )
                                }
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#007b9f] px-4 py-2.5 text-[10px] font-black text-white transition hover:bg-[#006b8b] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoading === "resolve" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Resolve Complaint
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="border-t border-[#e0e8ed] bg-[#fbfdfe] px-6 py-4 text-right">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="rounded-xl bg-[#007b9f] px-6 py-2.5 text-xs font-black text-white transition hover:bg-[#006b8b]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function StatCard({
  label,
  value,
  description,
  icon,
  iconClass,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="min-h-[135px] rounded-3xl border border-[#d6e0e7] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-[9px] font-bold uppercase tracking-wide text-[#718b9d]">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-[#002b49]">
        {value}
      </p>

      <p className="mt-1 text-[9px] font-semibold text-[#008eb5]">
        {description}
      </p>
    </div>
  );
}

function PerformanceCard({
  title,
  subtitle,
  percentage,
  centerLabel,
}: {
  title: string;
  subtitle: string;
  percentage: number;
  centerLabel: string;
}) {
  const safe = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="rounded-3xl border border-[#d6e0e7] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-cyan-50 p-2 text-[#008eb5]">
          <BarChart3 className="h-5 w-5" />
        </div>

        <div>
          <h3 className="font-black text-[#002b49]">
            {title}
          </h3>

          <p className="text-[10px] text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <div
          className="relative flex h-32 w-32 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(
              #008eb5 ${safe * 3.6}deg,
              #e4ebf0 0deg
            )`,
          }}
        >
          <div className="flex h-[102px] w-[102px] flex-col items-center justify-center rounded-full bg-white">
            <p className="text-2xl font-black text-[#002b49]">
              {safe.toFixed(1)}%
            </p>

            <p className="mt-1 text-[8px] font-black text-slate-400">
              {centerLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  total,
  barClass,
}: {
  label: string;
  value: number;
  total: number;
  barClass: string;
}) {
  const percentage = Math.min((value / total) * 100, 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#002b49]">
        <span>{label}</span>

        <span>
          {value} ({Math.round(percentage)}%)
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#edf2f5]">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#edf2f5] bg-[#f7fafc] p-4 text-center">
      <p className="text-2xl font-black text-[#002b49]">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase text-[#718b9d]">
        {label}
      </p>
    </div>
  );
}

function DepartmentMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="text-center">
      <p className="text-lg font-black text-[#002b49]">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase text-[#8298a8]">
        {label}
      </p>
    </div>
  );
}

function DetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e0e8ed] bg-[#fbfdfe] p-4">
      <p className="text-[8px] font-black uppercase tracking-wider text-[#7890a1]">
        {label}
      </p>

      <p className="mt-2 break-words text-xs font-bold text-[#002b49]">
        {value || "N/A"}
      </p>
    </div>
  );
}