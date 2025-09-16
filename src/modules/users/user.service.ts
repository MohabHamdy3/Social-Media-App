import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/classError";
import { HydratedDocument, Model } from "mongoose";
import userModel, { IUser, ProviderType, RoleType } from "../../DB/model/user.model";
import {
  changePasswordSchemaType,
  ConfirmEmailSchemaType,
  confirmLoginSchemaType,
  createUploadFilePresignerSchemaType,
  FlagType,
  forgetPasswordSchemaType,
  loginWithGoogleSchemaType,
  logoutSchemaType,
  resetPasswordSchemaType,
  SignInSchemaType,
  SignUpSchemaType,
  updateEmailSchemaType,
  updateProfileSchemaType,
  verifyTwoStepVerificationSchemaType,
} from "./user.validation";
import { UserRepository } from "../../DB/repositories/user.repository";
import { Compare, Hash } from "../../utils/hash";
import { generateOTP, sendEmail } from "../../services/sendEmail";
import { emailTemplate } from "../../services/email.template";
import { eventEmitter } from "../../utils/event";
import { GenerateToken } from "../../utils/token";
import { AuthRequest } from "../../middleware/Authentication";
import { nanoid } from "nanoid";
import { RevokeTokenRepository } from "../../DB/repositories/revokeToken.repository";
import RevokeTokenModel from "../../DB/model/revokeToken.mode";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { v4 as uuidv4 } from "uuid";
import { createUploadFilePresigner, uploadFile, uploadFiles } from "../../utils/s3.config";
import { StorageEnum } from "../../middleware/multer.cloud";
class UserService {
  private _userModel = new UserRepository(userModel);
  private _revokeTokenModel = new RevokeTokenRepository(RevokeTokenModel);
  constructor() {
    this.signUp = this.signUp.bind(this);
    this.confirmEmail = this.confirmEmail.bind(this);
    this.signIn = this.signIn.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.logout = this.logout.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.loginWithGoogle = this.loginWithGoogle.bind(this);
    this.forgetPassword = this.forgetPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.updateEmail = this.updateEmail.bind(this);
    this.confirmLogin = this.confirmLogin.bind(this);
    this.enableTwoStepVerification = this.enableTwoStepVerification.bind(this);
    this.verifyTwoStepVerification = this.verifyTwoStepVerification.bind(this);
    this.disableTwoStepVerification = this.disableTwoStepVerification.bind(this); 
    this.uploadProfileImage = this.uploadProfileImage.bind(this);
    this.uploadCoverImages = this.uploadCoverImages.bind(this);
    this.uploadProfileImageWithPresigner = this.uploadProfileImageWithPresigner.bind(this);
    this.deactivateAccount = this.deactivateAccount.bind(this);
    this.reactivateAccount = this.reactivateAccount.bind(this);
  }

  // ============ Sign Up ============ //
  async signUp(req: Request, res: Response, next: NextFunction) {
    let {
      userName,
      email,
      password,
      confirmPassword,
      age,
      gender,
      phone,
      address,
    }: SignUpSchemaType = req.body;

    // Check if user already exists
    if (await this._userModel.findOne({ email }, { email: 1 })) {
      return next(new AppError("User already exists with this email", 400));
    }

    if (password !== confirmPassword) {
      return next(new AppError("Passwords do not match", 400));
    }
    const otp = await generateOTP();
    const hashedOtp = await Hash(String(otp));
    eventEmitter.emit("confirm email", { email, otp });
    const hashedPassword = await Hash(password);
    const user: HydratedDocument<IUser> = await this._userModel.createOneUser({
      userName,
      email,
      password: hashedPassword,
      age,
      gender,
      phone,
      address,
      otp: hashedOtp,
    });
    return res
      .status(201)
      .json({ message: "User registered successfully", user });
  }

  // ============ Confirm Email ============ //
  async confirmEmail(req: Request, res: Response, next: NextFunction) {
    const { email, otp }: ConfirmEmailSchemaType = req.body;
    const user = await this._userModel.findOne(
      { email },
      { email: 1, otp: 1, confirmed: 1 }
    );
    if (!user) {
      return next(new AppError("User not found or already confirmed", 404));
    }
    const isOtpValid = await Compare(otp, user.otp!);
    if (!isOtpValid) {
      return next(new AppError("Invalid OTP", 400));
    }
    await this._userModel.updateOne(
      { _id: user._id },
      { $unset: { otp: "" }, $set: { confirmed: true } }
    );
    return res.status(200).json({ message: "Email confirmed successfully" });
  }

  // ============ Sign In ============ //
  async signIn(req: Request, res: Response, next: NextFunction) {
    const { email, password }: SignInSchemaType = req.body;
    const user = await this._userModel.findOne(
      { email },
      { email: 1, password: 1, confirmed: 1 , twoStepEnabled : 1  }
    );
    if (!user) {
      return next(new AppError("Invalid email", 401));
    }
    if (!(await Compare(password, user.password))) {
      return next(new AppError("Invalid password", 401));
    }
    if (!user.confirmed) {
      return next(new AppError("Please confirm your email first", 400));
    }
    if (user.isActive === false) {
      return next(new AppError("Your account is deactivated , Please reactive it first", 400));
    }
    if (user.twoStepEnabled) {
    // generate OTP and send email
    const otp = await generateOTP();
    const hashedOtp = await Hash(String(otp));
    await this._userModel.updateOne(
      { _id: user._id },
      { otp: hashedOtp, otpExpire: new Date(Date.now() + 5 * 60 * 1000) }
    );
    eventEmitter.emit("confirm email", { email: user.email, otp });

    return res.status(200).json({
      message: "OTP sent to your email. Please confirm login.",
      status: 200
    });
    }

    // if 2FA not enabled, proceed to generate tokens
    const jwtid: string = nanoid();
    // Generate JWT token
    const access_token = await GenerateToken({
      payload: { id: user._id, email: email },
      signature:
        user.role === RoleType.Admin
          ? process.env.ACCESS_TOKEN_ADMIN!
          : process.env.ACCESS_TOKEN_USER!,
      options: { expiresIn: "1h", jwtid },
    });
    const refresh_token = await GenerateToken({
      payload: { id: user._id, email: email },
      signature:
        user.role === RoleType.Admin
          ? process.env.REFRESH_TOKEN_ADMIN!
          : process.env.REFRESH_TOKEN_USER!,
      options: { expiresIn: "1y", jwtid },
    });
    return res
      .status(200)
      .json({ message: "Signed in successfully", access_token, refresh_token });
  }

  // ================= Enable 2FA =================== //
  async enableTwoStepVerification(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError("Unauthorized , Please login again", 404));
    }
    const otp = await generateOTP();
    const hashedOtp = await Hash(String(otp));
    eventEmitter.emit("confirm email", { email: req.user?.email, otp });
    await this._userModel.updateOne({ _id: userId }, { otp: hashedOtp, otpExpireAt: new Date(Date.now() + 10 * 60 * 1000) });
    return res.status(200).json({ message: "OTP sent to your email. Please verify to enable 2FA.", status: 200 });
  }
  
  // ================= Verify 2FA OTP =================== //
  async verifyTwoStepVerification(req: Request, res: Response, next: NextFunction) {
    const { otp }: verifyTwoStepVerificationSchemaType = req.body;
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError("Unauthorized , Please login again", 404));
    }
    const user = await this._userModel.findOne({ _id: userId }, { otp: 1  , otpExpireAt: 1 });
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    if (!user.otp || !user.otpExpireAt || user.otpExpireAt < new Date()) {
      return next(new AppError("OTP expired or not found. Please request a new one.", 400));
    }
    const isOtpValid = await Compare(otp, user.otp);
    if (!isOtpValid) {
      return next(new AppError("Invalid OTP", 400));
    }
    await this._userModel.updateOne({ _id: userId }, { $unset: { otp: "", otpExpireAt: "" }, twoStepEnabled: true });
    return res.status(200).json({ message: "Two-step verification enabled successfully", status: 200 });
  }
  // ================= Confirm Login (when 2FA is enabled) =================== //
  async confirmLogin(req: Request, res: Response, next: NextFunction) {
  const { email, otp } : confirmLoginSchemaType = req.body;
  const user = await this._userModel.findOne({ email }, { otp: 1, otpExpireAt: 1 });
  if (!user) return next(new AppError("User not found", 404));

    if (!user.otp || !user.otpExpireAt || user.otpExpireAt < new Date()) {
      return next(new AppError("OTP expired, please login again", 400));
    }

  const isOtpValid = await Compare(otp, user.otp!);
  if (!isOtpValid) {
    return next(new AppError("Invalid OTP", 400));
  }

  await this._userModel.updateOne(
    { _id: user._id },
    { $unset: { otp: "", otpExpireAt: "" } }
  );

  const jwtid: string = nanoid();
  const access_token = await GenerateToken({
    payload: { id: user._id, email: user.email },
    signature: process.env.ACCESS_TOKEN_USER!,
    options: { expiresIn: "1h", jwtid },
  });
  const refresh_token = await GenerateToken({
    payload: { id: user._id, email: user.email },
    signature: process.env.REFRESH_TOKEN_USER!,
    options: { expiresIn: "1y", jwtid },
  });

  return res.status(200).json({
    message: "Login confirmed successfully",
    access_token,
    refresh_token,
  });
  } 

  // =============== disable 2FA ================== //
  async disableTwoStepVerification(req: AuthRequest, res: Response, next: NextFunction) {
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError("Unauthorized , Please login again", 404));
    }
    await this._userModel.updateOne({ _id: userId }, { twoStepEnabled: false });
    return res.status(200).json({ message: "Two-step verification disabled successfully", status: 200 });
  }
  
  // ============ login with google ============ //
  async loginWithGoogle(req: Request, res: Response, next: NextFunction) {
     const { idToken } : loginWithGoogleSchemaType = req.body;

  const client = new OAuth2Client(process.env.WEB_CLIENT_ID);
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    return payload;
  }
  const { email, email_verified, picture, name } = await verify() as TokenPayload;
  // Find user by email
  let user = await this._userModel.findOne({ email } , {});
  if (!user) {
    user = await this._userModel.create({
      userName : name!,
      email : email!,
      image: picture!,
      confirmed: email_verified!,
      provider: ProviderType.Google,
      password: uuidv4(),
    });
  }
  if (user.provider !== ProviderType.Google) {
    return next(new AppError(`Please login with ${user.provider}`, 400));
  }

  const jwtid: string = nanoid();
    // Generate JWT token
    const access_token = await GenerateToken({
      payload: { id: user._id, email: email },
      signature:
        user.role === RoleType.Admin
          ? process.env.ACCESS_TOKEN_ADMIN!
          : process.env.ACCESS_TOKEN_USER!,
      options: { expiresIn: "1h", jwtid },
    });
    const refresh_token = await GenerateToken({
      payload: { id: user._id, email: email },
      signature:
        user.role === RoleType.Admin
          ? process.env.REFRESH_TOKEN_ADMIN!
          : process.env.REFRESH_TOKEN_USER!,
      options: { expiresIn: "1y", jwtid },
    });
  return res.status(200).json({
    message: "Login successful",
    status: 200,
    data: {
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        phone: user.phone,
        age: user.age,
        gender: user.gender,
      },
      access_token,
      refresh_token,
    },
  });
  }

  // ============ Get Profile ============ //
  async getProfile(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    return res
      .status(200)
      .json({ message: "Profile fetched successfully", user });
  }

  // ============ Logout ============ //
  async logout(req: Request, res: Response, next: NextFunction) {
    const { flag }: logoutSchemaType = req.body;
    if (flag === FlagType.ALL) {
      await this._userModel.updateOne(
        { _id: req.user?._id },
        { $set: { changeCredentials: new Date() } }
      );
      return res
        .status(200)
        .json({ message: "Logged out from all devices successfully" });
    }
    if (!req.decoded?.jti || !req.user?._id || !req.decoded?.exp) {
      throw new AppError("Invalid token payload", 400);
    }
    await this._revokeTokenModel.create({
      tokenId: req.decoded?.jti!,
      userId: req.user?._id!,
      expireAt: new Date(req.decoded?.exp! * 1000),
    });
    return res
      .status(200)
      .json({ message: "Logged out successfully from this device" });
  }
  // ============ Refresh Token ============ //
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    const jwtid: string = nanoid();
    // Generate JWT token
    const access_token = await GenerateToken({
      payload: { id: req?.user?._id, email: req?.user?.email },
      signature:
        req?.user?.role === RoleType.Admin
          ? process.env.ACCESS_TOKEN_ADMIN!
          : process.env.ACCESS_TOKEN_USER!,
      options: { expiresIn: "1h", jwtid },
    });
    const refresh_token = await GenerateToken({
      payload: { id: req?.user?._id, email: req?.user?.email },
      signature:
        req?.user?.role === RoleType.Admin
          ? process.env.REFRESH_TOKEN_ADMIN!
          : process.env.REFRESH_TOKEN_USER!,
      options: { expiresIn: "1y", jwtid },
    });
    if (!req.decoded?.jti || !req.user?._id || !req.decoded?.exp) {
      throw new AppError("Invalid token payload", 400);
    }
    await this._revokeTokenModel.create({
      tokenId: req.decoded?.jti!,
      userId: req.user?._id!,
      expireAt: new Date(req.decoded?.exp! * 1000),
    });
    return res.status(200).json({
      message: "Token refreshed successfully",
      access_token,
      refresh_token,
    });
  }

  // ============== forget password =================== //
  async forgetPassword(req: Request, res: Response, next: NextFunction) {
    const { email } : forgetPasswordSchemaType = req.body;
    const user = await this._userModel.findOne({ email }, { confirmed: true });
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    const otp = await generateOTP();
    const hashedOtp = await Hash(String(otp));
    eventEmitter.emit("Forget Password", { email, otp });
    await this._userModel.updateOne({ email : user?.email }, { otp: hashedOtp });
    return res
      .status(200)
      .json({ message: "OTP sent to your email", status: 200 });
  }
  // ============== reset password =================== //
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    const { email, otp, newPassword, confirmPassword } : resetPasswordSchemaType = req.body;
    const user = await this._userModel.findOne({ email }, { otp: 1, password: 1 });
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    if (!await Compare(otp, user.otp!)) {
      return next(new AppError("Invalid OTP", 400));
    }
    if (newPassword !== confirmPassword) {
      return next(new AppError("Passwords don't match", 400));
    }
    const hashedPassword = await Hash(newPassword);
    await this._userModel.updateOne({ _id: user._id }, { $set: { password: hashedPassword } , $unset: { otp: "" } , changeCredentials : new Date() });
    return res.status(200).json({ message: "Password reset successfully", status: 200 });
  }

  // ================== update profile  =================== //
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    const { userName, phone, age, address, gender }: updateProfileSchemaType = req.body;
    if (!req.user?._id) {
      return next(new AppError("Unauthorized , Please login again", 404));
    }
    const updates: Partial<IUser> = {};
    if (userName) updates.userName = userName;
    if (phone) updates.phone = phone;
    if (age) updates.age = age;
    if (address) updates.address = address;
    if (gender) updates.gender = gender;

    if (Object.keys(updates).length === 0) {
      return next(new AppError("No valid fields provided for update", 400));
    }

    const updatedUser = await this._userModel.updateOne({ _id: req.user._id }, { $set: updates });
    if (!updatedUser) {
      return next(new AppError("User not found", 404));
    }
    const user = await this._userModel.findOne({ _id: req.user._id }, { password: 0, otp: 0 });
    return res.status(200).json({ message: "Profile updated successfully", data: user, status: 200 });
  }

  // ================= change password  =================== //
  async changePassword(req: Request, res: Response, next: NextFunction) {
    const { currentPassword, newPassword, confirmPassword } : changePasswordSchemaType = req.body;
    const user = await this._userModel.findOne({ _id: req.user?._id }, { password: 1 });
    console.log(user);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    if (!await Compare(currentPassword, user.password)) {
      return next(new AppError("Current password is incorrect", 400));
    }
    if (newPassword !== confirmPassword) {
      return next(new AppError("Passwords don't match", 400));
    }
    const hashedPassword = await Hash(newPassword);
    await this._userModel.updateOne({ _id: user._id }, { $set: { password: hashedPassword, changeCredentials: new Date() } });
    return res.status(200).json({ message: "Password changed successfully", status: 200 });
  }

  // ================= update email  =================== //
  async updateEmail(req: Request, res: Response, next: NextFunction) {
    const { newEmail }: updateEmailSchemaType = req.body;
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError("Unauthorized , Please login again", 404));
    }
    if (!newEmail) {
      return next(new AppError("New email is required", 400));
    }
    const existingUser = await this._userModel.findOne({ email: newEmail }, { email: 1 });
    if (existingUser) {
      return next(new AppError("Email already in use", 400));
    }
    const otp = await generateOTP();
    const hashedOtp = await Hash(String(otp));
    eventEmitter.emit("confirm email", { email: newEmail, otp });
    await this._userModel.updateOne({ _id: userId }, { otp: hashedOtp, confirmed: false, email: newEmail });
    return res.status(200).json({ message: "OTP sent to your new email. Please verify to complete the update.", status: 200 });
  }

  // ================= upload profile image  =================== //
  async uploadProfileImage(req: Request, res: Response, next: NextFunction) {
    // just change the function if i want to upload large file
    const key = await uploadFile({
      file: req.file!,
      path: `users/${req.user?._id}`,
      storeType: StorageEnum.disk
    })

  return res.status(200).json({ message: "Profile image uploaded successfully", key, status: 200 });
  }

  // ================= upload cover images  =================== //
  async uploadCoverImages(req: Request, res: Response, next: NextFunction) {
    const keys = await uploadFiles({
      files: req.files as Express.Multer.File[],
      path: `users/${req.user?._id}`,
      storeType: StorageEnum.disk
    });

    return res.status(200).json({ message: "Cover images uploaded successfully", keys , status: 200 });
  }

  // ================= upload profile image (with presigner url)  =================== //
  async uploadProfileImageWithPresigner(req: Request, res: Response, next: NextFunction) {
    const { originalname, ContentType } : createUploadFilePresignerSchemaType = req.body;
    if (!originalname || !ContentType) {
      return next(new AppError("originalname and ContentType are required", 400));
    }
    const signedUrl = await createUploadFilePresigner({
      originalname,
      ContentType,
      path: `users/${req.user?._id}`
    });

    return res.status(200).json({ message: "Profile image uploaded successfully", signedUrl, status: 200 });
  }
  
  // ================= deactivate the account  =================== //
  async deactivateAccount(req: Request, res: Response, next: NextFunction) {
    if(!req.user?._id) {
      return next(new AppError("Unauthorized , Please login again", 404));
    }
    await this._userModel.updateOne({ _id: req.user?._id }, { isActive: false });
    return res.status(200).json({ message: "Account deactivated successfully", status: 200 });
  }

  // ================= activate the account  =================== //
  async reactivateAccount(req: Request, res: Response, next: NextFunction) {
    if(!req.user?._id) {
      return next(new AppError("Unauthorized , Please login again", 404));
    }
    await this._userModel.updateOne({ _id: req.user?._id }, { isActive: true });
    return res.status(200).json({ message: "Account activated successfully", status: 200 });
  }

}

export default new UserService();
