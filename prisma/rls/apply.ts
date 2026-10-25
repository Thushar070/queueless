import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../../lib/prisma";

async function main() {
  const sqlPath = join(__dirname, "..", "policies.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("Applying tenant-scoped Row Level Security policies...");
  await prisma.$executeRawUnsafe(sql);
  console.log("Tenant-scoped Row Level Security policies applied successfully!");
}

main()
  .catch((e) => {
    console.error("Failed to apply RLS policies:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
