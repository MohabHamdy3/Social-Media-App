import { Router } from "express";
import { Validation } from "../../middleware/validation";
import US from "./user.service";
import * as UV from "./user.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";

const userRouter = Router();

userRouter.post("/signup", Validation(UV.signUpSchema), US.signUp);
userRouter.patch("/confirmEmail", Validation(UV.confirmEmailSchema), US.confirmEmail);
userRouter.post("/signin", Validation(UV.signInSchema), US.signIn);
userRouter.get("/profile", Authentication(), US.getProfile);
userRouter.post("/logout", Authentication(), Validation(UV.logoutSchema), US.logout);
userRouter.get("/refreshToken", Authentication(TokenType.REFRESH), US.refreshToken);
export default userRouter;

