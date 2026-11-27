import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      topic?: string;
      keywords?: string;
      replyText?: string;
      actionHref?: string;
      actionLabel?: string;
    };

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const keywords = typeof body.keywords === "string" ? body.keywords.trim() : "";
    const replyText = typeof body.replyText === "string" ? body.replyText.trim() : "";
    const actionHref =
      typeof body.actionHref === "string" ? body.actionHref.trim() : "#book";
    const actionLabel =
      typeof body.actionLabel === "string" ? body.actionLabel.trim() : "";

    if (!topic || !keywords || !replyText) {
      return NextResponse.json(
        { error: "Topic, keywords, and reply text are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();

    const info = db
      .prepare(
        `
        INSERT INTO chatbot_faqs (topic, keywords, reply_text, action_href, action_label, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `
      )
      .run(topic, keywords, replyText, actionHref, actionLabel, now);

    return NextResponse.json(
      {
        id: Number(info.lastInsertRowid),
        topic,
        keywords,
        reply_text: replyText,
        action_href: actionHref,
        action_label: actionLabel,
        is_active: 1,
        updated_at: now,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid FAQ payload." }, { status: 400 });
  }
}
