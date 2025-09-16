import { Router } from "express";
import { Validation } from "../../middleware/validation";
import US from "./user.service";
import * as UV from "./user.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidator, multerCloud, StorageEnum } from "../../middleware/multer.cloud";
import { createUploadFilePresigner } from './../../utils/s3.config';

const userRouter = Router();

userRouter.post("/signup", Validation(UV.signUpSchema), US.signUp);
userRouter.patch("/confirmEmail", Validation(UV.confirmEmailSchema), US.confirmEmail);
userRouter.post("/signin", Validation(UV.signInSchema), US.signIn);
userRouter.post("/loginWithGmail", Validation(UV.loginWithGoogleSchema), US.loginWithGoogle);
userRouter.get("/profile", Authentication(), US.getProfile);
userRouter.post("/logout", Authentication(), Validation(UV.logoutSchema), US.logout);
userRouter.get("/refreshToken", Authentication(TokenType.REFRESH), US.refreshToken);
userRouter.post("/forgetPassword", Validation(UV.forgetPasswordSchema), US.forgetPassword);
userRouter.patch("/resetPassword", Validation(UV.resetPasswordSchema), US.resetPassword);
userRouter.patch("/updateProfile", Authentication(), Validation(UV.updateProfileSchema), US.updateProfile);
userRouter.patch("/changePassword", Authentication(), Validation(UV.changePasswordSchema), US.changePassword);
userRouter.patch("/updateEmail", Authentication(), Validation(UV.updateEmailSchema), US.updateEmail);
userRouter.post("/confirmLogin", Validation(UV.confirmLoginSchema), US.confirmLogin);
userRouter.post("/enableTwoStepVerification", Authentication(), US.enableTwoStepVerification);
userRouter.post("/verifyTwoStepVerification", Authentication(), Validation(UV.verifyTwoStepVerificationSchema), US.verifyTwoStepVerification);
userRouter.post("/disableTwoStepVerification", Authentication(), US.disableTwoStepVerification);
userRouter.post("/uploadProfileImage", multerCloud({ fileTypes: fileValidator.image, storageType: StorageEnum.disk }).single("profileImage"), Authentication(), US.uploadProfileImage);
userRouter.post("/uploadCoverImages", multerCloud({ fileTypes: fileValidator.image, storageType: StorageEnum.cloud }).array("coverImages", 5), Authentication(), US.uploadCoverImages);
userRouter.get("/createUploadFilePresigner", Authentication(), Validation(UV.createUploadFilePresignerSchema), US.uploadProfileImageWithPresigner);
export default userRouter;

