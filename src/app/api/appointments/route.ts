import { NextResponse } from "next/server";
import { CLINICAL_SERVICES } from "@/data/clinic";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  AppointmentRecord,
  AppointmentStatus,
  formatBookingRef,
  getDb,
} from "@/lib/db";

const VALID_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "all";
  const query = (searchParams.get("q") || "").trim().toLowerCase();

  let rows = db
    .prepare("SELECT * FROM appointments ORDER BY id DESC")
    .all() as unknown as AppointmentRecord[];

  const summary = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    completed: rows.filter((r) => r.status === "completed").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
  };

  if (statusFilter !== "all" && VALID_STATUSES.includes(statusFilter as AppointmentStatus)) {
    rows = rows.filter((r) => r.status === statusFilter);
  }

  if (query) {
    rows = rows.filter(
      (r) =>
        r.patient_name.toLowerCase().includes(query) ||
        r.patient_email.toLowerCase().includes(query) ||
        r.service_title.toLowerCase().includes(query) ||
        formatBookingRef(r.id).toLowerCase().includes(query)
    );
  }

  return NextResponse.json({
    appointments: rows.map((r) => ({ ...r, bookingRef: formatBookingRef(r.id) })),
    summary,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      serviceId?: string;
      preferredWindow?: string;
      notes?: string;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const serviceId =
      typeof body.serviceId === "string" ? body.serviceId.trim() : "optometry";
    const preferredWindow =
      typeof body.preferredWindow === "string" ? body.preferredWindow.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Please enter your full name." },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const matchedService =
      CLINICAL_SERVICES.find((s) => s.id === serviceId) ?? CLINICAL_SERVICES[0];

    const db = getDb();
    const createdAt = new Date().toISOString();

    const result = db
      .prepare(
        `
        INSERT INTO appointments (
          patient_name,
          patient_email,
          service_id,
          service_title,
          preferred_window,
          notes,
          status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `
      )
      .run(
        name,
        email,
        matchedService.id,
        matchedService.title,
        preferredWindow || "Morning (08:30 – 12:00)",
        notes,
        createdAt
      );

    const insertedId = Number(result.lastInsertRowid);

    return NextResponse.json(
      {
        id: insertedId,
        bookingRef: formatBookingRef(insertedId),
        serviceTitle: matchedService.title,
        preferredWindow: preferredWindow || "Morning (08:30 – 12:00)",
        status: "pending",
        createdAt,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to save appointment request." },
      { status: 400 }
    );
  }
}
