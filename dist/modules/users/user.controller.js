"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validation_1 = require("../../middleware/validation");
const user_service_1 = __importDefault(require("./user.service"));
const user_validation_1 = require("./user.validation");
const userRouter = (0, express_1.Router)();
userRouter.post("/signup", (0, validation_1.Validation)(user_validation_1.signUpSchema), user_service_1.default.signUp);
exports.default = userRouter;
