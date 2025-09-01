"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: (0, path_1.resolve)('./config/.env') });
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const classError_1 = require("./utils/classError");
const user_controller_1 = __importDefault(require("./modules/users/user.controller"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4500;
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    message: "Too many requests from this IP, please try again later.",
    statusCode: 429,
    legacyHeaders: false
});
const bootstrap = () => {
    app.use(express_1.default.json());
    app.use((0, cors_1.default)());
    app.use((0, helmet_1.default)());
    app.use(limiter);
    app.use("/users", user_controller_1.default);
    app.use("{/*demo}", (req, res, next) => {
        throw new classError_1.AppError(`invalid URL ${req.originalUrl}`, 404);
    });
    app.use((err, req, res, next) => {
        return res.status(err.statusCode || 500).json({ message: err.message || "Internal Server Error", stack: err.stack });
    });
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};
exports.default = bootstrap;
