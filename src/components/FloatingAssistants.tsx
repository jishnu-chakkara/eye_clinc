"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight, MessageSquare, Send, X } from "lucide-react";
import { CLINIC_INFO } from "@/data/clinic";
import {
  bindButtonPress,
  bindHoverLift,
  prefersReducedMotion,
  resetHoverLift,
} from "@/lib/gsap-motion";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  actionHref?: string;
  actionLabel?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    sender: "bot",
    text: "Welcome to Bramwell Eye Clinic. Ask about clinic hours, retinal OCT scans, cataract or laser assessments, or what to bring.",
  },
];

const QUICK_TOPICS = [
  "Clinic hours & location",
  "Same-week OCT scan",
  "Cataract assessment",
  "How to book",
];

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  const key = "bramwell_chat_session";
  let existing = window.sessionStorage.getItem(key);
  if (!existing) {
    existing = `sess_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(key, existing);
  }
  return existing;
}

export function FloatingAssistants() {
  const [chatOpen, setChatOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatOpen || !panelRef.current || prefersReducedMotion()) return;
    gsap.fromTo(
      panelRef.current,
      { opacity: 0, y: 14, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: "power3.out", clearProps: "transform" }
    );
  }, [chatOpen]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages, chatOpen]);

  const sendUserMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const stamp = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u-${stamp}`, sender: "user", text: trimmed },
    ]);
    setInputValue("");
    setSending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          message: trimmed,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        actionHref?: string;
        actionLabel?: string;
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: "bot",
          text:
            data.reply ||
            `For specific clinical queries, please use our booking form below or write to ${CLINIC_INFO.email}.`,
          actionHref: data.actionHref || "#book",
          actionLabel: data.actionLabel || "Book an examination",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: `We could not reach the clinic assistant right now. Please use our booking form below or email ${CLINIC_INFO.email}.`,
          actionHref: "#book",
          actionLabel: "Book an examination",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendUserMessage(inputValue);
  };

  return (
    <div className="floating-assist-dock">
      {chatOpen && (
        <div
          ref={panelRef}
          className="chatbot-panel"
          role="dialog"
          aria-label="Bramwell Eye Clinic Assistant"
        >
          <div className="chatbot-header" data-cursor-theme="dark">
            <div>
              <p className="chatbot-title">Clinic Reception Assistant</p>
              <p className="chatbot-subtitle">{CLINIC_INFO.district}</p>
            </div>
            <button
              type="button"
              className="chatbot-close-btn"
              aria-label="Close clinic assistant"
              onClick={() => setChatOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div ref={streamRef} className="chatbot-stream" aria-live="polite">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-bubble ${
                  msg.sender === "user" ? "is-user" : "is-bot"
                }`}
              >
                <p style={{ margin: 0 }}>{msg.text}</p>
                {msg.actionHref && msg.actionLabel && (
                  <a
                    href={msg.actionHref}
                    className="chatbot-action-link"
                    onClick={() => setChatOpen(false)}
                  >
                    <span>{msg.actionLabel}</span>
                    <ArrowRight size={13} />
                  </a>
                )}
              </div>
            ))}
            {sending && (
              <div className="chatbot-bubble is-bot">
                <span className="mono-meta">Checking clinic desk...</span>
              </div>
            )}
          </div>

          <div className="chatbot-quick-row" role="group" aria-label="Common clinic questions">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className="chatbot-quick-chip"
                onClick={() => void sendUserMessage(topic)}
              >
                {topic}
              </button>
            ))}
          </div>

          <form onSubmit={handleFormSubmit} className="chatbot-input-row">
            <label htmlFor="clinic-chatbot-input" className="sr-only">
              Ask a clinic question
            </label>
            <input
              id="clinic-chatbot-input"
              type="text"
              className="chatbot-input"
              placeholder="Ask about scans, hours, cataract..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending}
              className="chatbot-send-btn"
              aria-label="Send message"
              onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
              onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
              onPointerLeave={(e) => bindButtonPress(e.currentTarget, false)}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <div className="floating-fab-group">
        <a
          href={CLINIC_INFO.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fab-btn fab-whatsapp"
          aria-label="Message Bramwell Eye Clinic on WhatsApp"
          title="Chat on WhatsApp"
          onMouseEnter={(e) => bindHoverLift(e.currentTarget)}
          onMouseLeave={(e) => resetHoverLift(e.currentTarget)}
          onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
          onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 2.25C6.62 2.25 2.25 6.53 2.25 11.81C2.25 13.73 2.83 15.52 3.84 17.02L2.8 21.1L7.02 20.08C8.47 20.92 10.18 21.38 12 21.38C17.38 21.38 21.75 17.1 21.75 11.81C21.75 6.53 17.38 2.25 12 2.25ZM16.84 15.54C16.64 16.09 15.69 16.59 15.22 16.66C14.8 16.72 14.27 16.75 13.68 16.56C13.32 16.44 12.86 16.29 12.27 16.03C9.8 14.98 8.19 12.53 8.07 12.37C7.95 12.21 7.07 11.06 7.07 9.87C7.07 8.68 7.7 8.1 7.93 7.85C8.16 7.6 8.43 7.54 8.6 7.54C8.76 7.54 8.93 7.54 9.07 7.55C9.22 7.56 9.43 7.49 9.63 7.96C9.83 8.44 10.31 9.62 10.37 9.74C10.43 9.86 10.47 10 10.39 10.16C10.31 10.32 10.27 10.42 10.15 10.56C10.03 10.7 9.9 10.87 9.79 10.98C9.67 11.1 9.54 11.23 9.68 11.47C9.82 11.71 10.31 12.5 11.04 13.14C11.98 13.97 12.77 14.23 13.01 14.35C13.25 14.47 13.39 14.45 13.53 14.29C13.67 14.13 14.14 13.59 14.3 13.35C14.46 13.11 14.62 13.15 14.84 13.23C15.06 13.31 16.24 13.88 16.48 14C16.72 14.12 16.88 14.18 16.94 14.28C17 14.38 17 14.99 16.84 15.54Z"
              fill="#FFFFFF"
            />
          </svg>
        </a>

        <button
          type="button"
          className="fab-btn fab-chatbot"
          aria-label={chatOpen ? "Close clinic assistant" : "Open clinic assistant"}
          aria-expanded={chatOpen}
          title="Clinic Assistant"
          onClick={() => setChatOpen((prev) => !prev)}
          onMouseEnter={(e) => bindHoverLift(e.currentTarget)}
          onMouseLeave={(e) => resetHoverLift(e.currentTarget)}
          onPointerDown={(e) => bindButtonPress(e.currentTarget, true)}
          onPointerUp={(e) => bindButtonPress(e.currentTarget, false)}
        >
          {chatOpen ? <X size={20} /> : <MessageSquare size={20} />}
        </button>
      </div>
    </div>
  );
}
