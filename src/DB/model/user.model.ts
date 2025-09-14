import mongoose, { Types } from "mongoose";

export enum GenderType {
    Male = "male",
    Female = "female"
}

export enum RoleType {
    User = "user",
    Admin = "admin"
}

export enum ProviderType {
    Local = "local",
    Google = "google"
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
    image?: string;
    gender: GenderType;
    role?: RoleType;
    provider?: ProviderType;
    twoStepEnabled?: boolean;
    otp?: string;
    otpExpireAt?: Date;
    confirmed?: boolean;
    deletedAt: Date;
    changeCredentials?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
    fName: { type: String, required: true , min : 3 , max : 30 , trim : true },
    lName: { type: String, required: true , min : 3 , max : 30 , trim : true },
    email: { type: String, required: true, unique: true , trim : true },
    password: { type: String, required: function() { return this.provider === ProviderType.Local; } },
    phone: { type: String, trim : true },
    age: { type: Number, required: function() { return this.provider === ProviderType.Local; } , min : 18 , max : 100},
    address: { type: String, trim: true },
    image: { type: String, trim: true },
    gender: { type: String, enum: Object.values(GenderType), required: true },
    role: { type: String, enum: Object.values(RoleType), default: RoleType.User },
    provider: { type: String, enum: Object.values(ProviderType), default: ProviderType.Local },
    twoStepEnabled: { type: Boolean, default: false },
    otp: { type: String },
    otpExpireAt: { type: Date },
    confirmed: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    changeCredentials: { type: Date }
}, {
    timestamps: true,
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    },
    strictQuery: true
})


userSchema.virtual("userName").set(function (value){ 
    const [fName, lName] = value.split(" ");
    this.set({ fName, lName });
}).get(function () {
    return this.fName + " " + this.lName;
});


// userSchema.pre(["find", "findOne" , "updateOne"], function (next) {
//     console.log("pre hook");
//     console.log({ this: this, query: this.getQuery() });
//     const query = this.getQuery();
//     const { paranoid , ...rest } = query;
//     if (paranoid) {
//         this.setQuery({ ...rest, deletedAt: null });
//     }
//     else {
//         this.setQuery(rest);
//     }
//     next();
//  })

const userModel = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default userModel;