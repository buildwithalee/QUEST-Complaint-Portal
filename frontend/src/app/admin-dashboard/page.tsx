"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileImage,
  FileText,
  Filter,
  History,
  Loader2,
  LogOut,
  Paperclip,
  RefreshCw,
  Route,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Admin = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

type Stats = {
  total: number;
  submitted: number;
  in_progress: number;
  resolved: number;
  escalated: number;
  high_critical: number;
};

type Complaint = {
  id: string;
  complaint_number: string;
  student_name: string;
  roll_number: string;
  category: string;
  title: string;
  priority: string;
  status: string;
  assigned_department: string | null;
  confidential: boolean;
  sla_hours: number | null;
  sla_deadline: string | null;
  escalation_level: number;
  escalation_name: string;
  escalated_at: string | null;
  submitted_at: string;
  resolved_at: string | null;
};

type DashboardResponse = {
  success: boolean;
  admin: Admin;
  stats: Stats;
  complaints: Complaint[];
  detail?: string;
};


type AdminNotification = {
  id: string;
  complaint_id: string | null;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};

type AdminNotificationsResponse = {
  success: boolean;
  unread_count: number;
  notifications: AdminNotification[];
  detail?: string;
};

type Department = {
  id: string;
  name: string;
  department_type: string;
  is_active: boolean;
};

type RoutingRule = {
  id: string;
  category: string;
  routing_mode: string;
  target_department_id: string | null;
  target_department: string | null;
  default_priority: string;
  sla_hours: number;
  is_active: boolean;
};

type RoutingRulesResponse = {
  success: boolean;
  count: number;
  rules: RoutingRule[];
  detail?: string;
};

type SlaEscalationResult = {
  complaint_number: string;
  previous_level: number;
  new_level: number;
  escalated_to: string;
};

type SlaCheckResponse = {
  success: boolean;
  checked_at: string;
  escalated_count: number;
  escalated_complaints: SlaEscalationResult[];
  detail?: string;
};

type EscalationAudit = {
  id: string;
  complaint_id: string;
  complaint_number: string | null;
  title: string | null;
  category: string | null;
  priority: string | null;
  complaint_status: string | null;
  escalation_level: number;
  escalated_to: string;
  reason: string;
  status: string;
  escalated_at: string;
  resolved_at: string | null;
};

type EscalationHistoryResponse = {
  success: boolean;
  total: number;
  escalations: EscalationAudit[];
  detail?: string;
};

type ComplaintDetail = {
  id: string;
  complaint_number: string;
  student_name: string;
  roll_number: string;
  email: string;
  phone: string | null;
  student_department_id: string | null;
  student_department: string | null;
  semester: number | null;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_department_id: string | null;
  assigned_department: string | null;
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

type HistoryItem = {
  id: string;
  old_status: string | null;
  new_status: string;
  remarks: string | null;
  changed_by: string | null;
  created_at: string;
};

type EvidenceFile = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  signed_url: string | null;
};

type DetailResponse = {
  success: boolean;
  complaint: ComplaintDetail;
  history: HistoryItem[];
  evidence: EvidenceFile[];
  detail?: string;
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

function statusBadge(status: string) {
  if (status === "resolved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "in_progress") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "verified" || status === "assigned") {
    return "bg-cyan-100 text-cyan-700";
  }

  if (status === "escalated") {
    return "bg-red-100 text-red-700";
  }

  if (status === "rejected" || status === "closed") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-amber-100 text-amber-700";
}

function priorityBadge(priority: string) {
  if (priority === "critical") {
    return "bg-red-100 text-red-700";
  }

  if (priority === "high") {
    return "bg-orange-100 text-orange-700";
  }

  if (priority === "medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function escalationBadge(level: number) {
  if (level >= 4) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (level === 3) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (level === 2) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-cyan-200 bg-cyan-50 text-cyan-700";
}

function fileTypeLabel(fileType: string | null) {
  if (fileType === "application/pdf") return "PDF";
  if (fileType === "image/jpeg") return "JPG";
  if (fileType === "image/png") return "PNG";
  return fileType || "File";
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    submitted: 0,
    in_progress: 0,
    resolved: 0,
    escalated: 0,
    high_critical: 0,
  });

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState("");
  const [routingSuccess, setRoutingSuccess] = useState("");
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);

  const [slaChecking, setSlaChecking] = useState(false);
  const [slaMessage, setSlaMessage] = useState("");
  const [slaError, setSlaError] = useState("");

  const [escalations, setEscalations] = useState<EscalationAudit[]>([]);
  const [escalationsLoading, setEscalationsLoading] = useState(false);
  const [escalationsError, setEscalationsError] = useState("");

  const [actionEscalation, setActionEscalation] =
    useState<EscalationAudit | null>(null);
  const [actionType, setActionType] =
    useState<"acknowledge" | "resolve" | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [adminNotifications, setAdminNotifications] =
    useState<AdminNotification[]>([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const [selectedDetail, setSelectedDetail] =
    useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [downloadingId, setDownloadingId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/admin-auth");
          return;
        }

        const response = await fetch(`${API_URL}/admin/dashboard`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data: DashboardResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load admin dashboard."
          );
        }

        setAdmin(data.admin);
        setStats(data.stats);
        setComplaints(data.complaints || []);

        await Promise.all([
          loadRoutingRules(session.access_token),
          loadEscalationHistory(session.access_token),
          loadAdminNotifications(session.access_token),
        ]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [router]);

  const loadAdminNotifications = async (accessToken?: string) => {
    setNotificationLoading(true);
    setNotificationError("");

    try {
      let token = accessToken;

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/admin-auth");
          return;
        }

        token = session.access_token;
      }

      const response = await fetch(`${API_URL}/admin/notifications`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data: AdminNotificationsResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load admin notifications."
        );
      }

      setAdminNotifications(data.notifications || []);
      setAdminUnreadCount(data.unread_count || 0);
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Unable to load admin notifications."
      );
    } finally {
      setNotificationLoading(false);
    }
  };

  const markAdminNotificationRead = async (notificationId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/admin/notifications/${encodeURIComponent(
          notificationId
        )}/read`,
        {
          method: "PATCH",
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
          data.detail || "Unable to mark notification as read."
        );
      }

      setAdminNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                is_read: true,
              }
            : item
        )
      );

      setAdminUnreadCount((current) => Math.max(0, current - 1));
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Unable to update notification."
      );
    }
  };

  const markAllAdminNotificationsRead = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/admin/notifications/read-all`,
        {
          method: "PATCH",
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
          data.detail || "Unable to mark notifications as read."
        );
      }

      setAdminNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      );

      setAdminUnreadCount(0);
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Unable to update notifications."
      );
    }
  };

  const loadRoutingRules = async (accessToken?: string) => {
    setRoutingLoading(true);
    setRoutingError("");

    try {
      let token = accessToken;

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/admin-auth");
          return;
        }

        token = session.access_token;
      }

      const [rulesResponse, departmentsResponse] = await Promise.all([
        fetch(`${API_URL}/admin/routing-rules`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/departments`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }),
      ]);

      const rulesData: RoutingRulesResponse =
        await rulesResponse.json();

      const departmentsData = await departmentsResponse.json();

      if (!rulesResponse.ok) {
        throw new Error(
          rulesData.detail || "Unable to load routing rules."
        );
      }

      if (!departmentsResponse.ok) {
        throw new Error(
          departmentsData.detail || "Unable to load departments."
        );
      }

      setRoutingRules(rulesData.rules || []);
      setDepartments(departmentsData.departments || []);
    } catch (err) {
      setRoutingError(
        err instanceof Error
          ? err.message
          : "Unable to load routing management."
      );
    } finally {
      setRoutingLoading(false);
    }
  };

  const updateRoutingRuleField = (
    ruleId: string,
    field: keyof RoutingRule,
    value: string | number | boolean | null
  ) => {
    setRoutingSuccess("");
    setRoutingError("");

    setRoutingRules((current) =>
      current.map((rule) => {
        if (rule.id !== ruleId) return rule;

        if (field === "routing_mode") {
          const mode = String(value);

          return {
            ...rule,
            routing_mode: mode,
            target_department_id:
              mode === "student_department"
                ? null
                : rule.target_department_id,
          };
        }

        return {
          ...rule,
          [field]: value,
        };
      })
    );
  };

  const saveRoutingRule = async (rule: RoutingRule) => {
    setSavingRuleId(rule.id);
    setRoutingError("");
    setRoutingSuccess("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      if (
        rule.routing_mode === "fixed" &&
        !rule.target_department_id
      ) {
        throw new Error(
          `Please select a department for ${rule.category}.`
        );
      }

      if (!rule.sla_hours || rule.sla_hours < 1) {
        throw new Error(
          `SLA hours for ${rule.category} must be greater than 0.`
        );
      }

      const response = await fetch(
        `${API_URL}/admin/routing-rules/${encodeURIComponent(
          rule.id
        )}`,
        {
          method: "PATCH",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            routing_mode: rule.routing_mode,
            target_department_id:
              rule.routing_mode === "fixed"
                ? rule.target_department_id
                : null,
            default_priority: rule.default_priority,
            sla_hours: Number(rule.sla_hours),
            is_active: rule.is_active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Routing rule could not be updated."
        );
      }

      setRoutingRules((current) =>
        current.map((item) =>
          item.id === rule.id
            ? {
                ...item,
                ...data.rule,
              }
            : item
        )
      );

      setRoutingSuccess(
        `${rule.category} routing rule updated successfully.`
      );
    } catch (err) {
      setRoutingError(
        err instanceof Error
          ? err.message
          : "Unable to update routing rule."
      );
    } finally {
      setSavingRuleId(null);
    }
  };

  const loadEscalationHistory = async (accessToken?: string) => {
    setEscalationsLoading(true);
    setEscalationsError("");

    try {
      let token = accessToken;

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/admin-auth");
          return;
        }

        token = session.access_token;
      }

      const response = await fetch(`${API_URL}/admin/escalations`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data: EscalationHistoryResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load escalation audit history."
        );
      }

      setEscalations(data.escalations || []);
    } catch (err) {
      setEscalationsError(
        err instanceof Error
          ? err.message
          : "Unable to load escalation audit history."
      );
    } finally {
      setEscalationsLoading(false);
    }
  };

  const openEscalationAction = (
    item: EscalationAudit,
    type: "acknowledge" | "resolve"
  ) => {
    setActionEscalation(item);
    setActionType(type);
    setActionRemarks("");
    setActionError("");
  };

  const closeEscalationAction = () => {
    if (actionLoading) return;

    setActionEscalation(null);
    setActionType(null);
    setActionRemarks("");
    setActionError("");
  };

  const submitEscalationAction = async () => {
    if (!actionEscalation || !actionType) return;

    setActionLoading(true);
    setActionError("");
    setActionMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/admin/escalations/${encodeURIComponent(
          actionEscalation.id
        )}/${actionType}`,
        {
          method: "PATCH",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            remarks: actionRemarks.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            `Unable to ${actionType} escalation.`
        );
      }

      await loadEscalationHistory(session.access_token);

      const dashboardResponse = await fetch(
        `${API_URL}/admin/dashboard`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const dashboardData: DashboardResponse =
        await dashboardResponse.json();

      if (dashboardResponse.ok) {
        setAdmin(dashboardData.admin);
        setStats(dashboardData.stats);
        setComplaints(dashboardData.complaints || []);
      }

      setActionMessage(
        actionType === "acknowledge"
          ? "Escalation acknowledged successfully."
          : "Escalated complaint resolved successfully."
      );

      setActionEscalation(null);
      setActionType(null);
      setActionRemarks("");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to complete escalation action."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const runSlaCheck = async () => {
    setSlaChecking(true);
    setSlaMessage("");
    setSlaError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/admin/check-sla-escalations`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data: SlaCheckResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to run SLA escalation check."
        );
      }

      const escalationMap = new Map(
        (data.escalated_complaints || []).map((item) => [
          item.complaint_number,
          item,
        ])
      );

      const updatedComplaints = complaints.map((complaint) => {
        const escalation = escalationMap.get(
          complaint.complaint_number
        );

        if (!escalation) {
          return complaint;
        }

        return {
          ...complaint,
          status: "escalated",
          escalation_level: escalation.new_level,
          escalation_name: escalation.escalated_to,
          escalated_at: data.checked_at,
        };
      });

      setComplaints(updatedComplaints);

      setStats({
        total: updatedComplaints.length,
        submitted: updatedComplaints.filter(
          (item) => item.status === "submitted"
        ).length,
        in_progress: updatedComplaints.filter((item) =>
          ["verified", "assigned", "in_progress"].includes(
            item.status
          )
        ).length,
        resolved: updatedComplaints.filter(
          (item) => item.status === "resolved"
        ).length,
        escalated: updatedComplaints.filter(
          (item) => item.status === "escalated"
        ).length,
        high_critical: updatedComplaints.filter((item) =>
          ["high", "critical"].includes(item.priority)
        ).length,
      });

      await loadEscalationHistory(session.access_token);

      if (data.escalated_count > 0) {
        const latest = data.escalated_complaints?.[0];

        setSlaMessage(
          latest
            ? `${data.escalated_count} complaint(s) escalated. ${latest.complaint_number} moved to Level ${latest.new_level} — ${latest.escalated_to}.`
            : `${data.escalated_count} complaint(s) escalated successfully.`
        );
      } else {
        setSlaMessage(
          "SLA check completed. No new overdue complaints required escalation."
        );
      }
    } catch (err) {
      setSlaError(
        err instanceof Error
          ? err.message
          : "Unable to run SLA escalation check."
      );
    } finally {
      setSlaChecking(false);
    }
  };

  const filteredComplaints = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesSearch =
        !cleanSearch ||
        complaint.complaint_number
          .toLowerCase()
          .includes(cleanSearch) ||
        complaint.student_name
          .toLowerCase()
          .includes(cleanSearch) ||
        complaint.roll_number
          .toLowerCase()
          .includes(cleanSearch) ||
        complaint.title
          .toLowerCase()
          .includes(cleanSearch) ||
        complaint.category
          .toLowerCase()
          .includes(cleanSearch) ||
        (complaint.assigned_department || "")
          .toLowerCase()
          .includes(cleanSearch);

      const matchesStatus =
        statusFilter === "all" ||
        complaint.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        complaint.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    complaints,
    searchTerm,
    statusFilter,
    priorityFilter,
  ]);

  const openComplaintDetail = async (
    complaintNumber: string
  ) => {
    setSelectedDetail(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/admin/complaints/${encodeURIComponent(
          complaintNumber
        )}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data: DetailResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load complaint details."
        );
      }

      setSelectedDetail(data);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Unable to load complaint details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedDetail(null);
    setDetailError("");
    setDetailLoading(false);
  };

  const downloadEvidence = async (file: EvidenceFile) => {
    if (!file.signed_url) return;

    setDownloadingId(file.id);

    try {
      const response = await fetch(file.signed_url);

      if (!response.ok) {
        throw new Error("Unable to download evidence.");
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

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin-auth");
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
            Loading Admin Dashboard...
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
            Unable to load Admin Dashboard
          </h1>

          <p className="mt-3 text-slate-600">
            {error}
          </p>

          <button
            onClick={() => router.replace("/admin-auth")}
            className="mt-6 rounded-xl bg-[#007ea7] px-6 py-3 font-black text-white"
          >
            Back to Admin Login
          </button>
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
                Administration Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationOpen((current) => !current);

                  if (!notificationOpen) {
                    void loadAdminNotifications();
                  }
                }}
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                aria-label="Admin notifications"
              >
                <Bell size={20} />

                {adminUnreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
                    {adminUnreadCount > 99 ? "99+" : adminUnreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-14 z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                    <div>
                      <p className="font-black text-[#003d5b]">
                        Admin Notifications
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        {adminUnreadCount} unread
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void loadAdminNotifications()}
                        disabled={notificationLoading}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        title="Refresh notifications"
                      >
                        <RefreshCw
                          size={16}
                          className={
                            notificationLoading ? "animate-spin" : ""
                          }
                        />
                      </button>

                      {adminUnreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            void markAllAdminNotificationsRead()
                          }
                          className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-black text-[#007ea7] hover:bg-cyan-100"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  {notificationError && (
                    <div className="m-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                      {notificationError}
                    </div>
                  )}

                  <div className="max-h-[440px] overflow-y-auto">
                    {notificationLoading &&
                    adminNotifications.length === 0 ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2
                          size={22}
                          className="animate-spin text-[#007ea7]"
                        />
                        <span className="ml-2 text-sm font-bold text-slate-500">
                          Loading notifications...
                        </span>
                      </div>
                    ) : adminNotifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell
                          size={28}
                          className="mx-auto text-slate-300"
                        />
                        <p className="mt-3 text-sm font-bold text-slate-500">
                          No admin notifications yet.
                        </p>
                      </div>
                    ) : (
                      adminNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`border-b border-slate-100 p-4 last:border-b-0 ${
                            notification.is_read
                              ? "bg-white"
                              : "bg-cyan-50/60"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                notification.is_read
                                  ? "bg-slate-300"
                                  : "bg-red-500"
                              }`}
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-[#003d5b]">
                                {notification.title}
                              </p>

                              <p className="mt-1 text-sm leading-5 text-slate-600">
                                {notification.message}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-400">
                                  {formatDate(notification.created_at)}
                                </span>

                                {!notification.is_read && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void markAdminNotificationRead(
                                        notification.id
                                      )
                                    }
                                    className="text-xs font-black text-[#007ea7] hover:underline"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/admin-analytics")}
              className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-black text-[#007ea7] hover:bg-cyan-100"
            >
              <BarChart3 size={17} />
              Analytics
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-r from-[#003d5b] to-[#007ea7] text-white">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <p className="font-bold uppercase tracking-[0.16em] text-cyan-200">
            University-Wide Oversight
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Welcome, {admin?.full_name}
          </h2>

          <p className="mt-2 text-slate-200">
            Monitor complaints, departments, priorities and resolution
            progress across QUEST.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <FileText size={26} className="text-[#007ea7]" />
            <p className="mt-4 text-xs font-bold uppercase text-slate-400">
              Total
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.total}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <Clock3 size={26} className="text-amber-500" />
            <p className="mt-4 text-xs font-bold uppercase text-slate-400">
              Submitted
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.submitted}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <ShieldCheck size={26} className="text-blue-600" />
            <p className="mt-4 text-xs font-bold uppercase text-slate-400">
              In Progress
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.in_progress}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <CheckCircle2 size={26} className="text-emerald-600" />
            <p className="mt-4 text-xs font-bold uppercase text-slate-400">
              Resolved
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.resolved}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <AlertTriangle size={26} className="text-red-500" />
            <p className="mt-4 text-xs font-bold uppercase text-slate-400">
              Escalated
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.escalated}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <AlertTriangle size={26} className="text-orange-500" />
            <p className="mt-4 text-xs font-bold uppercase text-slate-400">
              High / Critical
            </p>
            <p className="mt-1 text-3xl font-black text-[#003d5b]">
              {stats.high_critical}
            </p>
          </div>
        </div>

        {/* SLA MONITORING */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <TimerReset size={24} />
              </div>

              <div>
                <p className="font-bold uppercase tracking-[0.14em] text-red-600">
                  SLA Monitoring
                </p>

                <h3 className="mt-1 text-2xl font-black text-[#003d5b]">
                  Overdue Complaint Check
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Check unresolved complaints against their SLA deadline
                  and escalate overdue cases automatically.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void runSlaCheck()}
              disabled={slaChecking}
              className="flex w-fit items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {slaChecking ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Checking SLA...
                </>
              ) : (
                <>
                  <TimerReset size={18} />
                  Run SLA Check
                </>
              )}
            </button>
          </div>

          {slaError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {slaError}
            </div>
          )}

          {slaMessage && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              <CheckCircle2 size={18} />
              {slaMessage}
            </div>
          )}
        </div>

        {/* ESCALATION AUDIT TRAIL */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
                <History size={24} />
              </div>

              <div>
                <p className="font-bold uppercase tracking-[0.14em] text-orange-600">
                  Escalation Audit
                </p>

                <h3 className="mt-1 text-2xl font-black text-[#003d5b]">
                  Escalation Audit Trail
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Permanent record of complaints escalated through Department,
                  Admin, Higher Administration and Vice Chancellor Secretariat.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-700">
                {escalations.length} Record{escalations.length === 1 ? "" : "s"}
              </span>

              <button
                type="button"
                onClick={() => void loadEscalationHistory()}
                disabled={escalationsLoading}
                className="flex w-fit items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={escalationsLoading ? "animate-spin" : ""}
                />
                Refresh History
              </button>
            </div>
          </div>

          {escalationsError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {escalationsError}
            </div>
          )}

          {actionMessage && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              <CheckCircle2 size={18} />
              {actionMessage}
            </div>
          )}

          {escalationsLoading && escalations.length === 0 ? (
            <div className="mt-7 flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10">
              <Loader2
                size={25}
                className="animate-spin text-orange-600"
              />
              <span className="ml-3 font-bold text-slate-600">
                Loading escalation history...
              </span>
            </div>
          ) : escalations.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="font-black text-slate-700">
                No escalation audit records yet.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                New SLA escalations will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {escalations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-orange-200 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wide text-[#007ea7]">
                          {item.complaint_number || "Unknown Complaint"}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${escalationBadge(
                            item.escalation_level
                          )}`}
                        >
                          Level {item.escalation_level}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                            item.status === "resolved"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "acknowledged"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h4 className="mt-3 text-lg font-black text-[#003d5b]">
                        {item.escalated_to}
                      </h4>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {item.title || "Complaint title unavailable"}
                      </p>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                        {item.reason}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                        {item.category && (
                          <span>
                            Category:{" "}
                            <strong className="text-slate-700">
                              {item.category}
                            </strong>
                          </span>
                        )}

                        {item.priority && (
                          <span>
                            Priority:{" "}
                            <strong className="text-slate-700">
                              {formatStatus(item.priority)}
                            </strong>
                          </span>
                        )}

                        {item.complaint_status && (
                          <span>
                            Complaint Status:{" "}
                            <strong className="text-slate-700">
                              {formatStatus(item.complaint_status)}
                            </strong>
                          </span>
                        )}

                        <span>
                          Escalated:{" "}
                          <strong className="text-slate-700">
                            {formatDate(item.escalated_at)}
                          </strong>
                        </span>

                        {item.resolved_at && (
                          <span>
                            Resolved:{" "}
                            <strong className="text-emerald-700">
                              {formatDate(item.resolved_at)}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.status === "active" && (
                        <button
                          type="button"
                          onClick={() =>
                            openEscalationAction(item, "acknowledge")
                          }
                          className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-100"
                        >
                          <CheckCircle2 size={17} />
                          Acknowledge
                        </button>
                      )}

                      {item.status !== "resolved" && (
                        <button
                          type="button"
                          onClick={() =>
                            openEscalationAction(item, "resolve")
                          }
                          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={17} />
                          Resolve Complaint
                        </button>
                      )}

                      {item.complaint_number && (
                        <button
                          type="button"
                          onClick={() =>
                            void openComplaintDetail(item.complaint_number!)
                          }
                          className="flex items-center gap-2 rounded-xl bg-[#007ea7] px-4 py-2.5 text-sm font-black text-white hover:bg-[#00698d]"
                        >
                          <Eye size={17} />
                          View Complaint
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROUTING MANAGEMENT */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-cyan-50 p-3 text-[#007ea7]">
                <Route size={24} />
              </div>

              <div>
                <p className="font-bold uppercase tracking-[0.14em] text-[#007ea7]">
                  Routing Management
                </p>

                <h3 className="mt-1 text-2xl font-black text-[#003d5b]">
                  Complaint Routing Rules
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Configure where each complaint category is routed,
                  its default priority and the target SLA.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadRoutingRules()}
              disabled={routingLoading}
              className="flex w-fit items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-black text-[#007ea7] hover:bg-cyan-100 disabled:opacity-60"
            >
              <Settings2 size={17} />
              Refresh Rules
            </button>
          </div>

          {routingError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {routingError}
            </div>
          )}

          {routingSuccess && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              <CheckCircle2 size={18} />
              {routingSuccess}
            </div>
          )}

          {routingLoading ? (
            <div className="mt-7 flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10">
              <Loader2
                size={25}
                className="animate-spin text-[#007ea7]"
              />
              <span className="ml-3 font-bold text-slate-600">
                Loading routing rules...
              </span>
            </div>
          ) : routingRules.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="font-bold text-slate-600">
                No routing rules are available.
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {routingRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-[#003d5b]">
                          {rule.category}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          Rule ID: {rule.id}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${
                          rule.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {rule.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[190px_1fr_170px_140px_140px]">
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400">
                          Routing Mode
                        </label>

                        <select
                          value={rule.routing_mode}
                          onChange={(event) =>
                            updateRoutingRuleField(
                              rule.id,
                              "routing_mode",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                        >
                          <option value="fixed">
                            Fixed Department
                          </option>
                          <option value="student_department">
                            Student Department
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400">
                          Target Department
                        </label>

                        {rule.routing_mode === "student_department" ? (
                          <div className="mt-2 flex min-h-[46px] items-center rounded-xl border border-cyan-100 bg-cyan-50 px-4 text-sm font-bold text-[#006d92]">
                            Student&apos;s Academic Department
                          </div>
                        ) : (
                          <select
                            value={rule.target_department_id || ""}
                            onChange={(event) =>
                              updateRoutingRuleField(
                                rule.id,
                                "target_department_id",
                                event.target.value || null
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                          >
                            <option value="">
                              Select Department
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
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400">
                          Default Priority
                        </label>

                        <select
                          value={rule.default_priority}
                          onChange={(event) =>
                            updateRoutingRuleField(
                              rule.id,
                              "default_priority",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">
                            Critical
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400">
                          SLA Hours
                        </label>

                        <input
                          type="number"
                          min={1}
                          value={rule.sla_hours}
                          onChange={(event) =>
                            updateRoutingRuleField(
                              rule.id,
                              "sla_hours",
                              Number(event.target.value)
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400">
                          Rule Status
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            updateRoutingRuleField(
                              rule.id,
                              "is_active",
                              !rule.is_active
                            )
                          }
                          className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm font-black ${
                            rule.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-300 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          void saveRoutingRule(rule)
                        }
                        disabled={savingRuleId === rule.id}
                        className="flex items-center gap-2 rounded-xl bg-[#007ea7] px-5 py-3 text-sm font-black text-white hover:bg-[#00698d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingRuleId === rule.id ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={17} />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Filter size={22} className="text-[#007ea7]" />
            <div>
              <h3 className="font-black text-[#003d5b]">
                Complaint Filters
              </h3>
              <p className="text-sm text-slate-500">
                Search and filter university-wide complaints.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search ID, student, roll no, title, category or department..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
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
              className="rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-bold uppercase tracking-[0.14em] text-[#007ea7]">
                Complaint Register
              </p>

              <h3 className="mt-2 text-2xl font-black text-[#003d5b]">
                University Complaints
              </h3>
            </div>

            <div className="rounded-xl bg-cyan-50 px-4 py-2 text-sm font-black text-[#007ea7]">
              Showing {filteredComplaints.length} of {complaints.length}
            </div>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="font-bold text-slate-600">
                No complaints match the selected filters.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-cyan-300 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wide text-[#007ea7]">
                          {complaint.complaint_number}
                        </span>

                        {complaint.confidential && (
                          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-black text-purple-700">
                            Confidential
                          </span>
                        )}
                      </div>

                      <h4 className="mt-2 text-lg font-black text-[#003d5b]">
                        {complaint.title}
                      </h4>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        <span>
                          <strong className="text-slate-700">
                            {complaint.student_name}
                          </strong>
                          {" • "}
                          {complaint.roll_number}
                        </span>

                        <span>{complaint.category}</span>

                        <span className="flex items-center gap-1">
                          <Building2 size={14} />
                          {complaint.assigned_department ||
                            "Pending Assignment"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${priorityBadge(
                          complaint.priority
                        )}`}
                      >
                        {complaint.priority.toUpperCase()}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${statusBadge(
                          complaint.status
                        )}`}
                      >
                        {formatStatus(complaint.status)}
                      </span>

                      {complaint.escalation_level > 0 && (
                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-black ${escalationBadge(
                            complaint.escalation_level
                          )}`}
                        >
                          Level {complaint.escalation_level} — {complaint.escalation_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                      <span>
                        Submitted: {formatDate(complaint.submitted_at)}
                      </span>

                      <span>
                        SLA: {complaint.sla_hours ? `${complaint.sla_hours} hours` : "Not captured"}
                      </span>

                      <span>
                        Deadline: {formatDate(complaint.sla_deadline)}
                      </span>

                      {complaint.escalation_level > 0 && (
                        <span className="font-black text-red-600">
                          Escalated: {formatDate(complaint.escalated_at)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void openComplaintDetail(
                          complaint.complaint_number
                        )
                      }
                      className="rounded-xl bg-[#007ea7] px-4 py-2.5 text-sm font-black text-white hover:bg-[#00698d]"
                    >
                      View / Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ESCALATION ACTION MODAL */}
      {actionEscalation && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#007ea7]">
                  {actionEscalation.complaint_number || "Escalation"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-[#003d5b]">
                  {actionType === "acknowledge"
                    ? "Acknowledge Escalation"
                    : "Resolve Escalated Complaint"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeEscalationAction}
                disabled={actionLoading}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${escalationBadge(
                      actionEscalation.escalation_level
                    )}`}
                  >
                    Level {actionEscalation.escalation_level}
                  </span>

                  <span className="text-sm font-black text-[#003d5b]">
                    {actionEscalation.escalated_to}
                  </span>
                </div>

                <p className="mt-3 text-sm font-bold text-slate-700">
                  {actionEscalation.title || "Complaint"}
                </p>
              </div>

              <label className="mt-5 block text-xs font-black uppercase tracking-wide text-slate-500">
                Remarks
              </label>

              <textarea
                value={actionRemarks}
                onChange={(event) =>
                  setActionRemarks(event.target.value)
                }
                rows={4}
                placeholder={
                  actionType === "acknowledge"
                    ? "Optional: add acknowledgement remarks..."
                    : "Optional: add final resolution remarks..."
                }
                className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />

              {actionType === "resolve" && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Resolving will mark the main complaint as resolved and close
                  all active or acknowledged escalation records for this
                  complaint.
                </div>
              )}

              {actionError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {actionError}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEscalationAction}
                  disabled={actionLoading}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void submitEscalationAction()}
                  disabled={actionLoading}
                  className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                    actionType === "acknowledge"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {actionType === "acknowledge"
                        ? "Confirm Acknowledge"
                        : "Confirm Resolution"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL LOADING MODAL */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="rounded-3xl bg-white p-10 text-center shadow-2xl">
            <Loader2
              size={36}
              className="mx-auto animate-spin text-[#007ea7]"
            />
            <p className="mt-4 font-black text-slate-700">
              Loading complaint details...
            </p>
          </div>
        </div>
      )}

      {/* DETAIL ERROR MODAL */}
      {detailError && !detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <h3 className="text-xl font-black text-red-700">
              Unable to load complaint
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              {detailError}
            </p>
            <button
              type="button"
              onClick={closeDetail}
              className="mt-6 w-full rounded-xl bg-[#007ea7] px-5 py-3 font-black text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetail && !detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#007ea7]">
                  {selectedDetail.complaint.complaint_number}
                </p>

                <h3 className="mt-2 text-2xl font-black text-[#003d5b]">
                  Complaint Details
                </h3>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${priorityBadge(
                      selectedDetail.complaint.priority
                    )}`}
                  >
                    {selectedDetail.complaint.priority.toUpperCase()}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${statusBadge(
                      selectedDetail.complaint.status
                    )}`}
                  >
                    {formatStatus(
                      selectedDetail.complaint.status
                    )}
                  </span>

                  {selectedDetail.complaint.confidential && (
                    <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-black text-purple-700">
                      Confidential
                    </span>
                  )}
                </div>

                <h4 className="mt-4 text-2xl font-black text-[#003d5b]">
                  {selectedDetail.complaint.title}
                </h4>

                <p className="mt-3 leading-7 text-slate-600">
                  {selectedDetail.complaint.description}
                </p>
              </div>

              {/* Student details */}
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-[#007ea7]">
                  <UserRound size={20} />
                  <h4 className="font-black">
                    Student Information
                  </h4>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Student
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {selectedDetail.complaint.student_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Roll Number
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {selectedDetail.complaint.roll_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Email
                    </p>
                    <p className="mt-1 break-all font-bold text-slate-700">
                      {selectedDetail.complaint.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Phone
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {selectedDetail.complaint.phone ||
                        "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Academic Department
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {selectedDetail.complaint.student_department ||
                        "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Semester
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {selectedDetail.complaint.semester
                        ? `Semester ${selectedDetail.complaint.semester}`
                        : "Not available"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Routing */}
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-[#007ea7]">
                  <Building2 size={20} />
                  <h4 className="font-black">
                    Complaint Assignment
                  </h4>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Category
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {selectedDetail.complaint.category}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Assigned Department
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {selectedDetail.complaint.assigned_department ||
                        "Pending Assignment"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Submitted
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {formatDate(
                        selectedDetail.complaint.submitted_at
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Resolved
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {formatDate(
                        selectedDetail.complaint.resolved_at
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50">
                <div className="flex flex-col gap-4 border-b border-violet-100 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                      <Sparkles size={22} />
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

                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        AI-assisted triage captured when the student analyzed
                        this complaint. Official routing rules remain
                        authoritative for final priority, department and SLA.
                      </p>
                    </div>
                  </div>

                  {selectedDetail.complaint.ai_analyzed &&
                    selectedDetail.complaint.ai_confidence !== null && (
                      <span className="w-fit rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm">
                        Confidence:{" "}
                        {Math.round(
                          Math.max(
                            0,
                            Math.min(
                              1,
                              Number(
                                selectedDetail.complaint.ai_confidence
                              ) || 0
                            )
                          ) * 100
                        )}
                        %
                      </span>
                    )}
                </div>

                {selectedDetail.complaint.ai_analyzed ? (
                  <div className="p-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-violet-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Suggested Category
                        </p>
                        <p className="mt-1 font-black text-[#003d5b]">
                          {selectedDetail.complaint.ai_category ||
                            "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-violet-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Suggested Priority
                        </p>
                        <p className="mt-1 font-black capitalize text-[#003d5b]">
                          {selectedDetail.complaint.ai_priority ||
                            "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-violet-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Urgency
                        </p>
                        <p className="mt-1 font-black capitalize text-[#003d5b]">
                          {selectedDetail.complaint.ai_urgency ||
                            "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-violet-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          AI SLA
                        </p>
                        <p className="mt-1 font-black text-[#003d5b]">
                          {selectedDetail.complaint.ai_sla_hours
                            ? `${selectedDetail.complaint.ai_sla_hours} Hours`
                            : "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                        <p className="text-xs font-bold uppercase text-[#007ea7]">
                          AI Recommended Department
                        </p>

                        <p className="mt-2 font-black text-[#003d5b]">
                          {selectedDetail.complaint
                            .ai_recommended_department_id
                            ? departments.find(
                                (department) =>
                                  department.id ===
                                  selectedDetail.complaint
                                    .ai_recommended_department_id
                              )?.name ||
                              (selectedDetail.complaint
                                .ai_recommended_department_id ===
                              selectedDetail.complaint
                                .assigned_department_id
                                ? selectedDetail.complaint
                                    .assigned_department
                                : null) ||
                              "Department record available"
                            : "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Analysis Time
                        </p>

                        <p className="mt-2 font-black text-slate-700">
                          {selectedDetail.complaint.ai_analyzed_at
                            ? formatDate(
                                selectedDetail.complaint.ai_analyzed_at
                              )
                            : "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-violet-100 bg-white p-4">
                      <p className="text-xs font-bold uppercase text-violet-600">
                        AI Summary
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {selectedDetail.complaint.ai_summary ||
                          "No AI summary was recorded."}
                      </p>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">
                        AI Reasoning
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {selectedDetail.complaint.ai_reason ||
                          "No AI reasoning was recorded."}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Official Priority
                        </p>
                        <p className="mt-1 font-black capitalize text-slate-700">
                          {selectedDetail.complaint.priority}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          AI Suggested Priority
                        </p>
                        <p className="mt-1 font-black capitalize text-slate-700">
                          {selectedDetail.complaint.ai_priority ||
                            "Not available"}
                        </p>
                      </div>
                    </div>

                    {selectedDetail.complaint.ai_priority &&
                      selectedDetail.complaint.ai_priority !==
                        selectedDetail.complaint.priority && (
                        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <AlertTriangle
                            size={18}
                            className="mt-0.5 shrink-0 text-amber-600"
                          />

                          <div>
                            <p className="text-sm font-black text-amber-800">
                              Advisory priority differs from official priority
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                              AI suggested{" "}
                              <strong className="capitalize">
                                {selectedDetail.complaint.ai_priority}
                              </strong>
                              , while the official routing rule assigned{" "}
                              <strong className="capitalize">
                                {selectedDetail.complaint.priority}
                              </strong>
                              . The official workflow value remains in effect.
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="rounded-xl border border-dashed border-violet-200 bg-white/70 p-6 text-center">
                      <Sparkles
                        size={26}
                        className="mx-auto text-violet-300"
                      />
                      <p className="mt-3 font-black text-slate-700">
                        No AI analysis recorded
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        This complaint was submitted without using the AI
                        Complaint Assistant.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence */}
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-[#007ea7]">
                  <Paperclip size={20} />
                  <h4 className="font-black">
                    Supporting Evidence
                  </h4>
                </div>

                {selectedDetail.evidence.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm font-bold text-slate-500">
                    No supporting evidence attached.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {selectedDetail.evidence.map((file) => (
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
                              {fileTypeLabel(file.file_type)}
                              {" • "}
                              {formatFileSize(file.file_size)}
                            </p>
                          </div>
                        </div>

                        {file.signed_url && (
                          <div className="flex gap-2">
                            <a
                              href={file.signed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-[#007ea7]"
                            >
                              <Eye size={16} />
                              View
                            </a>

                            <button
                              type="button"
                              onClick={() =>
                                void downloadEvidence(file)
                              }
                              disabled={
                                downloadingId === file.id
                              }
                              className="flex items-center gap-2 rounded-xl bg-[#007ea7] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="rounded-2xl border border-slate-200 p-5">
                <h4 className="font-black text-[#003d5b]">
                  Complaint Timeline
                </h4>

                {selectedDetail.history.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No complaint history available.
                  </p>
                ) : (
                  <div className="mt-6">
                    {selectedDetail.history.map(
                      (item, index) => {
                        const last =
                          index ===
                          selectedDetail.history.length - 1;

                        return (
                          <div
                            key={item.id}
                            className="relative flex gap-4"
                          >
                            {!last && (
                              <div className="absolute left-[19px] top-10 h-full w-[2px] bg-emerald-200" />
                            )}

                            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <CheckCircle2 size={18} />
                            </div>

                            <div className="pb-7">
                              <p className="font-black text-[#003d5b]">
                                {formatStatus(item.new_status)}
                              </p>

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
                      }
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-cyan-50 p-4 text-sm text-slate-600">
                Admin currently has university-wide read access. Routing
                and escalation controls will be added in the next step.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
