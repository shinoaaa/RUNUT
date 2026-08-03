import { PrismaClient } from "@prisma/client";

const buat = () => new PrismaClient();

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const db = globalThis.__prisma ?? buat();

if (process.env.NODE_ENV !== "production") globalThis.__prisma = db;
