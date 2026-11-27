"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { Check, ArrowRight } from "lucide-react";
import { CLINIC_INFO, CLINICAL_SERVICES } from "@/data/clinic";
import { bindButtonPress, prefersReducedMotion } from "@/lib/gsap-motion";

interface BookingBandProps {
  selectedServiceId: string;
}

export function BookingBand({ selectedServiceId }: BookingBandProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState(selectedServiceId);
  const [windowPref, setWindowPref] = useState("Morning (08:30 – 12:00)");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const confirmationRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setService(selectedServiceId);
  }, [selectedServiceId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter your full name and a valid email address.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          serviceId: service,
          preferredWindow: windowPref,
          notes: notes.trim(),
        }),
      });

      const data = (await res.json()) as { bookingRef?: string; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error || "Unable to submit appointment request.");
        setSubmitting(false);
        return;
      }

      setBookingRef(data.bookingRef || "RECORDED");
      setSubmitted(true);

      requestAnimationFrame(() => {
        if (confirmationRef.current && !prefersReducedMotion()) {
          gsap.fromTo(
            confirmationRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }
          );
        }
      });
    } catch {
      setErrorMsg("Network error while saving your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedServiceTitle =
    CLINICAL_SERVICES.find((item) => item.id === service)?.title ??
    "Primary Eye Examination";

  return (
    <section
      id="book"
      className="booking-band"
      aria-labelledby="booking-heading"
      data-cursor-theme="dark"
    >
      <div className="wrap booking-grid">
        <div data-scroll-reveal>
          <p className="eyebrow">Appointments &amp; Hours</p>
          <h2 id="booking-heading" className="h2-section" style={{ marginTop: "12px" }}>
            Book an examination
          </h2>
          <p
            className="lead-copy"
            style={{ color: "var(--band-muted)", marginTop: "16px" }}
          >
            Appointments are arranged directly with our clinical reception on{" "}
            {CLINIC_INFO.district}. Same-week retinal OCT slots are reserved each
            morning for urgent visual changes.
          </p>

          <div className="hours-table" aria-label="Clinic opening hours" data-scroll-group>
            {CLINIC_INFO.hours.map((row) => (
              <div key={row.days} className="hours-row" data-scroll-item>
                <span>{row.days}</span>
                <span
                  className="mono-meta"
                  style={{ color: "var(--band-ink)", fontSize: "0.88rem" }}
                >
                  {row.time}
                </span>
              </div>
            ))}
            <div className="hours-row" data-scroll-item>
              <span>Clinic Reception</span>
              <span
                className="mono-meta"
                style={{ color: "var(--band-ink)", fontSize: "0.88rem" }}
              >
                {CLINIC_INFO.email}
              </span>
            </div>
          </div>

          <div className="checklist-box">
            <p className="eyebrow">What to bring to your visit</p>
            <ul className="checklist-items">
              {CLINIC_INFO.firstVisitChecklist.map((item) => (
                <li key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Check size={16} style={{ marginTop: "3px", flexShrink: 0, color: "#82c6c7" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="booking-form-card" data-scroll-reveal>
          {submitted ? (
            <div ref={confirmationRef} aria-live="polite">
              <p className="eyebrow">Reference {bookingRef}</p>
              <h3
                style={{
                  margin: "10px 0 8px 0",
                  fontSize: "1.45rem",
                  fontWeight: 500,
                  fontFamily: "var(--font-display), Georgia, serif",
                }}
              >
                Thank you, {name.trim()}
              </h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--band-muted)", fontSize: "0.95rem" }}>
                Your request for <strong>{selectedServiceTitle}</strong> ({windowPref})
                has been saved under reference <strong>{bookingRef}</strong>. Our reception
                desk manages follow-ups via {CLINIC_INFO.email}.
              </p>
              <button
                type="button"
                className="btn btn-band-primary"
                onClick={() => {
                  setSubmitted(false);
                  setNotes("");
                }}
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="patient-name" className="form-label">
                    Full name
                  </label>
                  <input
                    id="patient-name"
                    name="name"
                    type="text"
                    required
                    placeholder="Claire Bennett"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="patient-email" className="form-label">
                    Email address
                  </label>
                  <input
                    id="patient-email"
                    name="email"
                    type="email"
                    required
                    placeholder="claire.bennett@example.com"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="patient-service" className="form-label">
                    Clinical service
                  </label>
                  <select
                    id="patient-service"
                    name="service"
                    className="form-input"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                  >
                    {CLINICAL_SERVICES.map((item) => (
                      <option key={item.id} value={item.id} style={{ color: "#11161A" }}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="patient-window" className="form-label">
                    Preferred time window
                  </label>
                  <select
                    id="patient-window"
                    name="window"
                    className="form-input"
                    value={windowPref}
                    onChange={(e) => setWindowPref(e.target.value)}
                  >
                    <option value="Morning (08:30 – 12:00)" style={{ color: "#11161A" }}>
                      Morning (08:30 – 12:00)
                    </option>
                    <option value="Afternoon (12:00 – 16:00)" style={{ color: "#11161A" }}>
                      Afternoon (12:00 – 16:00)
                    </option>
                    <option value="Late clinic (16:00 – 18:00)" style={{ color: "#11161A" }}>
                      Late clinic (16:00 – 18:00)
                    </option>
                    <option value="Saturday morning (09:00 – 13:00)" style={{ color: "#11161A" }}>
                      Saturday morning (09:00 – 13:00)
                    </option>
                  </select>
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor="patient-notes" className="form-label">
                    Symptoms or referral notes (optional)
                  </label>
                  <textarea
                    id="patient-notes"
                    name="notes"
                    placeholder="Briefly describe your visual symptoms, prescription query, or referral details."
                    className="form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {errorMsg && (
                <p
                  role="alert"
                  style={{
                    margin: "12px 0 0 0",
                    fontSize: "0.88rem",
                    color: "#f4b4b4",
                  }}
                >
                  {errorMsg}
                </p>
              )}

              <div style={{ marginTop: "20px" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-band-primary"
                  onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
                  onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
                  onPointerLeave={(e) => bindButtonPress(e.currentTarget, false)}
                >
                  <span>{submitting ? "Saving request..." : "Request an appointment"}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
