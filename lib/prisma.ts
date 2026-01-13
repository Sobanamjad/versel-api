import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Dynamic import to avoid build-time issues
let PrismaClient: any;

const prismaClientSingleton = async () => {
  const connectionString = process.env.DATABASE_URL;

  // Dynamically import PrismaClient only when needed
  if (!PrismaClient) {
    const { PrismaClient: Client } = await import("@prisma/client");
    PrismaClient = Client;
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | Awaited<ReturnType<typeof prismaClientSingleton>>;
}

let prismaInstance: Awaited<ReturnType<typeof prismaClientSingleton>> | undefined;

const getPrisma = async () => {
  if (!prismaInstance) {
    prismaInstance = await prismaClientSingleton();
    if (process.env.NODE_ENV !== "production") {
      globalThis.prisma = prismaInstance;
    }
  }
  return prismaInstance;
};

export const prisma = new Proxy({} as any, {
  get(target, prop) {
    return async (...args: any[]) => {
      const client = await getPrisma();
      return (client as any)[prop](...args);
    };
  }
});
