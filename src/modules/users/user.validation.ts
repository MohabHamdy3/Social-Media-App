import z from "zod";
import { GenderType } from "../../DB/model/user.model";

export enum FlagType {
    ALL = "all",
    CURRENT = "current"
}
export const signInSchema = {
    body: z.object({
            email: z.email(),
            password: z.string().min(6).max(100),
        }).required()
};


export const signUpSchema = {
    body: signInSchema.body.extend({
            userName: z.string().min(3).max(30),
            confirmPassword: z.string().min(6).max(100),
            age: z.number().min(18).max(100),
            gender: z.enum(GenderType),
            phone: z.string().min(10).max(15),
            address: z.string().min(10).max(100),
        }).required().superRefine((data, ctx) => {
            if (data.password !== data.confirmPassword) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Passwords don't match",
                    path: ["confirmPassword"],
                });
            }
        })
};

export const confirmEmailSchema = {
    body: z.object({
        email: z.   email(),
        otp: z.string().regex(/^\d{6}$/).length(6),
    }).required()
}

export const logoutSchema = {
    body: z.object({
        flag : z.enum(Object.values(FlagType)).default(FlagType.CURRENT)
    }).required()
}

export const loginWithGoogleSchema = {
    body: z.object({
        idToken : z.string().min(10)
    }).required()
}

export const forgetPasswordSchema = {
    body: z.object({
        email: z.email()
    }).required()
}

export const resetPasswordSchema = {
    body: z.object({
        email: z.email(),
        otp: z.string().regex(/^\d{6}$/).length(6),
        newPassword: z.string().min(6).max(100),
        confirmPassword: z.string().min(6).max(100),
    }).required().superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Passwords don't match",
                path: ["confirmPassword"],
            });
        }
    })
}

export const updateProfileSchema = {
    body: z.object({
        userName: z.string().min(3).max(30).optional(),
        age: z.number().min(18).max(100).optional(),
        gender: z.enum(GenderType).optional(),
        phone: z.string().min(10).max(15).optional(),
        address: z.string().min(10).max(100).optional(),
    }).required()
}

export const changePasswordSchema = {
    body: z.object({
        currentPassword: z.string().min(6).max(100),
        newPassword: z.string().min(6).max(100),
        confirmPassword: z.string().min(6).max(100),
    }).required().superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Passwords don't match",
                path: ["confirmPassword"],
            });
        }
    })
}

export const updateEmailSchema = {
    body: z.object({
        newEmail: z.email()
    }).required()
}
export const verifyTwoStepVerificationSchema = {
    body: z.object({
        otp: z.string().regex(/^\d{6}$/).length(6),
    }).required()
}

export const confirmLoginSchema = {
    body: z.object({
        email: z.email(),
        otp: z.string().regex(/^\d{6}$/).length(6),
    }).required()
}

export const createUploadFilePresignerSchema = {
    body: z.object({
        originalname: z.string().min(3).max(100),
        ContentType: z.string().min(5).max(50),
    }).required()
}
export type SignUpSchemaType = z.infer<typeof signUpSchema.body>;
export type ConfirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>;
export type SignInSchemaType = z.infer<typeof signInSchema.body>;
export type logoutSchemaType = z.infer<typeof logoutSchema.body>;
export type loginWithGoogleSchemaType = z.infer<typeof loginWithGoogleSchema.body>;
export type forgetPasswordSchemaType = z.infer<typeof forgetPasswordSchema.body>;
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema.body>;
export type updateProfileSchemaType = z.infer<typeof updateProfileSchema.body>;
export type changePasswordSchemaType = z.infer<typeof changePasswordSchema.body>;
export type updateEmailSchemaType = z.infer<typeof updateEmailSchema.body>;
export type verifyTwoStepVerificationSchemaType = z.infer<typeof verifyTwoStepVerificationSchema.body>;
export type confirmLoginSchemaType = z.infer<typeof confirmLoginSchema.body>;
export type createUploadFilePresignerSchemaType = z.infer<typeof createUploadFilePresignerSchema.body>;