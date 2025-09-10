import mongoose, { Types } from "mongoose";

export enum GenderType {
    Male = "male",
    Female = "female"
}

export enum RoleType {
    User = "user",
    Admin = "admin"
}

export interface IUser {
    _id : Types.ObjectId;
    fName: string;
    lName: string;
    userName? : string;
    email: string;
    password: string;
    phone?: string;
    age: number;
    address?: string;
    gender: GenderType;
    role?: RoleType;
    otp?: string;
    confirmed?: boolean;
    changeCredentials?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
    fName: { type: String, required: true , min : 3 , max : 30 , trim : true },
    lName: { type: String, required: true , min : 3 , max : 30 , trim : true },
    email: { type: String, required: true, unique: true , trim : true },
    password: { type: String, required: true },
    phone: { type: String, trim : true },
    age: { type: Number, required: true , min : 18 , max : 100},
    address: { type: String, trim : true },
    gender: { type: String, enum: Object.values(GenderType), required: true },
    role: { type: String, enum: Object.values(RoleType), default: RoleType.User },
    otp: { type: String },
    confirmed: { type: Boolean, default: false },
    changeCredentials: { type: Date }
}, {
    timestamps: true,
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
})


userSchema.virtual("userName").set(function (value){ 
    const [fName, lName] = value.split(" ");
    this.set({ fName, lName });
}).get(function () {
    return this.fName + " " + this.lName;
});



const userModel = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default userModel;