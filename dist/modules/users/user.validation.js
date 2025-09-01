"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUpSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.signUpSchema = {
    body: zod_1.default.object({
        name: zod_1.default.string().min(2).max(20).trim(),
        email: zod_1.default.email(),
        password: zod_1.default.string().min(6).max(100),
        confirmPassword: zod_1.default.string().min(6).max(100)
    }).required().superRefine((data, ctx) => {
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: zod_1.default.ZodIssueCode.custom,
                message: "Passwords don't match",
                path: ["confirmPassword"],
            });
        }
    })
};
