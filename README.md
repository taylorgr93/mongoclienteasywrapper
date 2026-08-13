# mongoclienteasywrapper

[![npm version](https://img.shields.io/npm/v/mongoclienteasywrapper.svg)](https://www.npmjs.com/package/mongoclienteasywrapper)
[![license](https://img.shields.io/npm/l/mongoclienteasywrapper.svg)](https://github.com/AlbertoMOKnesys/mongoclienteasywrapper/blob/main/LICENSE)

> A simple MongoDB wrapper library for common database operations using the `mongodb` 4.x Node.js driver.

## Why use this instead of Mongoose?

| | **mongoclienteasywrapper** | **Mongoose** | **Native Driver** |
|---|---|---|---|
| **Schemas required** | No | Yes | No |
| **Dependencies** | 1 (`mongodb`) | 20+ | 0 (it is the driver) |
| **Learning curve** | Minimal | Moderate | Low but verbose |
| **Auto ObjectId conversion** | Yes | Yes | Manual |
| **Auto date conversion** | Yes | Via schema types | Manual |
| **Soft-delete built-in** | Yes (`ND_` functions) | Via plugin | Manual |
| **Population without models** | Yes (auto-inferred) | Yes (schema refs) | Manual `$lookup` |
| **Connection management** | Automatic singleton | Automatic | Manual |
| **Boilerplate per operation** | 1 line | 1-2 lines | 5-6 lines |

**Choose this library when** you want the flexibility of the native driver without the repetitive boilerplate, and you don't need schema validation or middleware. One dependency, zero configuration, just call functions.

**Choose Mongoose when** you need strict schema validation, middleware hooks, virtuals, or a large ecosystem of plugins.

## Installation

```bash
npm install mongoclienteasywrapper
```

## Setup

```js
const MongoWrapper = require("mongoclienteasywrapper")(
  "mongodb://localhost:27017",
  "myDatabase" // optional default database name
);
```

The second parameter sets a default database. Every function accepts an optional `databaseName` parameter that overrides this default.

## Quick Example

```js
const { ObjectId } = require("mongodb");
const MongoWrapper = require("mongoclienteasywrapper")(
  "mongodb://localhost:27017",
  "myDatabase"
);

// Insert
const insert = await MongoWrapper.SavetoMongo(
  { name: "Alice", status: "active" },
  "users"
);

// Find by ID
const user = await MongoWrapper.FindIDOne(insert.insertedId, "users");

// Update by ID
await MongoWrapper.UpdateMongoBy_id(
  insert.insertedId,
  { status: "verified" },
  "users"
);

// Delete by ID
await MongoWrapper.DeleteMongoby_id(insert.insertedId, "users");
```

---

## API Reference

> All functions are async and return a Promise.
> The `databaseName` parameter is always optional — it falls back to the default set during initialization.

### Insert

#### `SavetoMongo(objectToSave, collection, databaseName)`

Inserts a single document.

```js
const result = await MongoWrapper.SavetoMongo(
  { name: "Alice", status: "active", datetime: new Date() },
  "users"
);
// result.acknowledged === true, result.insertedId exists
```

#### `SavetoMongoMany(arrToSave, collection, databaseName)`

Inserts an array of documents using `insertMany`.

```js
const result = await MongoWrapper.SavetoMongoMany(
  [{ name: "Alice" }, { name: "Bob" }],
  "users"
);
// result.insertedCount === 2
```

#### `SaveManyBatch(arrToSave, collection, databaseName)`

Inserts an array of documents using `bulkWrite` with ordered operations.

#### `UpsertMongo(query, newProperties, collection, databaseName)`

Updates a document if it matches the query, or inserts it if no match is found. Wraps values in `$set`.

```js
// Insert if not found
const result = await MongoWrapper.UpsertMongo(
  { email: "alice@example.com" },
  { name: "Alice", email: "alice@example.com", status: "active" },
  "users"
);
// result.upsertedId exists on insert, result.matchedCount === 1 on update
```

---

### Find

#### `FindIDOne(Id, collection, databaseName)`

Finds a single document by its `_id`.

```js
const doc = await MongoWrapper.FindIDOne("624e09075bda143a913c5d61", "users");
```

#### `FindOne(query, collection, databaseName)`

Finds the first document matching a query.

```js
const doc = await MongoWrapper.FindOne({ email: "alice@example.com" }, "users");
```

#### `FindMany(query, collection, databaseName)`

Returns all documents matching a query.

```js
const docs = await MongoWrapper.FindMany({ status: "active" }, "users");
```

#### `FindManyLimit(query, limit, collection, databaseName)`

Returns up to `limit` documents matching a query.

```js
const docs = await MongoWrapper.FindManyLimit({ status: "active" }, 10, "users");
```

#### `FindManyOptions(query, collection, databaseName, options)`

Returns documents with configurable `sort`, `projection`, `limit`, and `skip`.

```js
const docs = await MongoWrapper.FindManyOptions(
  { status: "active" },
  "users",
  "myDatabase",
  { sort: { name: 1 }, projection: { name: 1 }, limit: 10, skip: 0 }
);
```

#### `FindOneLast(query, sortobj, collection, databaseName)`

Finds the last document matching a query, sorted by `sortobj`.

```js
const doc = await MongoWrapper.FindOneLast(
  { status: "active" },
  { createdAt: -1 },
  "users"
);
```

#### `GetAll(collection, databaseName)`

Returns all documents in a collection.

#### `GetLastMongo(limit, collection, databaseName)`

Returns the last `limit` documents sorted by `_id` descending.

#### `FindLimitLast(query, limit, collection, databaseName)`

Returns the last `limit` documents matching a query, sorted descending.

---

### Pagination

#### `FindPaginated(query, pageNumber, nPerPage, collection, databaseName)`

Returns a page of documents. Page numbers are zero-based.

```js
const page = await MongoWrapper.FindPaginated(
  { status: "active" },
  0,  // first page
  20, // 20 per page
  "users"
);
```

#### `FindPaginatedOptions(query, pageNumber, nPerPage, collection, databaseName, options)`

Same as `FindPaginated` with additional `sort`, `projection`, and other cursor options.

---

### Update

#### `UpdateMongoBy_id(_id, newProperties, collection, databaseName)`

Updates a single document by `_id`. Wraps values in `$set` automatically.

```js
const result = await MongoWrapper.UpdateMongoBy_id(
  "624e09075bda143a913c5d61",
  { name: "Alice Updated", verified: true },
  "users"
);
// result.matchedCount === 1, result.modifiedCount === 1
```

#### `UpdateMongo(query, newProperties, collection, databaseName)`

Updates the first document matching a query. Wraps values in `$set`.

```js
const result = await MongoWrapper.UpdateMongo(
  { email: "alice@example.com" },
  { status: "verified" },
  "users"
);
```

#### `UpdateMongoMany(query, newProperties, collection, databaseName)`

Updates all documents matching a query. Wraps values in `$set`.

```js
const result = await MongoWrapper.UpdateMongoMany(
  { status: "pending" },
  { status: "active" },
  "users"
);
// result.matchedCount, result.modifiedCount
```

#### `UpdateOneRaw(query, newProperties, collection, databaseName, options)`

Updates a document using raw MongoDB operators (`$inc`, `$unset`, `$push`, etc.) — does **not** wrap in `$set`.

```js
const result = await MongoWrapper.UpdateOneRaw(
  { _id: new ObjectId("624e09075bda143a913c5d61") },
  { $inc: { loginCount: 1 } },
  "users"
);
```

#### `FindOneAndUpdate(query, newProperties, collection, databaseName, options)`

Updates and returns the document in a single atomic operation. Uses raw operators (no `$set` wrapper).

```js
const doc = await MongoWrapper.FindOneAndUpdate(
  { email: "alice@example.com" },
  { $inc: { seq: 1 } },
  "counters",
  "myDatabase",
  { upsert: true, returnDocument: "after" }
);
```

---

### Delete

#### `DeleteMongoby_id(_id, collection, databaseName)`

Deletes a single document by `_id`.

```js
const result = await MongoWrapper.DeleteMongoby_id(
  "624e09075bda143a913c5d61",
  "users"
);
// result.deletedCount === 1
```

#### `DeleteMongo(query, collection, databaseName)`

Deletes all documents matching a query.

```js
const result = await MongoWrapper.DeleteMongo(
  { status: "inactive" },
  "users"
);
```

---

### Aggregation

#### `AggregationMongo(arrAggregation, collection, databaseName)`

Runs an aggregation pipeline and returns the results as an array.

```js
const result = await MongoWrapper.AggregationMongo(
  [
    { $match: { status: "active" } },
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ],
  "users"
);
```

#### `AggregationMongoCursor(arrAggregation, collection, databaseName, batchSize)`

Runs an aggregation pipeline and returns a cursor (for large result sets). Default `batchSize` is 100.

---

### Population (Joins)

These functions use `$lookup` to join related collections. They infer the foreign collection name from field names ending in `_id` (e.g., a field `company_id` looks up the `company` collection).

#### `PopulateAuto(query, collection, databaseName)`

Automatically detects all `_id` reference fields in the matched document and joins them.

```js
const result = await MongoWrapper.PopulateAuto(
  { _id: "624e09075bda143a913c5d61" },
  "orders"
);
// result[0].customer → populated from "customer" collection
```

#### `Populate(collection, databaseName, joinCollection)`

Joins specific collections by name.

```js
const result = await MongoWrapper.Populate("orders", "myDatabase", [
  "customer",
  "product",
]);
```

#### `FindIDOnePopulated(Id, collection, databaseName)`

Finds a document by `_id` and auto-populates all reference fields.

---

### Not Deleted (`ND_`) Functions

Functions prefixed with `ND_` automatically exclude documents where `status === "deleted"`. They work the same as their non-prefixed counterparts.

| Function | Equivalent to |
|---|---|
| `ND_FindOne(query, collection, databaseName)` | `FindOne` excluding deleted |
| `ND_FindMany(query, collection, databaseName, order)` | `FindMany` excluding deleted, with optional sort (default `{ _id: 1 }`) |
| `ND_FindPaginated(query, pageNumber, nPerPage, collection, databaseName)` | `FindPaginated` excluding deleted |
| `ND_PopulateAuto(query, collection, databaseName)` | `PopulateAuto` excluding deleted |
| `ND_FindIDOnePopulated(Id, collection, databaseName)` | `FindIDOnePopulated` excluding deleted |
| `ND_DeleteMongoby_id(_id, collection, databaseName)` | Soft-delete: sets `status: "deleted"` and renames unique-indexed fields to avoid conflicts |

---

### Other Functions

| Function | Description |
|---|---|
| `Count(query, collection, databaseName)` | Returns the count of documents matching a query |
| `Distinct(query, collection, databaseName)` | Returns distinct values for a field |
| `DropCollection(collection, databaseName)` | Drops an entire collection |
| `InsertIndexUnique(index, collection, databaseName)` | Creates a unique index |
| `getIndexs(collection, databaseName)` | Lists all indexes on a collection |
| `GetNextSequenceValue(query, increment, collection, databaseName)` | Atomically increments and returns a sequence counter |
| `SavetoMongoCallback(objectToSave, collection, databaseName)` | Fire-and-forget insert (no return value) |
| `DeleteMongoCallback(query, collection, databaseName)` | Fire-and-forget delete (no return value) |
| `UpdateMongoBy_idPush(_id, newProperties, collection, databaseName)` | Pushes values to array fields by `_id` |
| `UpdateMongoManyBy_idPush(_id, newProperties, collection, databaseName)` | Pushes values to array fields across multiple docs |
| `UpdateMongoManyBy_idAddToSet(_id, newProperties, collection, databaseName)` | Adds to array fields without duplicates |
| `UpdateMongoManyBy_idPull(_id, newProperties, collection, databaseName)` | Pulls values from array fields |
| `UpdateMongoManyPull(query, newProperties, collection, databaseName)` | Pulls values from arrays matching a query |
| `UpdateMongoManyPullIDToCollectionPull(query, propertiesRemove, collection, databaseName)` | Removes cross-references between collections |
| `UpdateMongoBy_idRemoveProperty(_id, newProperties, collection, databaseName)` | Removes (unsets) properties from a document |
| `UpdateMongoManyRename(query, newProperties, collection, databaseName)` | Renames fields across matching documents |
| `UpdateBy_idPush_id(_id, newProperties, collection, databaseName)` | Pushes an ObjectId to an array field |

---

## Transactions

Transactions let you execute multiple operations as an atomic unit — if any operation fails, all changes are rolled back automatically.

> **Requires a MongoDB replica set.** Transactions are not supported on standalone servers.

### `Transaction(callback, transactionOptions?)`

The recommended API. Wraps your operations in a transaction with automatic retry via `session.withTransaction()`.

```js
const result = await MongoWrapper.Transaction(async (tx) => {
  const order = await tx.SavetoMongo({ item: "Widget", qty: 5 }, "orders");
  await tx.UpdateMongoBy_id(userId, { $set: { lastOrder: order.insertedId } }, "users");
  // If anything throws, all operations are rolled back
  return order;
});
```

The `tx` object has the same functions as the wrapper — you don't need to learn a new API.

### `StartSession()`

For advanced use cases where you need manual control over the transaction lifecycle.

```js
const session = await MongoWrapper.StartSession();
try {
  session.startTransaction();
  await MongoWrapper.SavetoMongo(doc, "orders", "myDb", { session });
  await MongoWrapper.UpdateMongoBy_id(id, props, "users", "myDb", { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

---

## Important Notes

- **`$set` wrapping**: `UpdateMongo`, `UpdateMongoBy_id`, `UpdateMongoMany`, and `UpsertMongo` automatically wrap your update object in `$set`. Use `UpdateOneRaw` or `FindOneAndUpdate` when you need raw operators like `$inc`, `$unset`, `$push`, etc.
- **Auto-conversion**: Most functions automatically convert string `_id` fields to `ObjectId` and `_datetime` fields to `Date` objects before querying.
- **Error handling**: Functions return safe fallback values on error (`[]`, `{}`, `0`, or `null`) rather than throwing exceptions. Inside a `Transaction` callback, errors are re-thrown so that `withTransaction()` can detect failures and trigger an automatic rollback.

## Testing

Requires a local MongoDB instance running on `mongodb://127.0.0.1:27017`.

```bash
npm test
```

## License

MIT — see the [LICENSE](LICENSE) file for details.
