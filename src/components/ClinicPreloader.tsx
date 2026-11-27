"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CLINIC_INFO } from "@/data/clinic";
import { prefersReducedMotion } from "@/lib/gsap-motion";

interface ClinicPreloaderProps {
  onComplete?: () => void;
}

export function ClinicPreloader({ onComplete }: ClinicPreloaderProps) {
  const [done, setDone] = useState(false);
  const [percent, setPercent] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const innerRingRef = useRef<SVGCircleElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDone(true);
      onCompleteRef.current?.();
      return;
    }

    const root = rootRef.current;
    if (!root) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const counter = { value: 0 };

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          document.body.style.overflow = prevOverflow;
          setDone(true);
          onCompleteRef.current?.();
        },
      });

      if (ringRef.current) {
        const circumference = 2 * Math.PI * 36;
        gsap.set(ringRef.current, {
          strokeDasharray: circumference,
          strokeDashoffset: circumference,
        });
        tl.to(
          ringRef.current,
          {
            strokeDashoffset: 0,
            duration: 0.78,
            ease: "power2.inOut",
          },
          0
        );
      }

      if (innerRingRef.current) {
        tl.fromTo(
          innerRingRef.current,
          { scale: 0.55, opacity: 0.2, transformOrigin: "50% 50%" },
          {
            scale: 1,
            opacity: 1,
            duration: 0.72,
            ease: "power3.out",
          },
          0.08
        );
      }

      if (barRef.current) {
        tl.fromTo(
          barRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.82,
            ease: "power2.inOut",
          },
          0
        );
      }

      tl.to(
        counter,
        {
          value: 100,
          duration: 0.82,
          ease: "power2.inOut",
          onUpdate: () => setPercent(Math.round(counter.value)),
        },
        0
      );

      if (innerRef.current) {
        tl.to(
          innerRef.current,
          {
            opacity: 0,
            y: -14,
            duration: 0.28,
            ease: "power2.in",
          },
          0.86
        );
      }

      tl.to(
        root,
        {
          yPercent: -100,
          duration: 0.52,
          ease: "power3.inOut",
        },
        0.94
      );
    }, root);

    return () => {
      document.body.style.overflow = prevOverflow;
      ctx.revert();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="clinic-preloader"
      role="status"
      aria-label="Loading Bramwell Eye Clinic"
      data-cursor-theme="dark"
    >
      <div ref={innerRef} className="preloader-inner">
        <div className="preloader-reticle" aria-hidden="true">
          <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
            <circle
              cx="44"
              cy="44"
              r="36"
              stroke="rgba(247, 246, 242, 0.14)"
              strokeWidth="1.5"
            />
            <circle
              ref={ringRef}
              cx="44"
              cy="44"
              r="36"
              stroke="#82c6c7"
              strokeWidth="1.75"
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
            />
            <circle
              ref={innerRingRef}
              cx="44"
              cy="44"
              r="14"
              stroke="#f7f6f2"
              strokeWidth="1.5"
            />
            <circle cx="44" cy="44" r="3" fill="#82c6c7" />
          </svg>
        </div>

        <p className="preloader-brand">{CLINIC_INFO.name}</p>
        <p className="preloader-district">{CLINIC_INFO.district}</p>

        <div className="preloader-bar-wrap">
          <div className="preloader-bar-track">
            <div ref={barRef} className="preloader-bar-fill" />
          </div>
          <span className="preloader-percent">{String(percent).padStart(3, "0")}%</span>
        </div>
      </div>
    </div>
  );
}
