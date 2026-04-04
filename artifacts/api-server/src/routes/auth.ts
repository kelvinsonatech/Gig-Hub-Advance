import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "gigshub-secret-key-change-in-production";

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "validation_error", message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "validation_error", message: "Password must be at least 6 characters" });
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "duplicate_error", message: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const [user] = await db.insert(usersTable).values({ name, email, phone, passwordHash, role: "user" }).returning();
      await db.insert(walletsTable).values({ userId: user.id, balance: "0", currency: "GHS" });
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({
        token,
        user: { id: String(user.id), name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt.toISOString() },
      });
    } catch (insertErr: any) {
      if (insertErr?.message?.includes("users_phone_unique") || insertErr?.cause?.message?.includes("users_phone_unique")) {
        return res.status(400).json({ error: "duplicate_error", message: "Phone number already registered" });
      }
      if (insertErr?.message?.includes("users_email_unique") || insertErr?.cause?.message?.includes("users_email_unique")) {
        return res.status(400).json({ error: "duplicate_error", message: "Email already registered" });
      }
      throw insertErr;
    }
  } catch (err) {
    req.log.error(err, "register error");
    return res.status(500).json({ error: "internal_error", message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "validation_error", message: "Email and password required" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "auth_error", message: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "auth_error", message: "Invalid credentials" });
    }
    // Shorter expiry for admin accounts — reduces exposure window if a token leaks
    const expiresIn = user.role === "admin" ? "8h" : "7d";
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn });
    return res.json({
      token,
      user: { id: String(user.id), name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt.toISOString() },
    });
  } catch (err) {
    req.log.error(err, "login error");
    return res.status(500).json({ error: "internal_error", message: "Login failed" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "auth_error", message: "Not authenticated" });
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "auth_error", message: "User not found" });
    }
    return res.json({ id: String(user.id), name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt.toISOString() });
  } catch (err) {
    return res.status(401).json({ error: "auth_error", message: "Invalid token" });
  }
});

export default router;
