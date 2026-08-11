import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const pdfFiles = mysqlTable("pdf_files", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  s3Key: varchar("s3Key", { length: 512 }).notNull(),
  s3Url: text("s3Url").notNull(),
  fileType: varchar("fileType", { length: 50 }),
  mimeType: varchar("mimeType", { length: 100 }).default("application/pdf"),
  fileSize: int("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pdfSignatures = mysqlTable("pdf_signatures", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  producer: text("producer"),
  creator: text("creator"),
  pdfVersion: varchar("pdfVersion", { length: 10 }),
  creationDate: varchar("creationDate", { length: 50 }),
  modificationDate: varchar("modificationDate", { length: 50 }),
  xmpMetadata: text("xmpMetadata"),
  fonts: text("fonts"),
  linearized: int("linearized").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const pdfTreatments = mysqlTable("pdf_treatments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceFileId: int("sourceFileId"),
  targetFileId: int("targetFileId"),
  rebuiltFileId: int("rebuiltFileId"),
  signatureProfileId: int("signatureProfileId"),
  metadataUsed: text("metadataUsed"),
  metadataBefore: text("metadataBefore"),
  metadataAfter: text("metadataAfter"),
  status: varchar("status", { length: 50 }).default("completed"),
  errorMessage: text("errorMessage"),
  processingTimeMs: int("processingTimeMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PdfFile = typeof pdfFiles.$inferSelect;
export type InsertPdfFile = typeof pdfFiles.$inferInsert;
export type PdfSignature = typeof pdfSignatures.$inferSelect;
export type InsertPdfSignature = typeof pdfSignatures.$inferInsert;
export type PdfTreatment = typeof pdfTreatments.$inferSelect;
export type InsertPdfTreatment = typeof pdfTreatments.$inferInsert;