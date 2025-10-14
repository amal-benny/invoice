"use strict";
// admin.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const auth = require("../middlewares/auth");
const adminOnly = require("../middlewares/adminOnly");
// helper to hash password
async function hashPassword(plain) {
    const hashed = await bcrypt.hash(plain, 10);
    return hashed;
}
// Register new user (admin only) with optional provided temporary password.
// Admin supplies email, fullName, role, and optionally password (plain).
router.post("/register-user", auth, adminOnly, async (req, res) => {
    const { email, fullName, role, password } = req.body;
    if (!email)
        return res.status(400).json({ message: "Email required" });
    try {
        let tempPasswordPlain = null;
        let hashed = null;
        if (password && typeof password === "string" && password.trim().length > 0) {
            // admin provided a temporary password
            tempPasswordPlain = password;
            hashed = await hashPassword(tempPasswordPlain);
        }
        else {
            // generate temp password and return it to admin (same behavior as before)
            tempPasswordPlain = Math.random().toString(36).slice(-8) + "A1!";
            hashed = await hashPassword(tempPasswordPlain);
        }
        const user = await prisma.user.create({
            data: {
                email,
                fullName,
                password: hashed,
                role: role || "USER",
                tempPassword: true, // admin-created password should be considered temporary by default
            },
        });
        // In production send temp password over email; here return for admin to give
        res.json({
            user: { id: user.id, email: user.email, fullName: user.fullName },
            tempPassword: tempPasswordPlain,
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// list users
router.get("/users", auth, adminOnly, async (req, res) => {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, fullName: true, role: true, tempPassword: true },
    });
    res.json(users);
});
// update user role or fullName, etc.
router.put("/users/:id", auth, adminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const { role, fullName } = req.body;
    try {
        const u = await prisma.user.update({
            where: { id },
            data: { role, fullName },
        });
        res.json(u);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
// Admin: change/set user's password
// body: { password: string, forceChange?: boolean }
// If forceChange === true, sets tempPassword = true so user is required to change on next login.
router.put("/users/:id/password", auth, adminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const { password, forceChange } = req.body;
    if (!password || typeof password !== "string" || password.trim().length === 0) {
        return res.status(400).json({ message: "Password required" });
    }
    try {
        const hashed = await hashPassword(password);
        const u = await prisma.user.update({
            where: { id },
            data: {
                password: hashed,
                tempPassword: !!forceChange, // if admin wants the user to change it on first login
            },
            select: { id: true, email: true, tempPassword: true },
        });
        res.json({ message: "Password updated", user: u });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
// Admin: clear temporary-password requirement
// This sets tempPassword = false (user is no longer forced to change password).
router.delete("/users/:id/password", auth, adminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const u = await prisma.user.update({
            where: { id },
            data: { tempPassword: false },
            select: { id: true, email: true, tempPassword: true },
        });
        res.json({ message: "tempPassword flag cleared", user: u });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
router.delete("/users/:id", auth, adminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await prisma.user.delete({ where: { id } });
        res.json({ message: "User deleted" });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
module.exports = router;
