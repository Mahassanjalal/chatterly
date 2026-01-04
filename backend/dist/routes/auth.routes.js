"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_1 = require("../middleware/validate");
const user_model_1 = require("../models/user.model");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8),
    }),
});
const registerSchema = zod_1.z.object({
    body: user_model_1.userSchema,
});
// Apply rate limiting to auth routes
router.use(rateLimiter_1.apiLimiter);
// Auth routes
router.post('/register', (0, validate_1.validate)(registerSchema), auth_controller_1.signup);
router.post('/login', (0, validate_1.validate)(loginSchema), auth_controller_1.login);
router.post('/logout', auth_controller_1.logout);
router.get('/me', auth_1.auth, auth_controller_1.me);
exports.default = router;
