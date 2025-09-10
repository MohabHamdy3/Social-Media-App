import { HydratedDocument, Model } from "mongoose";
import userModel, { IUser } from "../model/user.model";
import { DBRepository } from "./db.repository";
import { AppError } from "../../utils/classError";


export class UserRepository extends DBRepository<IUser> {
    constructor(protected readonly  model :  Model<IUser>) {
        super(model);
    }

     async createOneUser(item: Partial<IUser>): Promise<HydratedDocument<IUser>> {
        const user: HydratedDocument<IUser> = await this.model.create(item);
        if (!user) throw new AppError("User creation failed" , 400);
        return user;
    }
}