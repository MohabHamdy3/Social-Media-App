import z from "zod";

export const signUpSchema = {
    body : z.object({
            name: z.string().min(2).max(20).trim(),
            email: z.email(),
            password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,100}$/),
            confirmPassword: z.string().min(6).max(100)
        }).required().superRefine((data, ctx) => {
            if (data.password !== data.confirmPassword) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Passwords don't match",
                    path: ["confirmPassword"],
                });
            }
        })
}
