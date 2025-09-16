import { ObjectCannedACL, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid";
import { StorageEnum } from "../middleware/multer.cloud";
import { AppError } from "./classError";
import { createReadStream } from "fs";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export const s3Client = () => {
    return new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
    })
}
 
export const uploadFile = async (
    {
        storeType = StorageEnum.cloud, 
        Bucket = process.env.AWS_BUCKET_NAME!,
        path = "general",
        ACL = "private" as ObjectCannedACL,
        file
    }: {
        storeType?: StorageEnum,
        Bucket?: string,
        path?: string,
        ACL?: ObjectCannedACL,
        file: Express.Multer.File
    }
) : Promise<string> => {
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        ACL,
        Key: `${process.env.APPLICATION_NAME}/${path}/${uuidv4()}_${file.originalname}`,
        Body: storeType === StorageEnum.cloud ? file.buffer : createReadStream(file.path),
        ContentType: file.mimetype
    })
    await s3Client().send(command);
    if (!command.input.Key) throw new AppError("File upload failed", 500);
    return command.input.Key;
}
 
export const uploadLargeFile = async (
     {
        storeType = StorageEnum.cloud, 
        Bucket = process.env.AWS_BUCKET_NAME!,
        path = "general",
        ACL = "private" as ObjectCannedACL,
        file
    }: {
        storeType?: StorageEnum,
        Bucket?: string,
        path?: string,
        ACL?: ObjectCannedACL,
        file: Express.Multer.File
    }
) => {
    const upload = new Upload({
        client: s3Client(),
        params: {
            Bucket: process.env.AWS_BUCKET_NAME!,
            ACL,
            Key: `${process.env.APPLICATION_NAME}/${path}/${uuidv4()}_${file.originalname}`,
            Body: storeType === StorageEnum.cloud ? file.buffer : createReadStream(file.path),
            ContentType: file.mimetype 
        }
    })
    const { Key } = await upload.done();
    if (!Key) throw new AppError("File upload failed", 500);
    return Key;

}
 
export const uploadFiles = async (
    {
        storeType = StorageEnum.cloud,
        Bucket = process.env.AWS_BUCKET_NAME!,
        path = "general",
        ACL = "private" as ObjectCannedACL,
        files,
        useLargeFiles = false
    }: {
        storeType?: StorageEnum,
        Bucket?: string,
        path?: string,
        ACL?: ObjectCannedACL,
        files: Express.Multer.File[],
        useLargeFiles?: boolean
    }
) => {
    let keys : string[] = [];
    keys = await Promise.all(files.map(file => useLargeFiles ? uploadLargeFile({ file, path, ACL, storeType, Bucket }) : uploadFile({ file, path, ACL, storeType, Bucket })));
    return keys;
}
 
export const createUploadFilePresigner = async (
    {   
        Bucket = process.env.AWS_BUCKET_NAME!,
        path = "general",
        originalname,
        ContentType,
        expiresIn = 3600
    }: {
            Bucket?: string,
            path?: string,
            originalname: string,
            ContentType: string,
            expiresIn?: number
    }
) => {
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: `${process.env.APPLICATION_NAME}/${path}/${uuidv4()}_${originalname}`,
        ContentType
    });
    const signedUrl = await getSignedUrl(s3Client(),command, { expiresIn });
    return signedUrl;
}

