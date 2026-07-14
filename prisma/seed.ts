import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const passwordHash = process.env.SUPER_ADMIN_PASSWORD_HASH;

  if (!email || !passwordHash) {
    console.log("SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD_HASH not set. Skipping Super Admin seeding.");
    return;
  }

  const existing = await prisma.superAdmin.findUnique({
    where: { email },
  });

  if (!existing) {
    await prisma.superAdmin.create({
      data: {
        email,
        passwordHash,
      },
    });
    console.log(`Seeded Super Admin: ${email}`);
  } else {
    console.log(`Super Admin ${email} already exists.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
