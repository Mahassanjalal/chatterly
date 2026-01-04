"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Profile update schema
const updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).max(50).optional(),
        email: zod_1.z.string().email().optional(),
        gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
    })
});
// Password change schema
const changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(8),
        newPassword: zod_1.z.string().min(8).max(100),
    })
});
// Apply auth middleware to all routes
router.use(auth_1.auth);
// Get user profile
router.get('/', profile_controller_1.getUserProfile);
// Update profile
router.put('/', (0, validate_1.validate)(updateProfileSchema), profile_controller_1.updateProfile);
// Change password
router.put('/password', (0, validate_1.validate)(changePasswordSchema), profile_controller_1.changePassword);
// Upgrade to Pro
router.post('/upgrade', profile_controller_1.upgradeToPro);
exports.default = router;
