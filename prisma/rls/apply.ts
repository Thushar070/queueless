import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../../lib/prisma";

async function main() {
  const sqlPath = join(__dirname, "policies.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("Applying RLS policies to database...");
  await prisma.$executeRawUnsafe(sql);
  console.log("RLS policies applied successfully!");
}

main()
  .catch((e) => {
    console.error("Failed to apply RLS policies:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
