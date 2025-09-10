import mongoose from "mongoose";
const connectionDB = async () => {
    mongoose.connect(process.env.DB_URL as unknown as string)
        .then(() => {
            console.log(`Database connected successfully ${process.env.DB_URL}`);
        })
        .catch((error) => {
            console.error("Database connection failed", error);
            process.exit(1);
        });
};

export default connectionDB;