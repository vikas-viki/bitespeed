import { PrismaClient } from "../prisma";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const getPrisma = () => {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient();
    }

    return globalForPrisma.prisma;
}

export const db = getPrisma();