"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  FilePlus2,
  Loader2,
  LogOut,
  Search,
  UserCircle2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API_URL = "http://127.0.0.1:8000";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  roll_number: string | null;
  phone: string | null;
  semester: number | null;
  role: string;
  department_id: string | null;
};

type Complaint = {
  id: string;
  complaint_number: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  assigned_department: string | null;
  submitted_at: string;
  resolved_at: string | null;
};

type PortalNotification = {
  id: string;
  complaint_id: string | null;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNotificationDate(date: string) {
  return new Date(date).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getComplaintNumber(title: string) {
  const match = title.match(/QCP-\d{4}-\d{6}/i);
  return match ? match[0].toUpperCase() : null;
}

export default function StudentDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [departmentName, setDepartmentName] = useState("Not assigned");
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationBusy, setNotificationBusy] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const loadNotifications = async (accessToken: string) => {
    try {
      setNotificationError("");

      const response = await fetch(`${API_URL}/my-notifications`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load notifications.");
      }

      setNotifications(data.notifications || []);
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications."
      );
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/student-auth");
          return;
        }

        const user = session.user;

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id,full_name,email,roll_number,phone,semester,role,department_id"
          )
          .eq("auth_user_id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        setProfile(profileData);

        if (profileData.department_id) {
          const { data: departmentData } = await supabase
            .from("departments")
            .select("name")
            .eq("id", profileData.department_id)
            .single();

          if (departmentData) {
            setDepartmentName(departmentData.name);
          }
        }

        const complaintsResponse = await fetch(`${API_URL}/my-complaints`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const complaintsData = await complaintsResponse.json();

        if (!complaintsResponse.ok) {
          throw new Error(
            complaintsData.detail || "Unable to load your complaints."
          );
        }

        setComplaints(complaintsData.complaints || []);

        await loadNotifications(session.access_token);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load student dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [router]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      setNotificationBusy(notificationId);
      setNotificationError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/student-auth");
        return;
      }

      const response = await fetch(
        `${API_URL}/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to mark notification as read.");
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Unable to update notification."
      );
    } finally {
      setNotificationBusy(null);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      setMarkingAll(true);
      setNotificationError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/student-auth");
        return;
      }

      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to mark notifications as read.");
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Unable to update notifications."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/student-auth");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <div className="text-center">
          <Loader2
            size={40}
            className="mx-auto animate-spin text-[#007ea7]"
          />
          <p className="mt-4 font-bold text-slate-600">
            Loading Student Dashboard...
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
          <p className="mt-3 text-slate-600">{error}</p>
          <Link
            href="/student-auth"
            className="mt-6 inline-block rounded-xl bg-[#007ea7] px-6 py-3 font-bold text-white"
          >
            Student Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb]">
      <header className="relative z-40 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 shrink-0">
              <Image
                src="/quest-logo.png"
                alt="QUEST Logo"
                fill
                className="object-contain"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate font-black text-[#006d92]">
                QUEST COMPLAINT PORTAL
              </h1>
              <p className="text-xs text-slate-500">Student Dashboard</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((current) => !current)}
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                aria-label="Notifications"
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-14 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                      <h2 className="font-black text-[#003d5b]">Notifications</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          disabled={markingAll}
                          onClick={markAllNotificationsAsRead}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-black text-[#007ea7] hover:bg-cyan-50 disabled:opacity-50"
                        >
                          {markingAll ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCheck size={14} />
                          )}
                          Mark all read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        aria-label="Close notifications"
                      >
                        <X size={17} />
                      </button>
                    </div>
                  </div>

                  {notificationError && (
                    <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-xs font-semibold text-red-700">
                      {notificationError}
                    </div>
                  )}

                  <div className="max-h-[430px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-6 py-10 text-center">
                        <Bell size={28} className="mx-auto text-slate-300" />
                        <p className="mt-3 font-bold text-slate-600">
                          No notifications yet
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Complaint status updates will appear here.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const complaintNumber = getComplaintNumber(
                          notification.title
                        );

                        return (
                          <div
                            key={notification.id}
                            className={`border-b border-slate-100 px-5 py-4 last:border-b-0 ${
                              notification.is_read ? "bg-white" : "bg-cyan-50/60"
                            }`}
                          >
                            <div className="flex gap-3">
                              <div
                                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                  notification.is_read
                                    ? "bg-slate-300"
                                    : "bg-[#007ea7]"
                                }`}
                              />

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-[#003d5b]">
                                  {notification.title}
                                </p>
                                <p className="mt-1.5 text-sm leading-5 text-slate-600">
                                  {notification.message}
                                </p>
                                <p className="mt-2 text-[11px] font-semibold text-slate-400">
                                  {formatNotificationDate(notification.created_at)}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                  {complaintNumber && (
                                    <Link
                                      href={`/track-complaint?id=${encodeURIComponent(
                                        complaintNumber
                                      )}`}
                                      onClick={() => setNotificationsOpen(false)}
                                      className="text-xs font-black text-[#007ea7] hover:underline"
                                    >
                                      Track complaint →
                                    </Link>
                                  )}

                                  {!notification.is_read && (
                                    <button
                                      type="button"
                                      disabled={notificationBusy === notification.id}
                                      onClick={() =>
                                        void markNotificationAsRead(notification.id)
                                      }
                                      className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:underline disabled:opacity-50"
                                    >
                                      {notificationBusy === notification.id ? (
                                        <Loader2 size={13} className="animate-spin" />
                                      ) : (
                                        <Check size={13} />
                                      )}
                                      Mark as read
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <LogOut size={17} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-r from-[#003d5b] to-[#007ea7] text-white">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">
            Student Portal
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Welcome, {profile?.full_name}
          </h2>
          <p className="mt-2 text-slate-200">
            Manage and track all your complaints from one dashboard.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-[#007ea7]">
              <UserCircle2 size={38} />
            </div>

            <h3 className="mt-5 text-xl font-black text-[#003d5b]">
              {profile?.full_name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>

            <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Roll Number
                </p>
                <p className="mt-1 font-bold text-slate-700">
                  {profile?.roll_number || "Not available"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Department
                </p>
                <p className="mt-1 font-bold text-slate-700">
                  {departmentName}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Semester
                </p>
                <p className="mt-1 font-bold text-slate-700">
                  {profile?.semester
                    ? `Semester ${profile.semester}`
                    : "Not available"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Account Role
                </p>
                <p className="mt-1 font-bold capitalize text-emerald-600">
                  {profile?.role}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Link
                href="/submit-complaint"
                className="rounded-3xl bg-[#007ea7] p-7 text-white shadow-lg transition hover:-translate-y-1"
              >
                <FilePlus2 size={32} />
                <h3 className="mt-5 text-xl font-black">
                  Submit New Complaint
                </h3>
                <p className="mt-2 text-sm leading-6 text-cyan-50">
                  Raise a new complaint and attach supporting evidence.
                </p>
              </Link>

              <Link
                href="/track-complaint"
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1"
              >
                <Search size={32} className="text-[#007ea7]" />
                <h3 className="mt-5 text-xl font-black text-[#003d5b]">
                  Track Complaint
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Track an existing complaint using its unique Complaint ID.
                </p>
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-[#003d5b]">
                    My Complaints
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Complaints submitted using your student account.
                  </p>
                </div>

                <div className="rounded-xl bg-cyan-50 px-4 py-2 text-sm font-black text-[#007ea7]">
                  Total: {complaints.length}
                </div>
              </div>

              {complaints.length === 0 ? (
                <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <p className="font-bold text-slate-600">
                    You have not submitted any complaints yet.
                  </p>
                  <Link
                    href="/submit-complaint"
                    className="mt-4 inline-block font-black text-[#007ea7]"
                  >
                    Submit your first complaint
                  </Link>
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  {complaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      className="rounded-2xl border border-slate-200 p-5 transition hover:border-cyan-300 hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#007ea7]">
                            {complaint.complaint_number}
                          </p>
                          <h4 className="mt-2 text-lg font-black text-[#003d5b]">
                            {complaint.title}
                          </h4>
                          <p className="mt-2 text-sm text-slate-500">
                            {complaint.category}
                            {" • "}
                            {complaint.assigned_department ||
                              "Pending Assignment"}
                          </p>
                        </div>

                        <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
                          {formatStatus(complaint.status)}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                        <div className="flex flex-wrap gap-5 text-xs text-slate-500">
                          <span>
                            Priority:{" "}
                            <strong className="capitalize text-slate-700">
                              {complaint.priority}
                            </strong>
                          </span>

                          <span>
                            Submitted:{" "}
                            <strong className="text-slate-700">
                              {formatDate(complaint.submitted_at)}
                            </strong>
                          </span>
                        </div>

                        <Link
                          href={`/track-complaint?id=${encodeURIComponent(
                            complaint.complaint_number
                          )}`}
                          className="font-black text-[#007ea7] hover:underline"
                        >
                          Track →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
