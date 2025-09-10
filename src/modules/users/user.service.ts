import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/classError";
import { HydratedDocument, Model } from "mongoose";
import userModel, { IUser, RoleType } from "../../DB/model/user.model";
import {
  ConfirmEmailSchemaType,
  FlagType,
  logoutSchemaType,
  SignInSchemaType,
  SignUpSchemaType,
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
      { email, confirmed: { $exists: false } },
      { email: 1, otp: 1 }
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
      { email: 1, password: 1, confirmed: 1 }
    );
    if (!user) {
      return next(new AppError("Invalid email", 401));
    }
    if (!(await Compare(password, user.password))) {
      return next(new AppError("Invalid password", 401));
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
    return res
      .status(200)
      .json({ message: "Signed in successfully", access_token, refresh_token });
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
}

export default new UserService();
