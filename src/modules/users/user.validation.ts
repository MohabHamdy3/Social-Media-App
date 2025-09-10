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
        email: z.string().email(),
        otp: z.string().regex(/^\d{6}$/).length(6),
    }).required()
}

export const logoutSchema = {
    body: z.object({
        flag : z.enum(Object.values(FlagType)).default(FlagType.CURRENT)
    }).required()
}

export type SignUpSchemaType = z.infer<typeof signUpSchema.body>;
export type ConfirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>;
export type SignInSchemaType = z.infer<typeof signInSchema.body>;
export type logoutSchemaType = z.infer<typeof logoutSchema.body>;