import { PrismaClient } from "@prisma/client"

// PrismaClient global olarak tanımlanır, böylece hot reload sırasında çoklu bağlantı oluşmaz
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
