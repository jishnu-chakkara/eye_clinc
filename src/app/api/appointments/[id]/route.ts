import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AppointmentStatus, getDb } from "@/lib/db";

const VALID_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

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
    return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { status?: string };
    const nextStatus = body.status as AppointmentStatus;
    if (!VALID_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const db = getDb();
    const info = db
      .prepare("UPDATE appointments SET status = ? WHERE id = ?")
      .run(nextStatus, numericId);

    if (info.changes === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ id: numericId, status: nextStatus });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
    return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
  }

  const db = getDb();
  const info = db.prepare("DELETE FROM appointments WHERE id = ?").run(numericId);

  if (info.changes === 0) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: numericId });
}
