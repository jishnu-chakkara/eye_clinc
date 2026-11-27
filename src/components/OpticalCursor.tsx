"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/gsap-motion";

type CursorMode = "default" | "interactive" | "inspect" | "orbit" | "input";

export function OpticalCursor() {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<CursorMode>("default");
  const [darkSurface, setDarkSurface] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const finePointer = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    if (!finePointer || prefersReducedMotion()) return;

    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    document.documentElement.classList.add("has-optical-cursor");

    gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });

    const xRing = gsap.quickTo(ring, "x", { duration: 0.24, ease: "power3.out" });
    const yRing = gsap.quickTo(ring, "y", { duration: 0.24, ease: "power3.out" });
    const xDot = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2.out" });
    const yDot = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2.out" });

    const resolveTargetMode = (target: EventTarget | null): { mode: CursorMode; dark: boolean } => {
      if (!(target instanceof Element)) return { mode: "default", dark: false };

      const dark = Boolean(target.closest("[data-cursor-theme='dark']"));

      if (target.closest("input, textarea, select")) {
        return { mode: "input", dark };
      }
      if (target.closest("[data-cursor='orbit']")) {
        return { mode: "orbit", dark };
      }
      if (target.closest("[data-cursor='inspect']")) {
        return { mode: "inspect", dark };
      }
      if (target.closest("a, button, [role='button']")) {
        return { mode: "interactive", dark };
      }
      return { mode: "default", dark };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setVisible(true);
      xRing(e.clientX);
      yRing(e.clientY);
      xDot(e.clientX);
      yDot(e.clientY);

      const next = resolveTargetMode(e.target);
      setMode(next.mode);
      setDarkSurface(next.dark);
    };

    const onPointerDown = () => {
      gsap.to(ring, { scale: 0.84, duration: 0.12, ease: "power2.out", overwrite: "auto" });
    };

    const onPointerUp = () => {
      gsap.to(ring, { scale: 1, duration: 0.18, ease: "power2.out", overwrite: "auto" });
    };

    const onPointerLeave = () => {
      setVisible(false);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      document.documentElement.classList.remove("has-optical-cursor");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const ring = ringRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!ring || !dot) return;

    if (mode === "input") {
      gsap.to([ring, dot], { opacity: 0, duration: 0.14, overwrite: "auto" });
      return;
    }

    const targetOpacity = visible ? 1 : 0;

    if (mode === "inspect" || mode === "orbit") {
      gsap.to(ring, {
        width: 58,
        height: 58,
        opacity: targetOpacity,
        duration: 0.24,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.to(dot, { scale: 0.5, opacity: targetOpacity, duration: 0.2, overwrite: "auto" });
      if (label) {
        gsap.to(label, { opacity: 1, duration: 0.18, overwrite: "auto" });
      }
    } else if (mode === "interactive") {
      gsap.to(ring, {
        width: 34,
        height: 34,
        opacity: targetOpacity,
        duration: 0.2,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(dot, { scale: 1.35, opacity: targetOpacity, duration: 0.18, overwrite: "auto" });
      if (label) {
        gsap.to(label, { opacity: 0, duration: 0.12, overwrite: "auto" });
      }
    } else {
      gsap.to(ring, {
        width: 22,
        height: 22,
        opacity: targetOpacity,
        duration: 0.2,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(dot, { scale: 1, opacity: targetOpacity, duration: 0.18, overwrite: "auto" });
      if (label) {
        gsap.to(label, { opacity: 0, duration: 0.12, overwrite: "auto" });
      }
    }
  }, [enabled, visible, mode]);

  if (!enabled) return null;

  return (
    <div
      className={`optical-cursor-layer ${darkSurface ? "is-dark-surface" : ""}`}
      aria-hidden="true"
    >
      <div
        ref={ringRef}
        className={`optical-cursor-ring ${
          mode === "inspect" || mode === "orbit" ? "is-inspect" : ""
        } ${mode === "interactive" ? "is-interactive" : ""}`}
      >
        <span ref={labelRef} className="optical-cursor-label">
          {mode === "orbit" ? "ORBIT" : "VIEW"}
        </span>
      </div>
      <div ref={dotRef} className="optical-cursor-dot" />
    </div>
  );
}
