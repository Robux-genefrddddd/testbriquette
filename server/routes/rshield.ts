import type { RequestHandler } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { getFirestore, verifyIdToken } from "../firebase-admin";

const router = express.Router();

const limiter = rateLimit({ windowMs: 60_000, max: 120 });
router.use(limiter);

function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return { salt: s, hash };
}

const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: "missing_token" });
    const decoded = await verifyIdToken(token);
    (req as any).uid = decoded.uid;
    next();
  } catch (e) {
    res.status(401).json({ error: "invalid_token" });
  }
};

async function getUserRole(
  uid: string,
): Promise<"admin" | "moderator" | "user"> {
  const db = getFirestore();
  const snap = await db.collection("users").doc(uid).get();
  const role = (snap.exists && (snap.data()?.role as string)) || "user";
  return role === "admin" || role === "moderator" ? role : "user";
}

function requireRole(min: "moderator" | "admin"): RequestHandler {
  const order = { user: 0, moderator: 1, admin: 2 } as const;
  return async (req, res, next) => {
    const uid = (req as any).uid as string | undefined;
    if (!uid) return res.status(401).json({ error: "unauthorized" });
    const role = await getUserRole(uid);
    if (order[role] >= order[min]) return next();
    return res.status(403).json({ error: "forbidden" });
  };
}

// License activation
router.post("/license/activate", requireAuth, (async (req, res) => {
  const { key } = req.body as { key?: string };
  if (!key) return res.status(400).json({ error: "missing_key" });
  const db = getFirestore();
  const ref = db.collection("licenses").doc(key);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "license_not_found" });
  const data = snap.data() || {};
  if (data.active && data.ownerUid && data.ownerUid !== (req as any).uid) {
    return res.status(409).json({ error: "license_already_claimed" });
  }
  await ref.set(
    {
      key,
      active: true,
      ownerUid: (req as any).uid,
      activatedAt: Date.now(),
      history: [
        ...(data.history || []),
        { type: "activate", at: Date.now(), uid: (req as any).uid },
      ],
    },
    { merge: true },
  );
  res.json({ ok: true });
}) as RequestHandler);

// License check by uid or robloxId
router.get("/license/check", (async (req, res) => {
  const db = getFirestore();
  const { uid, robloxId } = req.query as { uid?: string; robloxId?: string };
  let targetUid = uid || (null as string | null);
  if (!targetUid && robloxId) {
    const q = await db
      .collection("users")
      .where("robloxUserId", "==", robloxId)
      .limit(1)
      .get();
    if (!q.empty) targetUid = q.docs[0].id;
  }
  if (!targetUid) return res.json({ allowed: false, reason: "no_user" });
  const q2 = await db
    .collection("licenses")
    .where("ownerUid", "==", targetUid)
    .where("active", "==", true)
    .limit(1)
    .get();
  const allowed = !q2.empty;
  res.json({ allowed, uid: targetUid });
}) as RequestHandler);

// Admin verify password and set role
router.post("/admin/verify", requireAuth, (async (req, res) => {
  const { name, password } = req.body as { name?: string; password?: string };
  if (name === "admin" && password === "Antoine80@") {
    const db = getFirestore();
    await db.collection("users").doc((req as any).uid).set(
      { role: "admin" },
      { merge: true },
    );
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: "invalid_credentials" });
  }
}) as RequestHandler);

// Admin update user role
router.post("/admin/update-role", requireAuth, requireRole("admin"), (async (
  req,
  res,
) => {
  const { uid, role } = req.body as { uid?: string; role?: string };
  if (!uid || !role) return res.status(400).json({ error: "missing_params" });
  if (!["user", "moderator", "admin"].includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
  }
  const db = getFirestore();
  await db.collection("users").doc(uid).set(
    { role },
    { merge: true },
  );
  res.json({ ok: true });
}) as RequestHandler);

// Kick player (create a kick command)
router.post("/kick", requireAuth, requireRole("moderator"), (async (
  req,
  res,
) => {
  const { robloxUserId } = req.body as { robloxUserId?: string };
  if (!robloxUserId) return res.status(400).json({ error: "missing_params" });
  const db = getFirestore();
  await db.collection("commands").add({
    target: "global",
    action: "kick",
    params: { playerUserId: robloxUserId },
    executed: false,
    createdAt: Date.now(),
    by: (req as any).uid,
  });
  res.json({ ok: true });
}) as RequestHandler);

// Admin create key
router.post("/license/createKey", requireAuth, requireRole("admin"), (async (
  req,
  res,
) => {
  const { key } = req.body as { key?: string };
  const db = getFirestore();
  const finalKey = key || crypto.randomBytes(8).toString("hex").toUpperCase();
  await db
    .collection("licenses")
    .doc(finalKey)
    .set(
      { key: finalKey, active: false, createdAt: Date.now() },
      { merge: true },
    );
  res.json({ key: finalKey });
}) as RequestHandler);

// Share link create
router.post("/share/create", requireAuth, (async (req, res) => {
  const { licenseId, password, expiresInHours } = req.body as {
    licenseId?: string;
    password?: string;
    expiresInHours?: number;
  };
  if (!licenseId || !password)
    return res.status(400).json({ error: "missing_params" });
  const db = getFirestore();
  const lic = await db.collection("licenses").doc(licenseId).get();
  if (!lic.exists) return res.status(404).json({ error: "license_not_found" });
  if (lic.data()?.ownerUid !== (req as any).uid)
    return res.status(403).json({ error: "not_owner" });
  const token = crypto.randomBytes(16).toString("hex");
  const { salt, hash } = hashPassword(password);
  const expiresAt = Date.now() + (expiresInHours ?? 24) * 60 * 60 * 1000;
  await db
    .collection("shares")
    .doc(token)
    .set({
      token,
      licenseId,
      salt,
      passwordHash: hash,
      ownerUid: (req as any).uid,
      expiresAt,
      createdAt: Date.now(),
      used: false,
    });
  res.json({ token, expiresAt });
}) as RequestHandler);

// Share claim
router.post("/share/claim", requireAuth, (async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password)
    return res.status(400).json({ error: "missing_params" });
  const db = getFirestore();
  const ref = db.collection("shares").doc(token);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "invalid_token" });
  const d = snap.data()!;
  if (d.used) return res.status(409).json({ error: "already_used" });
  if (Date.now() > d.expiresAt)
    return res.status(410).json({ error: "expired" });
  const { hash } = hashPassword(password, d.salt);
  if (hash !== d.passwordHash)
    return res.status(401).json({ error: "wrong_password" });
  // Transfer license ownership
  await getFirestore()
    .collection("licenses")
    .doc(d.licenseId)
    .set(
      { ownerUid: (req as any).uid, active: true, transferredAt: Date.now() },
      { merge: true },
    );
  await ref.set(
    { used: true, usedBy: (req as any).uid, usedAt: Date.now() },
    { merge: true },
  );
  res.json({ ok: true });
}) as RequestHandler);

// Roblox linking start
router.post("/roblox/link/start", requireAuth, (async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const db = getFirestore();
  await db
    .collection("linkCodes")
    .doc(code)
    .set({
      code,
      uid: (req as any).uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  res.json({ code, expiresAt: Date.now() + 10 * 60 * 1000 });
}) as RequestHandler);

// Roblox confirms link
router.post("/roblox/link", (async (req, res) => {
  const { linkCode, playerName, robloxUserId } = req.body as {
    linkCode?: string;
    playerName?: string;
    robloxUserId?: string;
  };
  if (!linkCode || !robloxUserId)
    return res.status(400).json({ error: "missing_params" });
  const db = getFirestore();
  const ref = db.collection("linkCodes").doc(linkCode);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "invalid_code" });
  const d = snap.data()!;
  if (Date.now() > d.expiresAt)
    return res.status(410).json({ error: "expired" });
  await db
    .collection("users")
    .doc(d.uid)
    .set({ robloxUsername: playerName || null, robloxUserId }, { merge: true });
  await ref.delete();
  res.json({ ok: true, uid: d.uid });
}) as RequestHandler);

// Servers
router.post("/server/register", (async (req, res) => {
  const { serverId } = req.body as { serverId?: string };
  if (!serverId) return res.status(400).json({ error: "missing_serverId" });
  const db = getFirestore();
  const secret = crypto.randomBytes(12).toString("hex");
  await db
    .collection("servers")
    .doc(serverId)
    .set(
      {
        serverId,
        secret,
        registeredAt: Date.now(),
        lastSeen: Date.now(),
        active: true,
      },
      { merge: true },
    );
  res.json({ ok: true, secret });
}) as RequestHandler);

router.post("/server/stats", (async (req, res) => {
  const { serverId, stats } = req.body as { serverId?: string; stats?: any };
  if (!serverId) return res.status(400).json({ error: "missing_serverId" });
  const db = getFirestore();
  await db
    .collection("servers")
    .doc(serverId)
    .set({ lastSeen: Date.now(), stats }, { merge: true });
  res.json({ ok: true });
}) as RequestHandler);

// Commands polling
router.get("/command", (async (req, res) => {
  const { serverId } = req.query as { serverId?: string };
  const db = getFirestore();
  const q = await db
    .collection("commands")
    .where("target", "in", ["global", serverId || ""])
    .where("executed", "==", false)
    .limit(50)
    .get();
  const cmds = q.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ commands: cmds });
}) as RequestHandler);

// Mark command as executed
router.post("/command/:id/execute", (async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "missing_command_id" });
  const db = getFirestore();
  try {
    await db
      .collection("commands")
      .doc(id)
      .update({
        executed: true,
        executedAt: Date.now(),
      });
    res.json({ ok: true });
  } catch (error) {
    res.status(404).json({ error: "command_not_found" });
  }
}) as RequestHandler);

router.post("/log", (async (req, res) => {
  const { level, message, serverId, meta } = req.body as {
    level?: string;
    message?: string;
    serverId?: string;
    meta?: any;
  };
  const db = getFirestore();
  const log = {
    level: level || "info",
    message: message || "",
    serverId: serverId || null,
    meta: meta || null,
    at: Date.now(),
  };
  await db.collection("logs").add(log);
  res.json({ ok: true });
}) as RequestHandler);

// Bans
router.get("/bans", (async (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) return res.json({ banned: false });
  const db = getFirestore();
  const q = await db
    .collection("bans")
    .where("robloxUserId", "==", userId)
    .where("active", "==", true)
    .limit(1)
    .get();
  const banned = !q.empty;
  const ban = banned ? q.docs[0].data() : null;
  res.json({ banned, ban });
}) as RequestHandler);

router.post("/ban", requireAuth, requireRole("moderator"), (async (
  req,
  res,
) => {
  const { robloxUserId, reason, expiresAt } = req.body as {
    robloxUserId?: string;
    reason?: string;
    expiresAt?: number;
  };
  if (!robloxUserId) return res.status(400).json({ error: "missing_params" });
  const db = getFirestore();
  await db
    .collection("bans")
    .add({
      robloxUserId,
      reason: reason || "",
      active: true,
      createdAt: Date.now(),
      expiresAt: expiresAt || null,
      by: (req as any).uid,
    });
  res.json({ ok: true });
}) as RequestHandler);

router.post("/unban", requireAuth, requireRole("moderator"), (async (
  req,
  res,
) => {
  const { robloxUserId } = req.body as { robloxUserId?: string };
  if (!robloxUserId) return res.status(400).json({ error: "missing_params" });
  const db = getFirestore();
  const q = await db
    .collection("bans")
    .where("robloxUserId", "==", robloxUserId)
    .where("active", "==", true)
    .get();
  const batch = db.batch();
  q.docs.forEach((d) =>
    batch.update(d.ref, {
      active: false,
      revokedAt: Date.now(),
      by: (req as any).uid,
    }),
  );
  await batch.commit();
  res.json({ ok: true });
}) as RequestHandler);

export default router;
