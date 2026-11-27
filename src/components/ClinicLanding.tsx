"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check } from "lucide-react";
import {
  CLINIC_INFO,
  CLINICAL_SERVICES,
  DIAGNOSTIC_INSTRUMENTS,
  CLINICIAN_ROLES,
} from "@/data/clinic";
import { ClinicHeader } from "@/components/ClinicHeader";
import { ClinicPreloader } from "@/components/ClinicPreloader";
import { EyeStorySection } from "@/components/EyeStorySection";
import { BookingBand } from "@/components/BookingBand";
import { OpticalCursor } from "@/components/OpticalCursor";
import { FloatingAssistants } from "@/components/FloatingAssistants";
import {
  bindButtonPress,
  bindHoverLift,
  bindPhotoZoom,
  prefersReducedMotion,
  resetHoverLift,
  resetPhotoZoom,
} from "@/lib/gsap-motion";

gsap.registerPlugin(ScrollTrigger);

export function ClinicLanding() {
  const [activeServiceId, setActiveServiceId] = useState<string>(CLINICAL_SERVICES[0].id);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const protocolRef = useRef<HTMLDivElement | null>(null);

  const activeService =
    CLINICAL_SERVICES.find((item) => item.id === activeServiceId) ?? CLINICAL_SERVICES[0];

  // Hero entrance synced cleanly when preloader lifts
  useEffect(() => {
    if (!preloaderDone) return;
    const heroEl = heroRef.current;
    if (!heroEl) return;

    ScrollTrigger.refresh();

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const items = heroEl.querySelectorAll("[data-hero-stagger]");
        const photo = heroEl.querySelector("[data-hero-photo] img");

        gsap.fromTo(
          items,
          { y: 24, opacity: 0.01 },
          {
            y: 0,
            opacity: 1,
            duration: 0.65,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "transform,opacity",
          }
        );

        if (photo) {
          gsap.fromTo(
            photo,
            { scale: 1.07 },
            {
              scale: 1,
              duration: 1.0,
              ease: "power2.out",
              clearProps: "transform",
            }
          );
        }
      }, heroEl);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, [preloaderDone]);

  // Continuous ScrollTrigger choreography across all sections (respects reduced motion)
  useEffect(() => {
    const pageEl = pageRef.current;
    const heroEl = heroRef.current;
    if (!pageEl || !heroEl) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const photo = heroEl.querySelector("[data-hero-photo] img");
        const heroOverlay = heroEl.querySelector(".hero-overlay-content");

        if (photo) {
          gsap.to(photo, {
            scale: 1.1,
            yPercent: 12,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        if (heroOverlay) {
          gsap.to(heroOverlay, {
            y: -36,
            opacity: 0.25,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "20% top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        // Scroll progress hairline inside header
        const progressEl = pageEl.querySelector("[data-scroll-progress]");
        if (progressEl) {
          gsap.to(progressEl, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: pageEl,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.18,
            },
          });
        }

        // Section-level editorial reveal animations (re-plays smoothly on scroll)
        const revealEls = gsap.utils.toArray<HTMLElement>("[data-scroll-reveal]", pageEl);
        revealEls.forEach((el) => {
          gsap.fromTo(
            el,
            { y: 36, opacity: 0.01 },
            {
              y: 0,
              opacity: 1,
              duration: 0.72,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 86%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });

        // Staggered card, instrument, and hours row choreography
        const groups = gsap.utils.toArray<HTMLElement>("[data-scroll-group]", pageEl);
        groups.forEach((group) => {
          const children = group.querySelectorAll("[data-scroll-item]");
          if (!children.length) return;
          gsap.fromTo(
            children,
            { y: 30, scale: 0.97, opacity: 0.01 },
            {
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 0.62,
              stagger: 0.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: group,
                start: "top 84%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });

        // Optical shutter frame reveal + scrubbed image depth parallax
        const scrollPhotos = gsap.utils.toArray<HTMLElement>("[data-scroll-photo]", pageEl);
        scrollPhotos.forEach((frame) => {
          gsap.fromTo(
            frame,
            { clipPath: "inset(10% 0% 0% 0%)", opacity: 0.4 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              opacity: 1,
              duration: 0.85,
              ease: "power3.out",
              scrollTrigger: {
                trigger: frame,
                start: "top 86%",
                toggleActions: "play none none reverse",
              },
            }
          );

          const img = frame.querySelector("img");
          if (!img) return;
          gsap.fromTo(
            img,
            { yPercent: -6, scale: 1.08 },
            {
              yPercent: 6,
              scale: 1.08,
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.75,
              },
            }
          );
        });
      }, pageEl);

      return () => ctx.revert();
    });

    const onWinLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onWinLoad);

    return () => {
      window.removeEventListener("load", onWinLoad);
      mm.revert();
    };
  }, []);

  const handleSelectService = (id: string) => {
    if (id === activeServiceId) return;
    setActiveServiceId(id);

    if (protocolRef.current && !prefersReducedMotion()) {
      gsap.fromTo(
        protocolRef.current,
        { opacity: 0.45, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: "power2.out",
          clearProps: "transform,opacity",
        }
      );
    }
  };

  return (
    <div id="top" ref={pageRef}>
      <ClinicPreloader onComplete={() => setPreloaderDone(true)} />
      <OpticalCursor />
      <ClinicHeader />

      <main>
        {/* Screen 1: Full-Bleed Background Image Hero */}
        <section
          ref={heroRef}
          className="hero-screen"
          aria-labelledby="hero-heading"
          data-cursor-theme="dark"
        >
          <div className="hero-bg-media" data-hero-photo aria-hidden="true">
            <img
              src="/images/hero-clinic.jpg"
              alt=""
              width={1440}
              height={1080}
              loading="eager"
            />
            <div className="hero-bg-scrim" />
          </div>

          <div className="wrap hero-overlay-content">
            <div className="hero-editorial-top">
              <div className="hero-title-col">
                <p className="eyebrow" data-hero-stagger>
                  {CLINIC_INFO.district}
                </p>

                <h1 id="hero-heading" className="h1-display" data-hero-stagger>
                  Medical eye care and vision surgery in Marylebone.
                </h1>
              </div>

              <div className="hero-summary-col">
                <p className="lead-copy" data-hero-stagger>
                  Consultant-led cataract and refractive surgery, retinal OCT diagnostics,
                  and unhurried primary optometry under one roof.
                </p>

                <div className="hero-actions" data-hero-stagger>
                  <a
                    href="#book"
                    className="btn btn-band-primary"
                    onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
                    onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
                    onPointerLeave={(e) => bindButtonPress(e.currentTarget, false)}
                  >
                    <span>Book an exam</span>
                    <ArrowRight size={16} />
                  </a>

                  <a
                    href="#story"
                    className="btn btn-hero-ghost"
                    onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
                    onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
                    onPointerLeave={(e) => bindButtonPress(e.currentTarget, false)}
                  >
                    Explore 3D anatomy
                  </a>
                </div>
              </div>
            </div>

            <div className="hero-spec-strip" data-hero-stagger>
              <span className="hero-spec-item">
                <span className="hero-fact-dot" aria-hidden="true" />
                <span>Same-week retinal OCT scans</span>
              </span>
              <span className="hero-spec-item">
                <span className="hero-fact-dot" aria-hidden="true" />
                <span>45-minute primary examinations</span>
              </span>
              <span className="hero-spec-item mono-meta">
                Mon – Sat · Direct consultant review
              </span>
            </div>
          </div>
        </section>

        {/* Screen 2: Interactive 3D Eye Anatomy Storytelling */}
        <EyeStorySection />

        {/* Screen 3: Clinical Services & Protocol Selector */}
        <section
          id="treatments"
          className="section-screen"
          aria-labelledby="treatments-heading"
        >
          <div className="wrap">
            <div className="section-head" data-scroll-reveal>
              <div>
                <p className="eyebrow">Ophthalmology &amp; Optometry</p>
                <h2 id="treatments-heading" className="h2-section" style={{ marginTop: "10px" }}>
                  Clinical services
                </h2>
              </div>
              <p className="lead-copy">
                Select a clinical pathway to inspect appointment duration, baseline
                imaging, and follow-up schedule.
              </p>
            </div>

            <div className="services-layout">
              <div
                className="service-list"
                role="group"
                aria-label="Clinical pathways"
                data-scroll-group
              >
                {CLINICAL_SERVICES.map((service) => {
                  const isActive = service.id === activeServiceId;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      className="service-card"
                      data-scroll-item
                      aria-pressed={isActive}
                      onClick={() => handleSelectService(service.id)}
                      onMouseEnter={(e) => bindHoverLift(e.currentTarget)}
                      onMouseLeave={(e) => resetHoverLift(e.currentTarget)}
                    >
                      <div>
                        <span className="mono-meta" style={{ display: "block", marginBottom: "8px" }}>
                          {service.code}
                        </span>
                        <h3 className="service-card-title">{service.title}</h3>
                      </div>
                      <p className="service-card-summary">{service.summary}</p>
                    </button>
                  );
                })}
              </div>

              <div className="protocol-panel" aria-live="polite" data-scroll-reveal>
                <div ref={protocolRef}>
                  <span className="mono-meta">{activeService.code} PROTOCOL</span>
                  <h3
                    style={{
                      margin: "8px 0 10px 0",
                      fontSize: "1.55rem",
                      fontFamily: "var(--font-display), Georgia, serif",
                      fontWeight: 400,
                    }}
                  >
                    {activeService.title}
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
                    {activeService.summary}
                  </p>

                  <div className="protocol-meta-grid" style={{ marginTop: "20px" }}>
                    <div>
                      <span className="protocol-meta-label">Visit duration</span>
                      <span className="protocol-meta-val">{activeService.duration}</span>
                    </div>
                    <div>
                      <span className="protocol-meta-label">Included imaging</span>
                      <span className="protocol-meta-val">{activeService.imaging}</span>
                    </div>
                    <div>
                      <span className="protocol-meta-label">Clinical lead</span>
                      <span className="protocol-meta-val">{activeService.leadRole}</span>
                    </div>
                    <div>
                      <span className="protocol-meta-label">Follow-up care</span>
                      <span className="protocol-meta-val">{activeService.followUp}</span>
                    </div>
                  </div>

                  <ul className="protocol-list" style={{ marginTop: "20px" }}>
                    {activeService.indications.map((point) => (
                      <li key={point}>
                        <Check
                          size={16}
                          style={{ marginTop: "4px", flexShrink: 0, color: "var(--accent)" }}
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ paddingTop: "8px" }}>
                  <a
                    href="#book"
                    className="btn btn-primary"
                    onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
                    onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
                    onPointerLeave={(e) => bindButtonPress(e.currentTarget, false)}
                  >
                    <span>Book {activeService.title.toLowerCase()}</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Screen 3: Diagnostic Imaging Suite */}
        <section
          id="diagnostics"
          className="section-screen"
          aria-labelledby="diagnostics-heading"
        >
          <div className="wrap">
            <div className="section-head" data-scroll-reveal>
              <div>
                <p className="eyebrow">In-house instrumentation</p>
                <h2 id="diagnostics-heading" className="h2-section" style={{ marginTop: "10px" }}>
                  Diagnostic imaging
                </h2>
              </div>
              <p className="lead-copy">
                Every adult consultation includes high-resolution non-contact imaging so
                retinal and corneal measurements are reviewed directly in room.
              </p>
            </div>

            <div className="diagnostics-grid">
              <div className="instrument-list" data-scroll-group>
                {DIAGNOSTIC_INSTRUMENTS.map((inst) => (
                  <div key={inst.code} className="instrument-row" data-scroll-item>
                    <span className="mono-meta" style={{ color: "var(--accent)" }}>
                      {inst.code}
                    </span>
                    <div>
                      <h3 className="instrument-title">{inst.name}</h3>
                      <p className="instrument-desc">{inst.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="diagnostics-photos">
                <div
                  className="photo-frame diagnostics-photo-main"
                  data-scroll-photo
                  data-cursor="inspect"
                  onMouseEnter={(e) => bindPhotoZoom(e.currentTarget, 1.07)}
                  onMouseLeave={(e) => bindPhotoZoom(e.currentTarget, 1.05)}
                >
                  <img
                    src="/images/diagnostic-oct.jpg"
                    alt="Retinal Optical Coherence Tomography and corneal imaging workstation inside clinic diagnostics room"
                    width={1200}
                    height={750}
                    loading="lazy"
                  />
                </div>
                <div
                  className="photo-frame diagnostics-photo-sub"
                  data-scroll-photo
                  data-cursor="inspect"
                  onMouseEnter={(e) => bindPhotoZoom(e.currentTarget, 1.07)}
                  onMouseLeave={(e) => bindPhotoZoom(e.currentTarget, 1.05)}
                >
                  <img
                    src="/images/consultation-suite.jpg"
                    alt="Precision ophthalmic phoropter refractor with calibrated glass lenses"
                    width={1200}
                    height={675}
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Screen 4: Clinicians & Optical Dispensary */}
        <section
          id="clinicians"
          className="section-screen"
          aria-labelledby="clinicians-heading"
        >
          <div className="wrap">
            <div className="section-head" data-scroll-reveal>
              <div>
                <p className="eyebrow">Consultants &amp; Optical Fitting</p>
                <h2 id="clinicians-heading" className="h2-section" style={{ marginTop: "10px" }}>
                  Consultation and eyewear
                </h2>
              </div>
              <p className="lead-copy">
                Surgical consultants, medical optometrists, and dispensing specialists
                share one clinical record from diagnostic scan to final lens fitting.
              </p>
            </div>

            <div className="clinicians-grid">
              <div
                className="photo-frame clinician-photo"
                data-scroll-photo
                data-cursor="inspect"
                onMouseEnter={(e) => bindPhotoZoom(e.currentTarget, 1.07)}
                onMouseLeave={(e) => bindPhotoZoom(e.currentTarget, 1.05)}
              >
                <img
                  src="/images/optical-dispensary.jpg"
                  alt="Titanium and acetate prescription eyewear frames arranged on honed limestone table"
                  width={1200}
                  height={900}
                  loading="lazy"
                />
              </div>

              <div className="clinician-stack" data-scroll-group>
                {CLINICIAN_ROLES.map((person) => (
                  <article
                    key={person.name}
                    className="clinician-card"
                    data-scroll-item
                    onMouseEnter={(e) => bindHoverLift(e.currentTarget)}
                    onMouseLeave={(e) => resetHoverLift(e.currentTarget)}
                  >
                    <div className="clinician-top">
                      <h3 className="clinician-name">{person.name}</h3>
                      <span className="mono-meta">{person.schedule}</span>
                    </div>
                    <p
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "0.86rem",
                        fontWeight: 600,
                        color: "var(--accent)",
                      }}
                    >
                      {person.role}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--muted)" }}>
                      {person.focus}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Screen 5: Booking Band */}
        <BookingBand selectedServiceId={activeServiceId} />
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <div>
            <strong style={{ color: "var(--ink)" }}>{CLINIC_INFO.name}</strong> ·{" "}
            {CLINIC_INFO.district} · {CLINIC_INFO.email}
          </div>

          <nav className="footer-links" aria-label="Footer navigation">
            <a href="#treatments">Treatments</a>
            <a href="#diagnostics">Diagnostics</a>
            <a href="#clinicians">Clinicians</a>
            <a href="#book">Appointments</a>
            <a href="/admin">Clinic Admin</a>
          </nav>

          <div className="footer-credit">
            Clinic interiors and diagnostic instrument imagery generated as stand-in visuals for Bramwell Eye Clinic.
          </div>
        </div>
      </footer>

      <FloatingAssistants />
    </div>
  );
}
