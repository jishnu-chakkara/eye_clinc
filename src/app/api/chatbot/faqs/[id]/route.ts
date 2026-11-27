import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid FAQ ID" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      topic?: string;
      keywords?: string;
      replyText?: string;
      actionHref?: string;
      actionLabel?: string;
      isActive?: boolean;
    };

    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM chatbot_faqs WHERE id = ?")
      .get(numericId) as
      | {
          id: number;
          topic: string;
          keywords: string;
          reply_text: string;
          action_href: string;
          action_label: string;
          is_active: number;
        }
      | undefined;

    if (!existing) {
      return NextResponse.json({ error: "FAQ entry not found" }, { status: 404 });
    }

    const nextTopic =
      typeof body.topic === "string" && body.topic.trim()
        ? body.topic.trim()
        : existing.topic;
    const nextKeywords =
      typeof body.keywords === "string" && body.keywords.trim()
        ? body.keywords.trim()
        : existing.keywords;
    const nextReply =
      typeof body.replyText === "string" && body.replyText.trim()
        ? body.replyText.trim()
        : existing.reply_text;
    const nextHref =
      typeof body.actionHref === "string" ? body.actionHref.trim() : existing.action_href;
    const nextLabel =
      typeof body.actionLabel === "string"
        ? body.actionLabel.trim()
        : existing.action_label;
    const nextActive =
      typeof body.isActive === "boolean" ? (body.isActive ? 1 : 0) : existing.is_active;

    const now = new Date().toISOString();
    db.prepare(
      `
      UPDATE chatbot_faqs
      SET topic = ?, keywords = ?, reply_text = ?, action_href = ?, action_label = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(
      nextTopic,
      nextKeywords,
      nextReply,
      nextHref,
      nextLabel,
      nextActive,
      now,
      numericId
    );

    return NextResponse.json({
      id: numericId,
      topic: nextTopic,
      keywords: nextKeywords,
      reply_text: nextReply,
      action_href: nextHref,
      action_label: nextLabel,
      is_active: nextActive,
      updated_at: now,
    });
  } catch {
    return NextResponse.json({ error: "Invalid FAQ update" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid FAQ ID" }, { status: 400 });
  }

  const db = getDb();
  const info = db.prepare("DELETE FROM chatbot_faqs WHERE id = ?").run(numericId);

  if (info.changes === 0) {
    return NextResponse.json({ error: "FAQ entry not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: numericId });
}
