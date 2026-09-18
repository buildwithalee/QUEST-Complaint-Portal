"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type AnalyticsOverview = {
  total_complaints: number;
  resolved: number;
  resolution_rate: number;
  escalated: number;
  overdue_open: number;
  ai_analyzed: number;
  ai_adoption_rate: number;
  sla_compliance_rate: number;
  average_resolution_hours: number;
};

type MonthlyTrendItem = {
  month: string;
  submitted: number;
  resolved: number;
};

type AnalyticsResponse = {
  success: boolean;
  generated_at: string;
  overview: AnalyticsOverview;
  status_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  department_workload: Record<string, number>;
  monthly_trend: MonthlyTrendItem[];
  detail?: string;
};

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("en-PK", {
    month: "short",
    year: "2-digit",
  });
}

function DistributionBars({
  data,
  emptyMessage,
}: {
  data: Record<string, number>;
  emptyMessage: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([label, value]) => {
        const width = Math.max(4, (value / max) * 100);
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

        return (
          <div key={label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-slate-700">
                {formatLabel(label)}
              </span>

              <span className="shrink-0 text-xs font-black text-slate-500">
                {value} ({percentage}%)
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#007ea7] transition-all"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRing({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative flex h-36 w-36 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#007ea7 ${safeValue * 3.6}deg, #e2e8f0 0deg)`,
        }}
      >
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-3xl font-black text-[#003d5b]">
            {safeValue.toFixed(1)}%
          </span>

          <span className="mt-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin-auth");
        return;
      }

      const response = await fetch(`${API_URL}/admin/analytics`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data: AnalyticsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load analytics.");
      }

      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const topCategory = useMemo(() => {
    if (!analytics) return null;

    const entries = Object.entries(analytics.category_distribution || {});

    if (entries.length === 0) return null;

    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [analytics]);

  const busiestDepartment = useMemo(() => {
    if (!analytics) return null;

    const entries = Object.entries(analytics.department_workload || {});

    if (entries.length === 0) return null;

    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [analytics]);

  const maxMonthlyValue = useMemo(() => {
    if (!analytics || analytics.monthly_trend.length === 0) return 1;

    return Math.max(
      1,
      ...analytics.monthly_trend.flatMap((item) => [
        item.submitted,
        item.resolved,
      ])
    );
  }, [analytics]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <div className="text-center">
          <Loader2
            size={42}
            className="mx-auto animate-spin text-[#007ea7]"
          />

          <p className="mt-4 font-bold text-slate-600">
            Loading Analytics Dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb]">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0">
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
                Analytics & Performance Intelligence
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void loadAnalytics(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-black text-[#007ea7] transition hover:bg-cyan-100 disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin-dashboard")}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Admin Dashboard
            </button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-r from-[#003d5b] to-[#007ea7] text-white">
        <div className="mx-auto max-w-7xl px-5 py-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-200">
                <BarChart3 size={20} />
                <p className="font-bold uppercase tracking-[0.16em]">
                  University Intelligence
                </p>
              </div>

              <h2 className="mt-3 text-3xl font-black md:text-4xl">
                Complaint Analytics Dashboard
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-200">
                Monitor complaint volume, resolution performance, AI adoption,
                SLA compliance, escalation pressure and department workload
                across QUEST.
              </p>
            </div>

            {analytics && (
              <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                  Last Generated
                </p>
                <p className="mt-1 font-black">
                  {formatDate(analytics.generated_at)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {!analytics ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <AlertTriangle
              size={36}
              className="mx-auto text-amber-500"
            />

            <h3 className="mt-4 text-xl font-black text-[#003d5b]">
              Analytics unavailable
            </h3>

            <p className="mt-2 text-slate-500">
              Start the backend and refresh this page.
            </p>
          </div>
        ) : (
          <>
            {/* OVERVIEW CARDS */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <FileText size={26} className="text-[#007ea7]" />
                <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                  Total Complaints
                </p>
                <p className="mt-1 text-3xl font-black text-[#003d5b]">
                  {analytics.overview.total_complaints}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <CheckCircle2 size={26} className="text-emerald-600" />
                <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                  Resolved
                </p>
                <p className="mt-1 text-3xl font-black text-[#003d5b]">
                  {analytics.overview.resolved}
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-600">
                  {analytics.overview.resolution_rate}% resolution rate
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <AlertTriangle size={26} className="text-red-500" />
                <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                  Escalated
                </p>
                <p className="mt-1 text-3xl font-black text-[#003d5b]">
                  {analytics.overview.escalated}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <TimerReset size={26} className="text-amber-500" />
                <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                  Overdue Open
                </p>
                <p className="mt-1 text-3xl font-black text-[#003d5b]">
                  {analytics.overview.overdue_open}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <BrainCircuit size={26} className="text-violet-600" />
                <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                  AI Analyzed
                </p>
                <p className="mt-1 text-3xl font-black text-[#003d5b]">
                  {analytics.overview.ai_analyzed}
                </p>
                <p className="mt-1 text-xs font-bold text-violet-600">
                  {analytics.overview.ai_adoption_rate}% adoption
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <ShieldCheck size={26} className="text-blue-600" />
                <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                  SLA Compliance
                </p>
                <p className="mt-1 text-3xl font-black text-[#003d5b]">
                  {analytics.overview.sla_compliance_rate}%
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <Clock3 size={26} className="text-cyan-600" />
                <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                  Avg Resolution
                </p>
                <p className="mt-1 text-3xl font-black text-[#003d5b]">
                  {analytics.overview.average_resolution_hours}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Hours
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <TrendingUp size={26} className="text-orange-500" />
                <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                  Top Category
                </p>
                <p className="mt-1 truncate text-xl font-black text-[#003d5b]">
                  {topCategory ? formatLabel(topCategory[0]) : "N/A"}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {topCategory ? `${topCategory[1]} complaint(s)` : "No data"}
                </p>
              </div>
            </div>

            {/* PERFORMANCE RINGS */}
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_1.35fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-50 p-3 text-[#007ea7]">
                    <Gauge size={22} />
                  </div>

                  <div>
                    <p className="font-black text-[#003d5b]">
                      Resolution Performance
                    </p>
                    <p className="text-xs text-slate-500">
                      Overall resolved share
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <ProgressRing
                    value={analytics.overview.resolution_rate}
                    label="Resolution"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                    <Sparkles size={22} />
                  </div>

                  <div>
                    <p className="font-black text-[#003d5b]">
                      AI Adoption
                    </p>
                    <p className="text-xs text-slate-500">
                      Complaints analyzed by Gemini
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <ProgressRing
                    value={analytics.overview.ai_adoption_rate}
                    label="AI Adoption"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                    <ShieldCheck size={22} />
                  </div>

                  <div>
                    <p className="font-black text-[#003d5b]">
                      SLA Compliance
                    </p>
                    <p className="text-xs text-slate-500">
                      Resolved within assigned SLA
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-around">
                  <ProgressRing
                    value={analytics.overview.sla_compliance_rate}
                    label="Within SLA"
                  />

                  <div className="rounded-2xl bg-slate-50 p-5 text-center">
                    <Activity
                      size={25}
                      className="mx-auto text-[#007ea7]"
                    />
                    <p className="mt-3 text-xs font-bold uppercase text-slate-400">
                      Busiest Department
                    </p>
                    <p className="mt-1 max-w-[190px] font-black text-[#003d5b]">
                      {busiestDepartment
                        ? busiestDepartment[0]
                        : "No data"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {busiestDepartment
                        ? `${busiestDepartment[1]} complaint(s)`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* DISTRIBUTIONS */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <BarChart3 size={23} className="text-[#007ea7]" />
                  <div>
                    <h3 className="text-lg font-black text-[#003d5b]">
                      Status Distribution
                    </h3>
                    <p className="text-xs text-slate-500">
                      Complaint workflow state
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <DistributionBars
                    data={analytics.status_distribution}
                    emptyMessage="No status data available."
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={23} className="text-orange-500" />
                  <div>
                    <h3 className="text-lg font-black text-[#003d5b]">
                      Priority Distribution
                    </h3>
                    <p className="text-xs text-slate-500">
                      Official routing priority
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <DistributionBars
                    data={analytics.priority_distribution}
                    emptyMessage="No priority data available."
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <FileText size={23} className="text-violet-600" />
                  <div>
                    <h3 className="text-lg font-black text-[#003d5b]">
                      Category Distribution
                    </h3>
                    <p className="text-xs text-slate-500">
                      Most common complaint areas
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <DistributionBars
                    data={analytics.category_distribution}
                    emptyMessage="No category data available."
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Building2 size={23} className="text-emerald-600" />
                  <div>
                    <h3 className="text-lg font-black text-[#003d5b]">
                      Department Workload
                    </h3>
                    <p className="text-xs text-slate-500">
                      Complaints assigned across QUEST
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <DistributionBars
                    data={analytics.department_workload}
                    emptyMessage="No department workload data available."
                  />
                </div>
              </div>
            </div>

            {/* MONTHLY TREND */}
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp size={24} className="text-[#007ea7]" />

                  <div>
                    <h3 className="text-xl font-black text-[#003d5b]">
                      Monthly Complaint Trend
                    </h3>
                    <p className="text-sm text-slate-500">
                      Submitted versus resolved complaints
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-[#007ea7]" />
                    Submitted
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-emerald-500" />
                    Resolved
                  </span>
                </div>
              </div>

              {analytics.monthly_trend.length === 0 ? (
                <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">
                  Monthly trend will appear after complaints are recorded.
                </div>
              ) : (
                <div className="mt-8 overflow-x-auto">
                  <div
                    className="grid min-w-[680px] items-end gap-4"
                    style={{
                      gridTemplateColumns: `repeat(${analytics.monthly_trend.length}, minmax(80px, 1fr))`,
                    }}
                  >
                    {analytics.monthly_trend.map((item) => {
                      const submittedHeight = Math.max(
                        8,
                        (item.submitted / maxMonthlyValue) * 190
                      );

                      const resolvedHeight = Math.max(
                        item.resolved > 0 ? 8 : 0,
                        (item.resolved / maxMonthlyValue) * 190
                      );

                      return (
                        <div
                          key={item.month}
                          className="flex flex-col items-center"
                        >
                          <div className="flex h-[210px] items-end gap-2">
                            <div className="flex flex-col items-center">
                              <span className="mb-1 text-[10px] font-black text-slate-500">
                                {item.submitted}
                              </span>
                              <div
                                className="w-7 rounded-t-lg bg-[#007ea7]"
                                style={{
                                  height: `${submittedHeight}px`,
                                }}
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="mb-1 text-[10px] font-black text-slate-500">
                                {item.resolved}
                              </span>
                              <div
                                className="w-7 rounded-t-lg bg-emerald-500"
                                style={{
                                  height: `${resolvedHeight}px`,
                                }}
                              />
                            </div>
                          </div>

                          <p className="mt-3 text-xs font-black text-slate-600">
                            {formatMonth(item.month)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-3xl border border-cyan-100 bg-cyan-50 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={22}
                  className="mt-0.5 shrink-0 text-[#007ea7]"
                />

                <div>
                  <p className="font-black text-[#003d5b]">
                    Analytics interpretation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    These metrics are calculated from live complaint records.
                    AI analysis remains advisory, while official priority, SLA,
                    routing and escalation decisions continue to follow QUEST
                    portal workflow rules.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
