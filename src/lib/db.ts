import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface AppointmentRecord {
  id: number;
  patient_name: string;
  patient_email: string;
  service_id: string;
  service_title: string;
  preferred_window: string;
  notes: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface ChatbotLogRecord {
  id: number;
  session_id: string;
  user_message: string;
  bot_reply: string;
  matched_topic: string;
  created_at: string;
}

export interface ChatbotFaqRecord {
  id: number;
  topic: string;
  keywords: string;
  reply_text: string;
  action_href: string;
  action_label: string;
  is_active: number;
  updated_at: string;
}

const DEFAULT_FAQS: Array<{
  topic: string;
  keywords: string;
  reply_text: string;
  action_href: string;
  action_label: string;
}> = [
  {
    topic: "Clinic hours & location",
    keywords: "hour,hours,open,opening,time,saturday,where,location,address,street,marylebone",
    reply_text:
      "We are located on Wimpole Street, Marylebone. Provisional clinic hours are Monday–Friday 08:30–18:00 and Saturday 09:00–13:00.",
    action_href: "#book",
    action_label: "View hours & booking",
  },
  {
    topic: "OCT & retinal imaging",
    keywords: "oct,retina,retinal,glaucoma,scan,macula,optic,nerve,imaging",
    reply_text:
      "Same-week morning slots are reserved for spectral-domain OCT retinal and optic nerve scans, reviewed directly in room during your visit.",
    action_href: "#diagnostics",
    action_label: "See diagnostic imaging",
  },
  {
    topic: "Cataract & lens surgery",
    keywords: "cataract,lens,iol,toric,implant,cloudy,glare",
    reply_text:
      "Cataract surgical assessments run 60 minutes and include optical biometry plus macular OCT to match monofocal, toric, or EDOF lens implants.",
    action_href: "#story",
    action_label: "Explore 3D lens chapter",
  },
  {
    topic: "Laser vision & dry eye",
    keywords: "laser,lasik,prk,icl,dry,optometry,glasses,eyewear,frames,blur,blurry",
    reply_text:
      "Refractive suitability checks take 75 minutes with Scheimpflug corneal tomography and tear-film evaluation prior to LASIK, PRK, ICL, or eyewear fitting.",
    action_href: "#treatments",
    action_label: "Inspect clinical pathways",
  },
  {
    topic: "Booking & first visit",
    keywords: "book,appointment,visit,bring,referral,schedule,how",
    reply_text:
      "You can request an appointment using the booking form below. Please bring your current spectacles, a medication list, and any optician or GP referral note.",
    action_href: "#book",
    action_label: "Go to booking form",
  },
];

let dbInstance: DatabaseSync | null = null;

function initSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      patient_email TEXT NOT NULL,
      service_id TEXT NOT NULL,
      service_title TEXT NOT NULL,
      preferred_window TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chatbot_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_message TEXT NOT NULL,
      bot_reply TEXT NOT NULL,
      matched_topic TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chatbot_faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      keywords TEXT NOT NULL,
      reply_text TEXT NOT NULL,
      action_href TEXT NOT NULL DEFAULT '',
      action_label TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  const countRow = db
    .prepare("SELECT COUNT(*) AS count FROM chatbot_faqs")
    .get() as { count: number };

  if (countRow.count === 0) {
    const insertFaq = db.prepare(`
      INSERT INTO chatbot_faqs (topic, keywords, reply_text, action_href, action_label, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);
    const now = new Date().toISOString();
    for (const faq of DEFAULT_FAQS) {
      insertFaq.run(
        faq.topic,
        faq.keywords,
        faq.reply_text,
        faq.action_href,
        faq.action_label,
        now
      );
    }
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "clinic.db");

  const db = new DatabaseSync(dbPath);
  initSchema(db);
  dbInstance = db;
  return db;
}

export function formatBookingRef(id: number): string {
  return `BW-${String(id).padStart(4, "0")}`;
}
