"use client";

import gsap from "gsap";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function bindHoverLift(el: HTMLElement | null, yOffset = -2) {
  if (!el || prefersReducedMotion()) return;
  gsap.to(el, {
    y: yOffset,
    duration: 0.22,
    ease: "power2.out",
    overwrite: "auto",
  });
}

export function resetHoverLift(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.to(el, {
    y: 0,
    duration: 0.22,
    ease: "power2.out",
    overwrite: "auto",
  });
}

export function bindPhotoZoom(frameEl: HTMLElement | null, scale = 1.028) {
  if (!frameEl || prefersReducedMotion()) return;
  const img = frameEl.querySelector("img");
  if (!img) return;
  gsap.to(img, {
    scale,
    duration: 0.45,
    ease: "power2.out",
    overwrite: "auto",
  });
}

export function resetPhotoZoom(frameEl: HTMLElement | null) {
  if (!frameEl || prefersReducedMotion()) return;
  const img = frameEl.querySelector("img");
  if (!img) return;
  gsap.to(img, {
    scale: 1,
    duration: 0.4,
    ease: "power2.out",
    overwrite: "auto",
  });
}

export function bindButtonPress(el: HTMLElement | null, pressed: boolean) {
  if (!el || prefersReducedMotion()) return;
  gsap.to(el, {
    scale: pressed ? 0.985 : 1,
    y: pressed ? 1 : 0,
    duration: 0.14,
    ease: "power2.out",
    overwrite: "auto",
  });
}
