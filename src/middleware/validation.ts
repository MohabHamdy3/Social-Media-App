import{ NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../utils/classError';

type ReqType = keyof Request;
type SchemaType = Partial<Record<ReqType , ZodType>>
export const Validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationErrors = []
        for (const key of Object.keys(schema) as ReqType[]) {
            if (!schema[key]) continue;
            const result = schema[key].safeParse(req[key]);
            if (!result.success) {
                validationErrors.push(result.error);
            }
        }
        if (validationErrors.length) {
            throw new AppError(JSON.parse(validationErrors as unknown as string), 400);
        }
        next();
    }
}
