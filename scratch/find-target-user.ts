import prisma from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "mhzala83@gmail.com" },
    include: { agency: true },
  });
  console.log("findFirst by email mhzala83@gmail.com:", user);

  const userById = await prisma.user.findUnique({
    where: { id: "bbfd67cf-f854-4de7-8a88-57f9fb7ffb3e" },
    include: { agency: true },
  });
  console.log("findUnique by auth id bbfd67cf-f854-4de7-8a88-57f9fb7ffb3e:", userById);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
