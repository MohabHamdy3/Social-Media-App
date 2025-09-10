import { HydratedDocument } from "mongoose";
import { IUser } from "../DB/model/user.model";
import  jwt  from 'jsonwebtoken';

// declaration merging
declare module "express-serve-static-core" {
    interface Request {
        user?: HydratedDocument<IUser>;
        decoded?: jwt.JwtPayload;
    }
}
