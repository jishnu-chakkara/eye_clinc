"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ApertureMark } from "@/components/ApertureMark";
import { CLINIC_INFO } from "@/data/clinic";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

interface AdminAppointment {
  id: number;
  bookingRef: string;
  patient_name: string;
  patient_email: string;
  service_id: string;
  service_title: string;
  preferred_window: string;
  notes: string;
  status: AppointmentStatus;
  created_at: string;
}

interface AppointmentSummary {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

interface AdminFaq {
  id: number;
  topic: string;
  keywords: string;
  reply_text: string;
  action_href: string;
  action_label: string;
  is_active: number;
  updated_at: string;
}

interface AdminChatLog {
  id: number;
  session_id: string;
  user_message: string;
  bot_reply: string;
  matched_topic: string;
  created_at: string;
}

function formatIsoTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminDashboard() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<"appointments" | "logs" | "faqs">(
    "appointments"
  );
  const [loadingData, setLoadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [summary, setSummary] = useState<AppointmentSummary>({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });
  const [chatLogs, setChatLogs] = useState<AdminChatLog[]>([]);
  const [faqs, setFaqs] = useState<AdminFaq[]>([]);

  // New FAQ form
  const [newTopic, setNewTopic] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newReply, setNewReply] = useState("");
  const [newHref, setNewHref] = useState("#book");
  const [newLabel, setNewLabel] = useState("Book an examination");
  const [faqError, setFaqError] = useState("");
  const [creatingFaq, setCreatingFaq] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const [apptRes, chatRes] = await Promise.all([
        fetch(`/api/appointments?${params.toString()}`),
        fetch("/api/chatbot"),
      ]);

      if (apptRes.status === 401 || chatRes.status === 401) {
        setAuthenticated(false);
        return;
      }

      if (apptRes.ok) {
        const apptData = (await apptRes.json()) as {
          appointments: AdminAppointment[];
          summary: AppointmentSummary;
        };
        setAppointments(apptData.appointments);
        setSummary(apptData.summary);
      }

      if (chatRes.ok) {
        const chatData = (await chatRes.json()) as {
          faqs: AdminFaq[];
          logs: AdminChatLog[];
        };
        setFaqs(chatData.faqs);
        setChatLogs(chatData.logs);
      }
    } finally {
      setLoadingData(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/admin/session");
        const data = (await res.json()) as { authenticated?: boolean };
        setAuthenticated(Boolean(data.authenticated));
      } finally {
        setAuthChecked(true);
      }
    }
    void checkSession();
  }, []);

  useEffect(() => {
    if (authenticated) {
      void loadDashboardData();
    }
  }, [authenticated, loadDashboardData]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAuthError(data.error || "Sign-in failed.");
        return;
      }
      setPasscode("");
      setAuthenticated(true);
    } catch {
      setAuthError("Network error during sign-in.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
  };

  const handleStatusChange = async (id: number, status: AppointmentStatus) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await loadDashboardData();
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadDashboardData();
    }
  };

  const handleCreateFaq = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFaqError("");
    if (!newTopic.trim() || !newKeywords.trim() || !newReply.trim()) {
      setFaqError("Topic, keywords, and reply text are required.");
      return;
    }

    setCreatingFaq(true);
    try {
      const res = await fetch("/api/chatbot/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: newTopic.trim(),
          keywords: newKeywords.trim(),
          replyText: newReply.trim(),
          actionHref: newHref.trim(),
          actionLabel: newLabel.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFaqError(data.error || "Could not create FAQ rule.");
        return;
      }
      setNewTopic("");
      setNewKeywords("");
      setNewReply("");
      await loadDashboardData();
    } finally {
      setCreatingFaq(false);
    }
  };

  const handleToggleFaq = async (faq: AdminFaq) => {
    const res = await fetch(`/api/chatbot/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: faq.is_active === 0 }),
    });
    if (res.ok) {
      await loadDashboardData();
    }
  };

  const handleDeleteFaq = async (id: number) => {
    const res = await fetch(`/api/chatbot/faqs/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadDashboardData();
    }
  };

  if (!authChecked) {
    return (
      <div className="admin-shell">
        <div className="wrap admin-loading">Checking clinic session...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="wrap admin-topbar-inner">
            <Link href="/" className="brand-link">
              <ApertureMark />
              <span>{CLINIC_INFO.name}</span>
            </Link>
            <Link href="/" className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} />
              <span>Back to clinic</span>
            </Link>
          </div>
        </header>

        <main className="admin-login-main">
          <div className="admin-login-card">
            <div className="admin-login-badge">
              <Lock size={15} />
              <span>SQLite Clinic Administration</span>
            </div>
            <h1 className="h2-section" style={{ marginTop: "12px" }}>
              Reception &amp; Chatbot Console
            </h1>
            <p className="lead-copy" style={{ marginTop: "8px", fontSize: "0.94rem" }}>
              Sign in to review patient appointment requests, manage confirmation
              statuses, and configure chatbot responses stored in SQLite.
            </p>

            <form onSubmit={handleLogin} style={{ marginTop: "22px" }}>
              <label htmlFor="admin-passcode" className="admin-field-label">
                Admin passcode
              </label>
              <input
                id="admin-passcode"
                type="password"
                required
                className="admin-input"
                placeholder="Enter admin passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />

              {authError && (
                <p role="alert" className="admin-error-text">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "14px" }}
              >
                {authSubmitting ? "Verifying..." : "Sign in to admin"}
              </button>
            </form>

            <p className="mono-meta" style={{ marginTop: "16px", marginBottom: 0 }}>
              Default local passcode: <code>bramwell-admin</code> (override with{" "}
              <code>ADMIN_PASSCODE</code>)
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="wrap admin-topbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/" className="brand-link">
              <ApertureMark />
              <span>{CLINIC_INFO.name}</span>
            </Link>
            <span className="mono-meta admin-env-pill">SQLite Admin</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link href="/" className="btn btn-secondary btn-sm">
              <ArrowLeft size={14} />
              <span>Public site</span>
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="wrap admin-main">
        {/* KPI Row */}
        <section className="admin-kpi-grid" aria-label="Clinic summary metrics">
          <div className="admin-kpi-card">
            <span className="mono-meta">TOTAL APPOINTMENTS</span>
            <strong className="admin-kpi-value">{summary.total}</strong>
          </div>
          <div className="admin-kpi-card">
            <span className="mono-meta">PENDING REVIEW</span>
            <strong className="admin-kpi-value" style={{ color: "var(--accent)" }}>
              {summary.pending}
            </strong>
          </div>
          <div className="admin-kpi-card">
            <span className="mono-meta">CONFIRMED VISITS</span>
            <strong className="admin-kpi-value">{summary.confirmed}</strong>
          </div>
          <div className="admin-kpi-card">
            <span className="mono-meta">CHATBOT LOGS</span>
            <strong className="admin-kpi-value">{chatLogs.length}</strong>
          </div>
        </section>

        {/* Tab Bar */}
        <div className="admin-toolbar">
          <div className="admin-tabs" role="tablist" aria-label="Admin workspace sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "appointments"}
              className={`admin-tab-btn ${activeTab === "appointments" ? "is-active" : ""}`}
              onClick={() => setActiveTab("appointments")}
            >
              <CalendarCheck size={15} />
              <span>Appointments ({summary.total})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "logs"}
              className={`admin-tab-btn ${activeTab === "logs" ? "is-active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              <MessageSquare size={15} />
              <span>Chatbot Logs ({chatLogs.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "faqs"}
              className={`admin-tab-btn ${activeTab === "faqs" ? "is-active" : ""}`}
              onClick={() => setActiveTab("faqs")}
            >
              <span>Chatbot FAQs ({faqs.length})</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void loadDashboardData()}
            disabled={loadingData}
          >
            <RefreshCw size={14} />
            <span>{loadingData ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Tab 1: Appointments */}
        {activeTab === "appointments" && (
          <section className="admin-panel" aria-label="Patient appointments">
            <div className="admin-filter-bar">
              <input
                type="search"
                className="admin-input admin-search-input"
                placeholder="Search by patient name, email, service, or ref (BW-...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="admin-status-pills">
                {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      className={`admin-filter-pill ${
                        statusFilter === st ? "is-active" : ""
                      }`}
                      onClick={() => setStatusFilter(st)}
                    >
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>

            {appointments.length === 0 ? (
              <div className="admin-empty">
                No appointments match the current filter. Submit a request from the
                landing page booking form to test live persistence.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Patient</th>
                      <th>Service &amp; Window</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((item) => (
                      <tr key={item.id}>
                        <td className="mono-meta" style={{ color: "var(--ink)" }}>
                          {item.bookingRef}
                        </td>
                        <td>
                          <strong>{item.patient_name}</strong>
                          <div className="mono-meta">{item.patient_email}</div>
                        </td>
                        <td>
                          <div>{item.service_title}</div>
                          <div className="mono-meta">{item.preferred_window}</div>
                        </td>
                        <td className="admin-notes-cell">
                          {item.notes || <span className="mono-meta">—</span>}
                        </td>
                        <td>
                          <select
                            aria-label={`Status for ${item.patient_name}`}
                            className={`admin-status-select is-${item.status}`}
                            value={item.status}
                            onChange={(e) =>
                              void handleStatusChange(
                                item.id,
                                e.target.value as AppointmentStatus
                              )
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="mono-meta">{formatIsoTime(item.created_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-icon-btn"
                            aria-label={`Delete appointment ${item.bookingRef}`}
                            onClick={() => void handleDeleteAppointment(item.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Chatbot Logs */}
        {activeTab === "logs" && (
          <section className="admin-panel" aria-label="Patient chatbot logs">
            {chatLogs.length === 0 ? (
              <div className="admin-empty">
                No chatbot messages recorded yet. Open the floating Clinic Assistant on
                the homepage and send a question to log entries here.
              </div>
            ) : (
              <div className="admin-log-list">
                {chatLogs.map((log) => (
                  <article key={log.id} className="admin-log-card">
                    <div className="admin-log-top">
                      <span className="mono-meta" style={{ color: "var(--accent)" }}>
                        TOPIC: {log.matched_topic}
                      </span>
                      <span className="mono-meta">
                        {log.session_id} · {formatIsoTime(log.created_at)}
                      </span>
                    </div>
                    <p className="admin-log-user">
                      <strong>Patient:</strong> {log.user_message}
                    </p>
                    <p className="admin-log-bot">
                      <strong>Assistant:</strong> {log.bot_reply}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Chatbot Knowledge Base (FAQs) */}
        {activeTab === "faqs" && (
          <section className="admin-faq-grid" aria-label="Chatbot FAQ management">
            <div className="admin-panel">
              <h2 className="admin-panel-title">Add Chatbot Rule</h2>
              <form onSubmit={handleCreateFaq} className="admin-faq-form">
                <div>
                  <label htmlFor="faq-topic" className="admin-field-label">
                    Topic title
                  </label>
                  <input
                    id="faq-topic"
                    type="text"
                    required
                    className="admin-input"
                    placeholder="e.g. Dry eye clinic"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="faq-keywords" className="admin-field-label">
                    Trigger keywords (comma-separated)
                  </label>
                  <input
                    id="faq-keywords"
                    type="text"
                    required
                    className="admin-input"
                    placeholder="dry,burning,tears,meibography"
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="faq-reply" className="admin-field-label">
                    Assistant reply
                  </label>
                  <textarea
                    id="faq-reply"
                    required
                    className="admin-input"
                    style={{ minHeight: "96px", paddingTop: "10px" }}
                    placeholder="Write the clinic answer shown to patients."
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                  />
                </div>

                <div className="admin-faq-pair">
                  <div>
                    <label htmlFor="faq-href" className="admin-field-label">
                      Action anchor
                    </label>
                    <input
                      id="faq-href"
                      type="text"
                      className="admin-input"
                      value={newHref}
                      onChange={(e) => setNewHref(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="faq-label" className="admin-field-label">
                      Action link label
                    </label>
                    <input
                      id="faq-label"
                      type="text"
                      className="admin-input"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </div>
                </div>

                {faqError && <p className="admin-error-text">{faqError}</p>}

                <button
                  type="submit"
                  disabled={creatingFaq}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  <Plus size={15} />
                  <span>{creatingFaq ? "Saving..." : "Add FAQ rule"}</span>
                </button>
              </form>
            </div>

            <div className="admin-panel">
              <h2 className="admin-panel-title">Configured Knowledge Base</h2>
              <div className="admin-faq-list">
                {faqs.map((faq) => (
                  <article
                    key={faq.id}
                    className={`admin-faq-item ${faq.is_active ? "" : "is-paused"}`}
                  >
                    <div className="admin-faq-item-top">
                      <div>
                        <strong>{faq.topic}</strong>
                        <div className="mono-meta" style={{ marginTop: "2px" }}>
                          Keywords: {faq.keywords}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          className={`admin-filter-pill ${
                            faq.is_active ? "is-active" : ""
                          }`}
                          onClick={() => void handleToggleFaq(faq)}
                        >
                          {faq.is_active ? "Active" : "Paused"}
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label={`Delete FAQ ${faq.topic}`}
                          onClick={() => void handleDeleteFaq(faq.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: "10px 0 0 0", fontSize: "0.9rem", color: "var(--muted)" }}>
                      {faq.reply_text}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
