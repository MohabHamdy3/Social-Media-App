
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AppError } from './classError';
import userModel from '../DB/model/user.model';
import { UserRepository } from '../DB/repositories/user.repository';
import { RevokeTokenRepository } from '../DB/repositories/revokeToken.repository';
import RevokeTokenModel from '../DB/model/revokeToken.mode';

const _userModel = new UserRepository(userModel);
const _revokeTokenModel = new RevokeTokenRepository(RevokeTokenModel);
export const GenerateToken = ({payload , signature , options } : {payload : object , signature : string , options : jwt.SignOptions } ) : string => {
    return jwt.sign(payload, signature , options );
}

export const VerifyToken = ({token , signature } : {token : string , signature : string}) :JwtPayload => {
    return jwt.verify(token, signature ) as JwtPayload;
}

export enum TokenType {
  ACCESS = "ACCESS",
  REFRESH = "REFRESH",
}
export const GetSignature = async (tokenType: TokenType, prefix: string) => {
    if (tokenType === TokenType.ACCESS) {
        if (prefix === process.env.BEARER_PREFIX) {
            return process.env.ACCESS_TOKEN_USER!;
        }
        else if (prefix === process.env.ADMIN_PREFIX) {
            return process.env.ACCESS_TOKEN_ADMIN!;
        }
        else {
            return null;
        }
    }
    else if (tokenType === TokenType.REFRESH) {
        if (prefix === process.env.BEARER_PREFIX) {
            return process.env.REFRESH_TOKEN_USER!;
        }
        else if (prefix === process.env.ADMIN_PREFIX) {
            return process.env.REFRESH_TOKEN_ADMIN!;
        }
        else {
            return null;
        }
    }
    return null;
}

export const decodedTokenAndFetchUser = async (token : string , signature : string ) => {
    const decoded = await VerifyToken({ token,  signature });
  if (!decoded?.email) {
    throw new AppError("invalid token , please login again ", 401);
    }
const user = await _userModel.findOne({ email: decoded.email }, { password: 0, otp: 0 });
  if (!user) {
    throw new AppError("user not exist", 401);
    }
    if (await _revokeTokenModel.findOne({ tokenId: decoded.jti } , { _id: 1 })) {
      throw new AppError("token is revoked", 401);
    }
    if (user?.changeCredentials?.getTime()! > (decoded.iat! * 1000)) {
      throw new AppError("token is expired", 401);
    }
    return { decoded, user };
}