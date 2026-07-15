import { prisma } from "../lib/prisma";

async function main() {
  const email = "thusharyyy@gmail.com";
  const passwordHash = "$2b$12$ianmS6S3L8URbTFew4yWieJhh7BDTOqbUGWuNr8OAJ/tU6qsh5d8e"; // default seed hash

  console.log(`Creating SuperAdmin for ${email}...`);
  const admin = await prisma.superAdmin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
    },
  });
  console.log("Success! SuperAdmin record details:", admin);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
