import { NextResponse } from "next/server";
import { CLINIC_INFO } from "@/data/clinic";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { ChatbotFaqRecord, ChatbotLogRecord, getDb } from "@/lib/db";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const faqs = db
    .prepare("SELECT * FROM chatbot_faqs ORDER BY id ASC")
    .all() as unknown as ChatbotFaqRecord[];
  const logs = db
    .prepare("SELECT * FROM chatbot_logs ORDER BY id DESC LIMIT 100")
    .all() as unknown as ChatbotLogRecord[];

  return NextResponse.json({ faqs, logs });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      message?: string;
    };

    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim().slice(0, 64)
        : "anonymous";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const db = getDb();
    const activeFaqs = db
      .prepare("SELECT * FROM chatbot_faqs WHERE is_active = 1 ORDER BY id ASC")
      .all() as unknown as ChatbotFaqRecord[];

    const normalized = message.toLowerCase();

    let bestFaq: ChatbotFaqRecord | null = null;
    let bestScore = 0;

    for (const faq of activeFaqs) {
      const keywords = faq.keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      let score = 0;
      for (const kw of keywords) {
        if (normalized.includes(kw)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestFaq = faq;
      }
    }

    const reply = bestFaq
      ? bestFaq.reply_text
      : `For specific clinical queries, you can use our booking inquiry form below or write to ${CLINIC_INFO.email}.`;
    const actionHref = bestFaq?.action_href || "#book";
    const actionLabel = bestFaq?.action_label || "Book an examination";
    const matchedTopic = bestFaq?.topic || "General inquiry";

    const createdAt = new Date().toISOString();
    const logInfo = db
      .prepare(
        `
        INSERT INTO chatbot_logs (session_id, user_message, bot_reply, matched_topic, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
      )
      .run(sessionId, message, reply, matchedTopic, createdAt);

    return NextResponse.json({
      id: Number(logInfo.lastInsertRowid),
      reply,
      actionHref,
      actionLabel,
      matchedTopic,
      createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to process chat message." },
      { status: 400 }
    );
  }
}
