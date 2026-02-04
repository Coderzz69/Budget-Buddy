import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { requireAuth, getAuth } from "@clerk/express";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- Health Check ----------
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ---------- Clerk-protected middleware ----------
const clerkAuth = requireAuth();

// ---------- Ensure User Exists ----------
async function ensureUser(req, res, next) {
  const { userId, sessionClaims } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: sessionClaims?.email,
      },
    });

    req.userId = userId;
    next();
  } catch (err) {
    console.error("User sync failed:", err);
    res.status(500).json({ error: "User sync failed" });
  }
}

// ---------- Routes ----------

// Create account
app.post("/accounts", clerkAuth, ensureUser, async (req, res) => {
  const { name, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const account = await prisma.account.create({
    data: {
      name,
      type,
      userId: req.userId,
    },
  });

  res.json(account);
});

// Add transaction
app.post("/transactions", clerkAuth, ensureUser, async (req, res) => {
  const { accountId, categoryId, amount, type, note, occurredAt } = req.body;

  if (!accountId || !amount || !type || !occurredAt) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: req.userId,
      accountId,
      categoryId,
      amount,
      type,
      note,
      occurredAt: new Date(occurredAt),
    },
  });

  res.json(transaction);
});

// Get transactions
app.get("/transactions", clerkAuth, ensureUser, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId },
    orderBy: { occurredAt: "desc" },
  });

  res.json(transactions);
});

// ---------- Server ----------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Budget Buddy API running on port ${PORT}`);
});
