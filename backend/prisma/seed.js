// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

  // hash password
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // upsert admin user. If exists, update password and ensure role ADMIN.
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: hashed,
      fullName: "System Admin",
      role: "ADMIN",
      tempPassword: false
    },
    create: {
      email: ADMIN_EMAIL,
      password: hashed,
      fullName: "System Admin",
      role: "ADMIN",
      tempPassword: false
    },
  });

  // ensure company settings exists
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "My Company Pvt Ltd",
      address: "123 Business Rd",
      contact: "+91 9876543210",
      gstNumber: "22AAAAA0000A1Z5",
      currency: "INR",
      
    }
  });

  console.log(`Seed finished. Admin: ${ADMIN_EMAIL}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
