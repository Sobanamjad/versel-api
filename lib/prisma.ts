import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prismaInstance = globalThis.prisma ?? prismaClientSingleton();

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prismaInstance;
