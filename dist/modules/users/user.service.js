"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UserService {
    async signUp(req, res, next) {
        const { name, email, password, confirmPassword } = req.body;
        return res.status(201).json({ message: "User registered successfully" });
    }
}
exports.default = new UserService();
