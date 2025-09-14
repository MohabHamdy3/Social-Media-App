import jwt from "jsonwebtoken";
import { AppError } from "../utils/classError";
import { NextFunction, Request, Response } from "express";
import {
  decodedTokenAndFetchUser,
  GetSignature,
  TokenType,
  VerifyToken,
} from "../utils/token";
import userModel, { IUser } from "../DB/model/user.model";
import { UserRepository } from "../DB/repositories/user.repository";
import { HydratedDocument } from "mongoose";

export interface AuthRequest extends Request {
  user?: HydratedDocument<IUser>;
  decoded?: jwt.JwtPayload;
}

export const Authentication = (tokenType: TokenType = TokenType.ACCESS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authentication = req.headers["authorization"];
    const [prefix, token] = authentication?.split(" ") || [];
    if (!token || !prefix) {
      throw new AppError("Unauthorized", 401);
    }
    const signature = await GetSignature(tokenType, prefix);
    if (!signature) {
      throw new AppError("Unauthorized", 401);
    }
    const { decoded, user } = await decodedTokenAndFetchUser(token, signature);
    if (!decoded || !user) {
      throw new AppError("Unauthorized , invalid token decoded", 401);
    }

    //   const revoked = await revokeTokenModel.findOne({ tokenId: decoded.jti });
    //   if (revoked) {
    //     throw new Error("token is revoked", {
    //       cause: 401,
    //     });
    //   }

    //   if(!user?.confirmed || user?.isFrozen == true ) {
    //     throw new Error("user not confirmed or is frozen", {
    //       cause: 401,
    //     });
    //   }
    req.user = user;
    req.decoded = decoded;
    return next();
  };
};
