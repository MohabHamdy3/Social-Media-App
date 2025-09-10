import { HydratedDocument, Model, ProjectionType, RootFilterQuery, UpdateQuery } from "mongoose";
import { AppError } from "../../utils/classError";


export abstract class DBRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) { }
    async create(item: Partial<TDocument>): Promise<HydratedDocument<TDocument>> {
        return this.model.create(item);
    }


    async findOne(filter: RootFilterQuery<TDocument> , select : ProjectionType<TDocument> ): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOne(filter).select(select);
    }   

    async updateOne(filter: RootFilterQuery<TDocument>, update: UpdateQuery<TDocument>): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOneAndUpdate(filter, update);
    }
   
} 