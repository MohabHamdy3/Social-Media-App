import { HydratedDocument, Model } from "mongoose";
import userModel, { IUser } from "../model/user.model";
import { DBRepository } from "./db.repository";
import { AppError } from "../../utils/classError";
import { IRevokeToken } from "../model/revokeToken.mode";


export class RevokeTokenRepository extends DBRepository<IRevokeToken> {
    constructor(protected readonly  model :  Model<IRevokeToken>) {
        super(model);
    }

}