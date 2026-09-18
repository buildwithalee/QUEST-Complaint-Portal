"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  FilePlus2,
  GraduationCap,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const categories = [
  {
    title: "Academics",
    description: "Classes, faculty, curriculum and academic concerns.",
    icon: GraduationCap,
  },
  {
    title: "Examination",
    description: "Exams, results, evaluation and examination matters.",
    icon: FilePlus2,
  },
  {
    title: "Hostel",
    description: "Hostel facilities, accommodation and mess issues.",
    icon: Building2,
  },
  {
    title: "Transport",
    description: "University buses, routes and transport services.",
    icon: Route,
  },
  {
    title: "IT Support",
    description: "Internet, LMS, portal, email and technical issues.",
    icon: BarChart3,
  },
  {
    title: "Administration",
    description: "Administrative, student affairs and general concerns.",
    icon: ShieldCheck,
  },
];

const features = [
  {
    icon: FilePlus2,
    title: "Easy Complaint Submission",
    text: "Submit your complaint in a few simple steps with complete details.",
  },
  {
    icon: Search,
    title: "Real-Time Tracking",
    text: "Track every stage of your complaint using a unique complaint ID.",
  },
  {
    icon: Route,
    title: "Smart Department Routing",
    text: "Complaints are directed to the relevant university department.",
  },
  {
    icon: LockKeyhole,
    title: "Secure Student Access",
    text: "Student information and complaint records remain protected.",
  },
];

export default function Home() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [complaintId, setComplaintId] = useState("");
  const [message, setMessage] = useState("");

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();

    if (!complaintId.trim()) {
      setMessage("Please enter your Complaint ID.");
      return;
    }

    setMessage(
      `Tracking request received for ${complaintId}. Live backend tracking will be connected next.`
    );
  };

  return (
    <main className="min-h-screen bg-[#f6f9fc] text-slate-900">
      {/* TOP BAR */}
      <div className="bg-[#004f71] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2 text-xs md:text-sm">
          <p className="hidden sm:block">
            Knowledge &nbsp; | &nbsp; Service &nbsp; | &nbsp; Progress
          </p>

          <div className="ml-auto flex items-center gap-5">
            <span>Students</span>
            <span>Faculty</span>
            <span>Staff</span>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <a href="#" className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 md:h-20 md:w-20">
              <img
  src="/quest-logo.png"
  alt="QUEST University Logo"
  className="h-full w-full object-contain"
/>
            </div>

            <div>
              <p className="hidden text-xs font-semibold text-slate-600 lg:block">
                Quaid-e-Awam University of Engineering, Science & Technology,
                Nawabshah
              </p>

              <h1 className="text-lg font-black tracking-tight text-[#006d92] md:text-2xl">
                QUEST COMPLAINT PORTAL
              </h1>

              <p className="text-xs font-medium text-slate-500">
                Raise • Track • Resolve
              </p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 lg:flex">
            <a href="#" className="text-[#007ea7]">
              Home
            </a>

            <a
              href="/submit-complaint"
              className="transition hover:text-[#007ea7]"
            >
              Submit Complaint
            </a>

            <a href="/track-complaint" className="transition hover:text-[#007ea7]">
              Track Complaint
            </a>

            <a href="#categories" className="transition hover:text-[#007ea7]">
              Departments
            </a>

            <a href="#contact" className="transition hover:text-[#007ea7]">
              Contact
            </a>

            <a
  href="/student-auth"
  className="rounded-xl bg-[#006d92] px-5 py-3 text-white shadow-sm transition hover:bg-[#005674]"
>
  Student Login
</a>
          </nav>

          {/* Mobile Button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-lg border p-2 lg:hidden"
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenu && (
          <div className="border-t bg-white px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-4 font-semibold text-slate-700">
              <a href="#">Home</a>
              <a href="/submit-complaint">Submit Complaint</a>
              <a href="/track-complaint">Track Complaint</a>
              <a href="#categories">Departments</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative min-h-[650px] overflow-hidden">
        <div className="absolute inset-0 bg-[#dbeaf1]">
  <div
    className="absolute inset-0 bg-no-repeat"
    style={{
      backgroundImage: "url('/quest-main-gate.png')",
      backgroundSize: "100% auto",
     backgroundPosition: "center center",
    }}
  />
</div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#003a55]/95 via-[#004f71]/78 to-[#001e2c]/25" />

        <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Hero text */}
          <div className="max-w-3xl text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-white/10 px-4 py-2 text-sm backdrop-blur">
              <Sparkles size={16} className="text-cyan-300" />
              Your Voice Matters
            </div>

            <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              A Smarter Way to
              <span className="block text-cyan-300">
                Raise & Track Complaints
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-100 md:text-lg">
              A centralized digital platform for QUEST students to securely
              submit university-related complaints, monitor progress and
              receive transparent updates from concerned departments.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/submit-complaint"
                className="group flex items-center gap-3 rounded-xl bg-cyan-500 px-6 py-4 font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-cyan-400"
              >
                <FilePlus2 size={20} />
                Submit Complaint
                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </a>

              <a
                href="/track-complaint"
                className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/10 px-6 py-4 font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <Search size={20} />
                Track Complaint
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-cyan-300" />
                <div>
                  <p className="font-semibold">Secure</p>
                  <p className="text-xs text-slate-300">Protected records</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Route className="text-cyan-300" />
                <div>
                  <p className="font-semibold">Smart Routing</p>
                  <p className="text-xs text-slate-300">
                    Relevant department
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <BarChart3 className="text-cyan-300" />
                <div>
                  <p className="font-semibold">Transparent</p>
                  <p className="text-xs text-slate-300">
                    Status at every stage
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Track card */}
          <div
            id="track"
            className="rounded-3xl border border-white/40 bg-white/95 p-7 shadow-2xl backdrop-blur-xl md:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-cyan-50 p-3 text-[#007ea7]">
                <Search size={27} />
              </div>

              <div>
                <h3 className="text-2xl font-black text-[#003d5b]">
                  Track Your Complaint
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your Complaint ID to check the latest status.
                </p>
              </div>
            </div>

            <form onSubmit={handleTrack} className="mt-7">
              <label className="text-sm font-bold text-slate-700">
                Complaint ID
              </label>

              <input
                value={complaintId}
                onChange={(e) => {
                  setComplaintId(e.target.value);
                  setMessage("");
                }}
                placeholder="e.g. QCP-2026-0001"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />

              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#007ea7] px-5 py-4 font-bold text-white shadow-md transition hover:bg-[#00698d]"
              >
                Track Status
                <ArrowRight size={18} />
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-xl bg-cyan-50 p-4 text-sm text-[#005f7f]">
                {message}
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 border-t pt-5 text-sm text-slate-500">
              <CircleCheckBig size={17} className="text-emerald-500" />
              Unique complaint IDs provide transparent tracking.
            </div>
          </div>
        </div>
      </section>

      {/* WHY USE PORTAL */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="font-bold uppercase tracking-[0.2em] text-[#008bb5]">
                Smart Student Support
              </p>

              <h2 className="mt-3 text-3xl font-black text-[#003d5b] md:text-4xl">
                Why use QUEST Complaint Portal?
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Designed to make complaint submission faster, more transparent
                and easier to manage for students and university departments.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-2 hover:border-cyan-200 hover:shadow-xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-[#008bb5] transition group-hover:bg-[#008bb5] group-hover:text-white">
                    <Icon size={27} />
                  </div>

                  <h3 className="mt-6 text-lg font-black text-[#003d5b]">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="bg-[#f5f9fc] py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="text-center">
            <p className="font-bold uppercase tracking-[0.2em] text-[#008bb5]">
              Complaint Categories
            </p>

            <h2 className="mt-3 text-3xl font-black text-[#003d5b] md:text-4xl">
              Select the type of concern
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Complaints are categorized so they can reach the appropriate
              university office without unnecessary delay.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <a
                  key={category.title}
                  href={`/submit-complaint?category=${encodeURIComponent(
                    category.title
                  )}`}
                  className="group flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e8f7fc] text-[#008bb5]">
                    <Icon size={26} />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-black text-[#003d5b]">
                      {category.title}
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {category.description}
                    </p>
                  </div>

                  <ChevronRight
                    size={20}
                    className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#008bb5]"
                  />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="text-center">
            <p className="font-bold uppercase tracking-[0.2em] text-[#008bb5]">
              Transparent Process
            </p>

            <h2 className="mt-3 text-3xl font-black text-[#003d5b] md:text-4xl">
              How it works
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {[
              ["01", "Submit Complaint", "Provide complaint details and evidence."],
              [
                "02",
                "Verification",
                "Complaint information is reviewed and verified.",
              ],
              [
                "03",
                "Department Review",
                "Complaint is forwarded to the relevant department.",
              ],
              [
                "04",
                "Resolution & Feedback",
                "Receive resolution and provide your feedback.",
              ],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="relative rounded-2xl border border-slate-200 p-7"
              >
                <div className="text-5xl font-black text-cyan-100">{number}</div>
                <h3 className="mt-4 text-lg font-black text-[#003d5b]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESCALATION */}
      <section className="bg-gradient-to-r from-[#003d5b] to-[#006d92] py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
              <BellRing size={17} className="text-cyan-300" />
              Smart Escalation Workflow
            </div>

            <h2 className="mt-5 text-3xl font-black md:text-4xl">
              Complaints should never disappear into the system.
            </h2>

            <p className="mt-5 max-w-2xl leading-8 text-slate-200">
              Pending and high-priority complaints can be monitored through
              automated escalation rules, reminders and administrative review.
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-7 backdrop-blur">
            <p className="text-sm font-semibold text-cyan-200">
              Escalation Path
            </p>

            <div className="mt-5 space-y-4">
              {[
                "Concerned Department",
                "Department Head",
                "University Administration",
                "Vice Chancellor Secretariat",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-xl bg-white/10 p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400 font-black text-[#003d5b]">
                    {index + 1}
                  </div>
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FUTURE LIVE ANALYTICS */}
      <section className="bg-[#f5f9fc] py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [FilePlus2, "Live Complaints", "Connected with database"],
              [CircleCheckBig, "Resolution Tracking", "Live status updates"],
              [Clock3, "SLA Monitoring", "Automated reminders"],
              [BarChart3, "Analytics", "Department performance"],
            ].map(([Icon, title, subtitle]) => {
              const ItemIcon = Icon as typeof FilePlus2;

              return (
                <div
                  key={title as string}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <ItemIcon className="text-[#008bb5]" />
                  <h3 className="mt-4 font-black text-[#003d5b]">
                    {title as string}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {subtitle as string}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-[#002f46] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-3">
          <div>
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
                <h3 className="font-black">QUEST Complaint Portal</h3>
                <p className="text-xs text-slate-300">
                  Quaid-e-Awam University, Nawabshah
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-300">
              An AI-powered complaint management, routing and escalation system
              developed as a Final Year Project.
            </p>
          </div>

          <div>
            <h3 className="font-black">Quick Links</h3>
            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-300">
              <a href="#" className="hover:text-white">
                Home
              </a>
              <a href="/submit-complaint" className="hover:text-white">
                Submit Complaint
              </a>
              <a href="/track-complaint" className="hover:text-white">
                Track Complaint
              </a>
              <a href="#categories" className="hover:text-white">
                Complaint Categories
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-black">University</h3>

            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div className="flex gap-3">
                <MapPin size={18} className="shrink-0 text-cyan-300" />
                Nawabshah, Sindh, Pakistan
              </div>

              <div className="flex gap-3">
                <Mail size={18} className="shrink-0 text-cyan-300" />
                Official contact details will be configured
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-slate-400 md:flex-row md:justify-between">
            <p>QUEST Complaint Portal — Final Year Project</p>
            <p>Academic prototype — Not an official QUEST service.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}