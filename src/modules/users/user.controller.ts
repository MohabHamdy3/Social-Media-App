import { Router } from "express";
import z from "../../../node_modules/zod/v4/classic/external.cjs";
import { Validation } from "../../middleware/validation";
import US from "./user.service";
import { signUpSchema } from "./user.validation";

const userRouter = Router();

userRouter.post("/signup", Validation(signUpSchema), US.signUp);

export default userRouter;

