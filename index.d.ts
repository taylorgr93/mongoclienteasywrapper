import {
  ObjectId,
  Document,
  InsertOneResult,
  InsertManyResult,
  UpdateResult,
  DeleteResult,
  BulkWriteResult,
  ModifyResult,
  IndexDescription,
  FindCursor,
  SortDirection,
} from "mongodb";

interface FindManyOptions {
  sort?: Record<string, SortDirection>;
  projection?: Document;
  limit?: number;
  skip?: number;
  hint?: Document | string;
  [key: string]: unknown;
}

interface MongoWrapper {
  // Insert
  SavetoMongo(objectToSave: Document, collection: string, databaseName?: string): Promise<InsertOneResult | null>;
  SavetoMongoMany(arrToSave: Document[], collection: string, databaseName?: string): Promise<InsertManyResult>;
  SaveManyBatch(arrToSave: Document[], collection: string, databaseName?: string): Promise<BulkWriteResult>;
  SavetoMongoCallback(objectToSave: Document, collection: string, databaseName?: string): Promise<void>;
  UpsertMongo(query: Document, newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;

  // Find
  FindIDOne(Id: string | ObjectId, collection: string, databaseName?: string): Promise<Document>;
  FindOne(query: Document, collection: string, databaseName?: string): Promise<Document>;
  FindMany(query: Document, collection: string, databaseName?: string): Promise<Document[]>;
  FindManyLimit(query: Document, limit: number, collection: string, databaseName?: string): Promise<Document[]>;
  FindManyOptions(query: Document, collection: string, databaseName?: string, options?: FindManyOptions): Promise<Document[]>;
  FindOneLast(query: Document, sortobj: Document, collection: string, databaseName?: string): Promise<Document>;
  FindLimitLast(query: Document, limit: number, collection: string, databaseName?: string): Promise<Document[]>;
  GetAll(collection: string, databaseName?: string): Promise<Document[]>;
  GetLastMongo(limit: number, collection: string, databaseName?: string): Promise<Document[]>;

  // Pagination
  FindPaginated(query: Document, pageNumber: number, nPerPage: number, collection: string, databaseName?: string): Promise<Document[]>;
  FindPaginatedOptions(query: Document, pageNumber: number, nPerPage: number, collection: string, databaseName?: string, options?: FindManyOptions): Promise<Document[]>;

  // Update
  UpdateMongoBy_id(_id: string | ObjectId, newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongo(query: Document, newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongoMany(query: Document, newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateOneRaw(query: Document, newProperties: Document, collection: string, databaseName?: string, options?: Document): Promise<UpdateResult | null>;
  FindOneAndUpdate(query: Document, newProperties: Document, collection: string, databaseName?: string, options?: Document): Promise<ModifyResult | null>;
  UpdateMongoManyRename(query: Document, newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongoBy_idPush(_id: string | ObjectId, newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongoManyBy_idPush(_idArr: (string | ObjectId)[], newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongoManyBy_idAddToSet(_idArr: (string | ObjectId)[], newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongoManyBy_idPull(_idArr: (string | ObjectId)[], newProperties: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongoManyPull(query: Document, propertiesRemove: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongoManyPullIDToCollectionPull(query: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateMongoBy_idRemoveProperty(_id: string | ObjectId, property: Document, collection: string, databaseName?: string): Promise<UpdateResult>;
  UpdateBy_idPush_id(_id: string | ObjectId, originCollection: string, new_id: string | ObjectId, collection: string, databaseName?: string): Promise<UpdateResult>;

  // Delete
  DeleteMongoby_id(_id: string | ObjectId, collection: string, databaseName?: string): Promise<DeleteResult>;
  DeleteMongo(query: Document, collection: string, databaseName?: string): Promise<DeleteResult>;
  DeleteMongoCallback(idObjectToDelete: Document, collection: string, databaseName?: string): Promise<void>;

  // Aggregation
  AggregationMongo(arrAggregation: Document[], collection: string, databaseName?: string): Promise<Document[]>;
  AggregationMongoCursor(arrAggregation: Document[], collection: string, databaseName?: string, batchSize?: number): Promise<{ cursor: FindCursor }>;

  // Population
  PopulateAuto(query: Document, collection: string, databaseName?: string): Promise<Document[]>;
  Populate(collection: string, databaseName: string, joinCollection: string[]): Promise<Document[]>;
  FindIDOnePopulated(Id: string | ObjectId, collection: string, databaseName?: string): Promise<Document[] | Document>;
  ND_PopulateAuto(query: Document, collection: string, databaseName?: string): Promise<Document[]>;
  ND_FindIDOnePopulated(Id: string | ObjectId, collection: string, databaseName?: string): Promise<Document[] | Document>;

  // Not Deleted (ND_)
  ND_FindOne(query: Document, collection: string, databaseName?: string): Promise<Document>;
  ND_FindMany(query: Document, collection: string, databaseName?: string, order?: Record<string, SortDirection>): Promise<Document[]>;
  ND_FindPaginated(query: Document, pageNumber: number, nPerPage: number, collection: string, databaseName?: string): Promise<Document[]>;
  ND_DeleteMongoby_id(_id: string | ObjectId, collection: string, databaseName?: string): Promise<UpdateResult>;

  // Connection
  disconnect(): Promise<void>;

  // Utility
  Count(query: Document, collection: string, databaseName?: string): Promise<number>;
  Distinct(query: Document, collection: string, databaseName?: string): Promise<unknown[]>;
  DropCollection(collection: string, databaseName?: string): Promise<boolean>;
  InsertIndex(index: IndexDescription, collection: string, databaseName?: string): Promise<string>;
  InsertIndexUnique(index: IndexDescription, collection: string, databaseName?: string): Promise<string>;
  getIndexs(collection: string, databaseName?: string): Promise<Document[]>;
  ObjectId: typeof ObjectId;
  GetNextSequenceValue(query: Document, increment: number, collection: string, databaseName?: string): Promise<Document | null>;
}

declare function mongoclienteasywrapper(connectionString: string, defaultDbName?: string): MongoWrapper;

declare namespace mongoclienteasywrapper {
  export { ObjectId };
}

export = mongoclienteasywrapper;
