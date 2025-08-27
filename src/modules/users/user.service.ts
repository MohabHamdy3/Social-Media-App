import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/classError";
interface IsignUpRequest {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

class UserService {
    async signUp(req: Request, res: Response, next: NextFunction) {
        const { name, email, password, confirmPassword }: IsignUpRequest = req.body;
        
        

        return res.status(201).json({ message: "User registered successfully" });
    }
}

export default new UserService();
