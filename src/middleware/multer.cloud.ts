import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import { AppError } from "../utils/classError";
import os from "node:os";
import { v4 as uuidv4 } from "uuid";


export const fileValidator = {
    image: ['image/jpeg', 'image/png', 'image/jpg'],
    video: ['video/mp4', 'video/mkv', 'video/quicktime'],
    file: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    audio : ['audio/mpeg', 'audio/wav', 'audio/ogg']
}

export enum StorageEnum {
    disk = "disk",
    cloud = "cloud",
}
export const multerCloud = ( {fileTypes = fileValidator.image , storageType = StorageEnum.cloud , maxSize = 5}  : {fileTypes? : string[] , storageType? : StorageEnum , maxSize? : number}) => {
    const storage = storageType === StorageEnum.cloud ? multer.memoryStorage() : multer.diskStorage({
        destination: os.tmpdir(),
        filename(req : Request, file : Express.Multer.File, cb) {
            cb(null, `${uuidv4()}_${file.originalname}`);
        }
    });
    const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (fileTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError(`Invalid file type. Only ${fileTypes.join(", ")} are allowed.`, 400));
        }
    };
    const upload = multer({ storage, fileFilter });
    return upload;
}