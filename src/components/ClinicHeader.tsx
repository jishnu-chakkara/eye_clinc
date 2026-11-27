"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { CLINIC_INFO } from "@/data/clinic";
import { ApertureMark } from "@/components/ApertureMark";
import { bindButtonPress, prefersReducedMotion } from "@/lib/gsap-motion";

const NAV_ITEMS = [
  { href: "#story", label: "3D Anatomy" },
  { href: "#treatments", label: "Treatments" },
  { href: "#diagnostics", label: "Diagnostics" },
  { href: "#clinicians", label: "Clinicians" },
  { href: "#book", label: "Hours" },
];

export function ClinicHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          drawer,
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: 0.24, ease: "power2.out" }
        );
      }
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const handleUnderline = (el: HTMLElement, active: boolean) => {
    const line = el.querySelector<HTMLElement>(".nav-underline");
    if (!line || prefersReducedMotion()) return;
    gsap.to(line, {
      scaleX: active ? 1 : 0,
      duration: 0.22,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  return (
    <>
      <header className={`site-header ${drawerOpen ? "is-menu-open" : ""}`}>
        <div className="wrap header-inner">
          <a href="#top" className="brand-link" aria-label={CLINIC_INFO.name}>
            <ApertureMark />
            <span>{CLINIC_INFO.name}</span>
          </a>

          <nav className="nav-links" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="nav-link"
                onMouseEnter={(e) => handleUnderline(e.currentTarget, true)}
                onMouseLeave={(e) => handleUnderline(e.currentTarget, false)}
                onFocus={(e) => handleUnderline(e.currentTarget, true)}
                onBlur={(e) => handleUnderline(e.currentTarget, false)}
              >
                {item.label}
                <span className="nav-underline" aria-hidden="true" />
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <a
              href="#book"
              className="btn btn-primary btn-sm header-desktop-cta"
              onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
              onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
              onPointerLeave={(e) => bindButtonPress(e.currentTarget, false)}
            >
              Book an exam
            </a>

            <button
              type="button"
              className="menu-toggle"
              aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((prev) => !prev)}
            >
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div className="scroll-progress-track" aria-hidden="true">
          <div className="scroll-progress-fill" data-scroll-progress />
        </div>
      </header>

      {drawerOpen && (
        <div ref={drawerRef} className="mobile-drawer" role="dialog" aria-label="Mobile menu">
          <div className="mobile-nav-list">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="mobile-nav-link"
                onClick={() => setDrawerOpen(false)}
              >
                <span>{item.label}</span>
                <ArrowUpRight size={18} />
              </a>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p className="mono-meta" style={{ margin: 0 }}>
              {CLINIC_INFO.district} · {CLINIC_INFO.email}
            </p>
            <a
              href="#book"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setDrawerOpen(false)}
            >
              Book an exam
            </a>
          </div>
        </div>
      )}
    </>
  );
}
