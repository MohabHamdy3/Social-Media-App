import { resolve } from 'path';
import express, { NextFunction, Request, Response } from 'express';
import { config } from 'dotenv';
config({ path: resolve('./config/.env') });
import cors from 'cors';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import { AppError } from './utils/classError';
import userRouter from './modules/users/user.controller';
const app : express.Application = express();

const PORT : string | number = process.env.PORT || 4500;
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    limit: 10, 
    message: "Too many requests from this IP, please try again later.",
    statusCode: 429,
    legacyHeaders: false
});
const bootstrap = () => {
    app.use(express.json());
    app.use(cors());
    app.use(helmet());
    app.use(limiter);

    app.use("/users" , userRouter)


    app.use("{/*demo}" , (req : Request, res : Response , next : NextFunction) => {
        throw new AppError(`invalid URL ${req.originalUrl}` , 404);
    });
    app.use((err : AppError, req : Request, res : Response , next : NextFunction) => {
        return res.status(err.statusCode as unknown as number || 500).json({ message: err.message || "Internal Server Error" , stack : err.stack });
    });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default bootstrap;
