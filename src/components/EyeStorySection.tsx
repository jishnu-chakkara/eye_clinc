"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Layers } from "lucide-react";
import { EYE_STORY_CHAPTERS } from "@/data/story";
import { EyeModelScene } from "@/components/EyeModelScene";
import { bindButtonPress, bindHoverLift, resetHoverLift } from "@/lib/gsap-motion";

gsap.registerPlugin(ScrollTrigger);

export function EyeStorySection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [exploded, setExploded] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);

  const activeChapter = EYE_STORY_CHAPTERS[activeIndex] ?? EYE_STORY_CHAPTERS[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      chapterRefs.current.forEach((el, idx) => {
        if (!el) return;
        ScrollTrigger.create({
          trigger: el,
          start: "top 58%",
          end: "bottom 42%",
          onEnter: () => setActiveIndex(idx),
          onEnterBack: () => setActiveIndex(idx),
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const jumpToChapter = (idx: number) => {
    setActiveIndex(idx);
    const el = chapterRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section
      id="story"
      ref={sectionRef}
      className="section-screen story-section"
      aria-labelledby="story-heading"
    >
      <div className="wrap">
        <div className="section-head" data-scroll-reveal>
          <div>
            <p className="eyebrow">Interactive 3D Anatomy</p>
            <h2 id="story-heading" className="h2-section" style={{ marginTop: "10px" }}>
              How each layer focuses vision
            </h2>
          </div>
          <p className="lead-copy">
            Scroll through the four anatomical chapters—or drag the model directly—to
            inspect how our surgical and diagnostic pathways align from cornea to retina.
          </p>
        </div>

        <div className="story-layout">
          {/* Left: Sticky 3D WebGL Stage */}
          <div className="story-stage-col" data-scroll-reveal>
            <div className="story-stage-card" data-cursor-theme="dark">
              <div className="story-stage-top">
                <span className="mono-meta" style={{ color: "#82c6c7" }}>
                  {activeChapter.step} / {activeChapter.label.toUpperCase()}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className="mono-meta story-drag-hint" style={{ color: "var(--band-muted)" }}>
                    Drag to orbit
                  </span>
                  <button
                    type="button"
                    className="story-explode-btn"
                    aria-pressed={exploded}
                    onClick={() => setExploded((prev) => !prev)}
                    onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
                    onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
                    onPointerLeave={(e) => bindButtonPress(e.currentTarget, false)}
                  >
                    <Layers size={14} />
                    <span>{exploded ? "Align layers" : "Separate layers"}</span>
                  </button>
                </div>
              </div>

              <div className="story-canvas-wrap">
                <EyeModelScene chapter={activeChapter} exploded={exploded} />
              </div>

              <div className="story-stage-tabs" role="tablist" aria-label="3D eye anatomy chapters">
                {EYE_STORY_CHAPTERS.map((chap, idx) => {
                  const selected = idx === activeIndex;
                  return (
                    <button
                      key={chap.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={`story-tab-btn ${selected ? "is-active" : ""}`}
                      onClick={() => jumpToChapter(idx)}
                    >
                      <span className="mono-meta" style={{ color: "inherit" }}>
                        {chap.step}
                      </span>
                      <span>{chap.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Scrolling Narrative Chapters */}
          <div className="story-chapters-col">
            {EYE_STORY_CHAPTERS.map((chap, idx) => {
              const isActive = idx === activeIndex;
              return (
                <article
                  key={chap.id}
                  ref={(el) => {
                    chapterRefs.current[idx] = el;
                  }}
                  className={`story-chapter-card ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveIndex(idx)}
                  onMouseEnter={(e) => bindHoverLift(e.currentTarget)}
                  onMouseLeave={(e) => resetHoverLift(e.currentTarget)}
                >
                  <p className="eyebrow">{chap.eyebrow}</p>
                  <h3 className="story-chapter-title">{chap.title}</h3>
                  <p className="story-chapter-desc">{chap.description}</p>

                  <div className="story-chapter-meta">
                    <div>
                      <span className="protocol-meta-label">{chap.metricLabel}</span>
                      <span className="protocol-meta-val">{chap.metricValue}</span>
                    </div>
                    <a
                      href={chap.clinicalLink}
                      className="story-chapter-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>View clinical care</span>
                      <ArrowRight size={15} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
