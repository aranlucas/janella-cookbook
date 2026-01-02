import path from "node:path";

// Prisma 7 configuration file
// See: https://pris.ly/d/config-datasource
export default {
  schema: path.join(__dirname, "schema.prisma"),
  migrate: {
    adapter: async () => {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error("DATABASE_URL environment variable is required");
      }
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: url });
      return new PrismaPg(pool);
    },
  },
};
