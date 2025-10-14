"use strict";
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const auth = require("../middlewares/auth");
// change password (user)
router.post("/change-password", auth, async (req, res) => {
    const user = req.user;
    const { oldPassword, newPassword } = req.body;
    // If user has tempPassword true, skip oldPassword check (force change)
    try {
        if (!newPassword || newPassword.length < 6)
            return res.status(400).json({ message: "New password too short" });
        if (!user.tempPassword) {
            const match = await bcrypt.compare(oldPassword, user.password);
            if (!match)
                return res.status(400).json({ message: "Old password incorrect" });
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashed, tempPassword: false }
        });
        res.json({ message: "Password changed" });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
module.exports = router;
