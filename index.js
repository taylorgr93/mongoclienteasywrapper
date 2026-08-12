// mongofunctions.js
const { MongoClient, ObjectId } = require("mongodb");
const mongoDBConnectionManager = require("./mongoDBConnectionManager");
const { ConvertIdtoObjectId } = require("./utils/convertId");
const { ConvertDatetoDatetime } = require("./utils/convertDatetime");

const operatorNotDeleted = { status: { $ne: "deleted" } };
const tagDeleted = { status: "deleted" };

let mongo;
let mongoDb;

/**
 * Returns a MongoDB database instance, ensuring there is an active
 * connection before accessing the requested database.
 *
 * @param {string} dbName - Name of the database you want to work with.
 * @returns {Promise<Db>} A ready-to-use MongoDB `Db` object.
 */
async function getMongoClient(dbName) {
  // If there is no active connection, establish a new one
  if (!mongoDBConnectionManager.isConnected()) {
    await mongoDBConnectionManager.connect(mongo.uri);
  }

  // Retrieve and return the database handle for the given name
  return await mongoDBConnectionManager.getDatabase(dbName);
}

/**
 * Runs an aggregation pipeline on a specific collection and
 * returns the results as an array.
 *
 * @param {Array<Object>} arrAggregation - Array of aggregation stages.
 * @param {string}        collection     - Collection on which to run the pipeline.
 * @param {string} [databaseName]        - Optional DB name; falls back to `mongoDb`.
 * @returns {Promise<Array>} Aggregated documents.
 */
async function AggregationMongo(arrAggregation, collection, databaseName) {
  try {
    // Determine the database to use (incoming param or default)
    const DatabaseName = databaseName || mongoDb;

    // Connect to the database
    const db = await getMongoClient(DatabaseName);

    // Reference to the target collection
    const col = db.collection(collection);

    // Execute the aggregation pipeline and return the results as an array
    const docs = await col
      .aggregate(arrAggregation, { allowDiskUse: true })
      .toArray();

    return docs; // Return aggregated results
  } catch (error) {
    // Capture and log any error that occurs during aggregation
    console.error("Aggregation error:", error);
    return []; // Return empty array on failure to keep API consistent
  }
}

/**
 * Runs an aggregation pipeline on a specific collection and
 * returns a cursor instead of resolving the entire result set.
 *
 * This is useful for processing large datasets in batches,
 * streaming, or when you don’t want to load all documents into memory at once.
 *
 * @param {Array<Object>} arrAggregation - Array of aggregation stages.
 * @param {string}        collection     - Collection on which to run the pipeline.
 * @param {string} [databaseName]        - Optional DB name; falls back to `mongoDb`.
 * @param {number} [batchSize=100]       - Number of documents per batch when iterating.
 *
 * @returns {Promise<{cursor: AggregationCursor}>}
 *          An object containing the MongoDB aggregation cursor.
 *          The caller can use `.next()`, `.forEach()`, or `.toArray()`
 *          on the cursor to consume results progressively.
 */
async function AggregationMongoCursor(
  arrAggregation,
  collection,
  databaseName,
  batchSize = 100,
) {
  try {
    // Determine the database to use (incoming param or default)
    const DatabaseName = databaseName || mongoDb;

    // Connect to the database
    const db = await getMongoClient(DatabaseName);

    // Create an aggregation cursor (streaming results in batches)
    const result = db
      .collection(collection)
      .aggregate(arrAggregation, { cursor: { batchSize } });

    return {
      cursor: result,
    };
  } catch (error) {
    console.error("Aggregation cursor error:", error);
    return [];
  }
}

/**
 * Count
 * ------------------------------------------------------------------
 * Returns the number of documents in `collection` that match `query`.
 *
 * ⚠️ **Note:** `collection.count()` is deprecated in modern MongoDB
 * drivers.  Prefer `countDocuments(query)` if you need exact counts
 * (respecting filters) or `estimatedDocumentCount()` when you only
 * need a fast estimate of the total collection size.  This wrapper
 * keeps the original behaviour for backward-compatibility.
 *
 * @param {Object}  query           - MongoDB filter object.
 * @param {string}  collection      - Target collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 *
 * @returns {Promise<number>}       Number of documents matching the filter,
 *                                  or `0` if an error occurs.
 */
async function Count(query, collection, databaseName) {
  try {
    // Choose the database (explicit param or default)
    const dbName = databaseName || mongoDb;

    // Get DB handle
    const db = await getMongoClient(dbName);

    // countDocuments respects filters and is the recommended replacement for count()
    return await db.collection(collection).countDocuments(query);
  } catch (error) {
    console.log("Count error:", error.message);
    return 0;
  }
}

/**
 * Deletes a single document from a MongoDB collection by its `_id`.
 *
 * @param {string|ObjectId} Id          The document’s `_id` (string or ObjectId).
 * @param {string}          collection  Collection name where the document lives.
 * @param {string} [databaseName]       Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<DeleteResult>}     MongoDB DeleteResult object.
 */
async function DeleteMongoby_id(Id, collection, databaseName) {
  try {
    // Resolve which database to use (fallback to global default)
    const dbName = databaseName || mongoDb;

    // Build the deletion filter using the provided Id
    const query = { _id: new ObjectId(Id) };

    // Obtain a DB handle (ensures connection is open/reused)
    const db = await getMongoClient(dbName);

    // Perform the deletion and return the raw Mongo response
    return await db.collection(collection).deleteOne(query);
  } catch (error) {
    // Log any error and return an empty result to keep API consistent
    console.error("DeleteMongoby_id error:", error.message);
    return [];
  }
}

/**
 * DeleteMongo
 * ----------------------------------------------------
 * Removes all documents that match a given filter from a collection.
 *
 * @param {Object}  query          - MongoDB filter used to select documents to delete.
 * @param {string}  collection     - Name of the collection.
 * @param {string} [databaseName]  - Optional DB name; defaults to the global `mongoDb`.
 * @returns {Promise<DeleteResult | []>} MongoDB `DeleteResult` on success
 *                                       or empty array on failure.
 */
async function DeleteMongo(query, collection, databaseName) {
  try {
    // Choose the database: provided name or fallback to default
    const dbName = databaseName || mongoDb;

    // Ensure we have a connection, then get the DB handle
    const db = await getMongoClient(dbName);

    // Delete every document that matches the filter
    return await db.collection(collection).deleteMany(query);
  } catch (error) {
    // Log the error and return a safe fallback
    console.error("DeleteMongo error:", error.message);
    return [];
  }
}

/**
 * Distinct
 * ------------------------------------------------------------------
 * Returns an array of **unique values** for a given field in a
 * collection.  It is a thin wrapper around MongoDB’s
 * `collection.distinct()` helper.
 *
 * @param {string}  query           A **field name** for which you want the
 *                                  distinct values (e.g. `"status"` or `"sku"`).
 *                                  If you need to add a filter, you can extend
 *                                  this wrapper to accept a second argument and
 *                                  pass it as the *filter* parameter to
 *                                  `distinct(field, filter)`.
 * @param {string}  collection      Name of the collection to query.
 * @param {string} [databaseName]   Optional DB name; defaults to global `mongoDb`.
 *
 * @returns {Promise<Array>}        Array with all distinct values found,
 *                                  or `[]` if an error occurs.
 *
 * @example
 * // Get every unique status in the "orders" collection
 * const statuses = await Distinct("status", "orders");
 * // => ["pending", "shipped", "cancelled"]
 */
async function Distinct(query, collection, databaseName) {
  try {
    // Determine which database to use
    const dbName = databaseName || mongoDb;

    // Obtain a connection / reuse existing one
    const db = await getMongoClient(dbName);

    // Fetch all distinct values for the requested field
    return await db.collection(collection).distinct(query);
  } catch (error) {
    console.log("Distinct error:", error);
    return [];
  }
}

/**
 * DropCollection
 * ----------------------------------------------------
 * Permanently removes an entire collection (and its data)
 * from the specified MongoDB database.
 *
 * @param {string}  collection     - Name of the collection to drop.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<boolean | []>} `true` if the collection is dropped,
 *                                  or an empty array on failure.
 */
async function DropCollection(collection, databaseName) {
  try {
    // Choose the database to work with (parameter or default)
    const dbName = databaseName || mongoDb;

    // Get a connected `Db` instance
    const db = await getMongoClient(dbName);

    // Drop the collection and return MongoDB's boolean response
    return await db.collection(collection).drop();
  } catch (error) {
    // Log the error and return a safe fallback
    console.log("DropCollection error:", error);
    return [];
  }
}

/**
 * FindIDOne
 * ----------------------------------------------------
 * Retrieves a single document by its `_id` from the specified
 * MongoDB collection.
 *
 * @param {string|ObjectId} Id           - The document’s `_id`
 *                                         (string or ObjectId).
 * @param {string}          collection   - Collection name to query.
 * @param {string} [databaseName]        - Optional DB name; falls back
 *                                         to the global `mongoDb`.
 * @returns {Promise<Object>}            The matched document, or an empty
 *                                       object if not found / on error.
 */
async function FindIDOne(Id, collection, databaseName) {
  try {
    // Resolve database name (parameter overrides default)
    const dbName = databaseName || mongoDb;

    // Build query filter using a proper ObjectId
    const query = { _id: new ObjectId(Id) };

    // Ensure we have a live DB connection
    const db = await getMongoClient(dbName);

    // Fetch a single matching document
    return await db.collection(collection).findOne(query);
  } catch (error) {
    // Log and return an empty object to keep the API predictable
    console.error("FindIDOne error:", error);
    return {};
  }
}

/**
 * FindLimitLast
 * ------------------------------------------------------------------
 * Returns the last **`limit`** documents that match a filter, sorted by
 * `_id` in **descending** order (newest first).
 *
 * Behaviour notes
 *  • Any field name in `query` that contains “_id” is automatically
 *    converted to a MongoDB `ObjectId` before the query is executed.
 *  • Uses classic *limit / sort* (no pagination cursor).
 *
 * @param {Object}  query           - MongoDB filter object (e.g. `{ user_id:"..." }`).
 *                                    Fields containing “_id” are cast to `ObjectId`.
 * @param {number}  limit           - Max number of documents to return.
 * @param {string}  collection      - Collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 *
 * @returns {Promise<Array>}        Array with up to `limit` newest documents,
 *                                  or `[]` if an error occurs.
 */
async function FindLimitLast(query, limit, collection, databaseName) {
  try {
    /* -------- 1. Convert any *_id fields to ObjectId -------- */
    for (const key of Object.keys(query)) {
      if (key.includes("_id")) {
        query[key] = new ObjectId(query[key]);
      }
    }

    /* -------- 2. Select DB and connect -------- */
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    /* -------- 3. Query, sort DESC, limit -------- */
    return await db
      .collection(collection)
      .find(query)
      .sort({ _id: -1 }) // newest → oldest
      .limit(limit)
      .toArray();
  } catch (error) {
    console.log("FindLimitLast error:", error.message);
    return [];
  }
}

/**
 * FindMany
 * ----------------------------------------------------
 * Retrieves all documents that match a given filter from a collection
 * and returns them as an array.
 *
 * @param {Object}  query          - Standard MongoDB filter object
 *                                   (e.g. `{ status: "active" }`).
 * @param {string}  collection     - Name of the collection to query.
 * @param {string} [databaseName]  - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<Array>}       Array of matched documents, or an empty
 *                                 array if none found / on error.
 */
async function FindMany(query, collection, databaseName) {
  try {
    // Choose the database (explicit parameter or default)
    const dbName = databaseName || mongoDb;

    // Obtain a connection and run the query
    const db = await getMongoClient(dbName);
    return await db.collection(collection).find(query).toArray();
  } catch (error) {
    // Log the failure and return a predictable fallback
    console.log("FindMany error:", error);
    return [];
  }
}

/**
 * FindManyLimit
 * ----------------------------------------------------
 * Retrieves up to `limit` documents that match a given filter
 * from a MongoDB collection.
 *
 * @param {Object}  query           - MongoDB filter object.
 * @param {number}  limit           - Maximum number of documents to return.
 * @param {string}  collection      - Collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<Array>}        Array of matched documents (≤ limit),
 *                                  or an empty array on error.
 */
async function FindManyLimit(query, limit, collection, databaseName) {
  try {
    // Resolve DB name (explicit param overrides default)
    const dbName = databaseName || mongoDb;

    // Get a DB handle and execute the limited query
    const db = await getMongoClient(dbName);
    return await db.collection(collection).find(query).limit(limit).toArray();
  } catch (error) {
    // Log and return empty array if something goes wrong
    console.log("FindManyLimit error:", error);
    return [];
  }
}

/**
 * FindManyOptions
 * ----------------------------------------------------
 * Retrieves documents matching `query` with configurable options
 * such as sorting, projection, and limit.
 *
 * @param {Object}  query           - Filter to locate documents.
 * @param {string}  collection      - Collection name.
 *  @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @param {Object} [options]        - Configuration options:
 * @param {Object} [options.sort]   - Sort specification (e.g. `{ _id: -1, name: 1 }`).
 *                                   Defaults to `{ _id: 1 }` for consistency.
 * @param {Object} [options.projection] - Fields to include/exclude (e.g. `{ name: 1, _id: 0 }`).
 * @param {number} [options.limit]  - Maximum number of documents to return.
 * @param {number} [options.skip]   - Number of documents to skip (for pagination).
 *  @return {Promise<Array>}        Array of matched documents, or empty array `[]` on error.
 *
 */
async function FindManyOptions(query, collection, databaseName, options = {}) {
  try {
    // Determine which database to use
    const dbName = databaseName || mongoDb;

    // Obtain a DB handle
    const db = await getMongoClient(dbName);

    // Extract options with defaults
    const {
      sort = { _id: 1 }, // Default: ascending by _id (maintains compatibility)
      projection = {}, // Fields to include/exclude
      limit = 0, // Limit of documents to return
      skip = 0, // Number of documents to skip
      ...mongoOptions // Any other MongoDB option
    } = options;

    /* -------- Core operation -------- */
    let cursor = db
      .collection(collection)
      .find(query, { projection, ...mongoOptions })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    return await cursor.toArray();
  } catch (error) {
    console.log("FindManyOptions error:", error);
    return [];
  }
}

/**
 * FindOne
 * ----------------------------------------------------
 * Retrieves the first document that matches the provided filter
 * from a MongoDB collection.
 *
 * @param {Object}  query           - MongoDB filter object (e.g. `{ email: "x@x.com" }`).
 * @param {string}  collection      - Name of the collection to query.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<Object>}       The matched document, or an empty object on error.
 */
async function FindOne(query, collection, databaseName) {
  try {
    // Determine which database to use (parameter overrides default)
    const dbName = databaseName || mongoDb;

    // Obtain a DB handle (reuses or establishes connection)
    const db = await getMongoClient(dbName);

    // Fetch the first document that matches the filter
    return await db.collection(collection).findOne(query);
  } catch (error) {
    // Log the failure and return a safe fallback
    console.error("FindOne error:", error);
    return {};
  }
}

/**
 * FindOneAndUpdate
 * ----------------------------------------------------
 * Finds a single document matching `query`, applies the update
 * defined in `newProperties`, and returns the document (before or
 * after the update, depending on `options.returnDocument`).
 *
 * Helper behaviour:
 *  • Automatically converts any field containing “_id” in either
 *    `query` or `newProperties` into a MongoDB `ObjectId`.
 *  • Converts ISO date strings / timestamps in `newProperties`
 *    (e.g. inside `$set`) into native `Date` objects.
 *
 * @param {Object}  query           - Filter to locate the document.
 * @param {Object}  newProperties   - Update document (e.g. `{ $set: { ... } }`).
 * @param {string}  collection      - Collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @param {Object} [options]        - Options passed directly to `findOneAndUpdate`
 *                                    (e.g. `{ returnDocument: "after", upsert: true }`).
 * @returns {Promise<Document|null>} The matched document (depending on `returnDocument`)
 *                                   or `null` on error.
 */
async function FindOneAndUpdate(
  query,
  newProperties,
  collection,
  databaseName,
  options = {},
) {
  try {
    // Select the database (parameter → fallback to default)
    const dbName = databaseName || mongoDb;

    // Get DB handle
    const db = await getMongoClient(dbName);

    // Convert possible ObjectId / Date values
    query = ConvertIdtoObjectId(query);
    newProperties = ConvertIdtoObjectId(newProperties);
    newProperties = ConvertDatetoDatetime(newProperties);

    /* -------- Core operation -------- */
    return await db
      .collection(collection)
      .findOneAndUpdate(query, newProperties, options);
  } catch (err) {
    console.error("FindOneAndUpdate error:", err);
    return null;
  }
}

/**
 * FindOneLast
 * ----------------------------------------------------
 * Retrieves the most recent (or otherwise “last”) document that matches
 * a filter, based on a custom sort order.
 *
 * @param {Object}  query           - MongoDB filter (e.g. `{ status: "active" }`).
 * @param {Object}  sortobj         - Sort specification (e.g. `{ createdAt: -1 }`).
 *                                    Use descending order to fetch the latest record.
 * @param {string}  collection      - Collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<Object|[]>}    The single matched document, or an empty array on error.
 */
async function FindOneLast(query, sortobj, collection, databaseName) {
  try {
    // Decide which database to use
    const dbName = databaseName || mongoDb;

    // Obtain a DB handle
    const db = await getMongoClient(dbName);

    // Find → sort → limit(1) → toArray()   (cursor → [doc])
    const docs = await db
      .collection(collection)
      .find(query)
      .sort(sortobj)
      .limit(1)
      .toArray();

    // Return the first (and only) result, or undefined if none found
    return docs[0];
  } catch (error) {
    console.log("FindOneLast error:", error);
    return [];
  }
}

/**
 * GetAll
 * ----------------------------------------------------
 * Retrieves every document from the specified collection, sorted by `_id`
 * in ascending order.
 *
 * @param {string}  collection      - Name of the collection to read.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<Array>}        All documents in the collection, or an empty
 *                                  array if an error occurs.
 */
async function GetAll(collection, databaseName) {
  try {
    // Choose the target database (explicit param or default)
    const dbName = databaseName || mongoDb;

    // Establish / reuse a connection and obtain the DB handle
    const db = await getMongoClient(dbName);

    // Fetch all documents, sorted by _id ascending
    return await db.collection(collection).find().sort({ _id: 1 }).toArray();
  } catch (error) {
    console.log("GetAll error:", error);
    return [];
  }
}

/**
 * GetLastMongo
 * ----------------------------------------------------
 * Retrieves the last `limit` documents from a collection, ordered by `_id`.
 * A higher `_id` value is considered “newer” because MongoDB ObjectIds are
 * roughly chronological. Passing `limit = 1` effectively fetches the latest document.
 *
 * @param {number}  limit           - Maximum number of documents to return.
 * @param {string}  collection      - Collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<Array>}        Array with up to `limit` documents or `[]` on error.
 */
async function GetLastMongo(limit, collection, databaseName) {
  try {
    // Pick database: explicit param overrides global default
    const dbName = databaseName || mongoDb;

    // Ensure connection and obtain a DB handle
    const db = await getMongoClient(dbName);

    // Query everything, sort by _id descending (latest first), then limit
    return await db
      .collection(collection)
      .find()
      .sort({ _id: -1 }) // DESC to get newest first
      .limit(limit)
      .toArray();
  } catch (error) {
    console.log("GetLastMongo error:", error);
    return [];
  }
}

/**
 * ND_PopulateAuto
 * ------------------------------------------------------------------
 * Automatically detects `_id` reference fields across all documents
 * in the collection and creates `$lookup` stages to join related
 * collections. Filters out soft-deleted documents
 * (`status !== "deleted"`).
 *
 * Unlike `PopulateAuto`, this function scans ALL documents to
 * discover every possible `_id` field (not just the first match).
 *
 * @param {Object}  query          - MongoDB filter object.
 * @param {string}  collection     - Base collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<Array>}       Populated documents, or `[]` if none found / on error.
 */
async function ND_PopulateAuto(query, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;

    query = Object.keys(query).reduce((acc, key) => {
      if (key.includes("_id")) {
        return { ...acc, [key]: new ObjectId(query[key]) };
      }
      return { ...acc, [key]: query[key] };
    }, {});

    const queryNotDeleted = { ...query, ...operatorNotDeleted };
    const db = await getMongoClient(dbName);

    /* -------- 1. Collect all field names across the collection -------- */
    const allKeys = new Set();
    await db
      .collection(collection)
      .find()
      .forEach((doc) => {
        for (const key in doc) allKeys.add(key);
      });
    const properties = [...allKeys];

    if (properties.length === 0) return [];

    /* -------- 2. Build $lookup stages for _id references -------- */
    const idKeys = properties.filter((key) => key.includes("_id"));

    if (idKeys.length <= 1) {
      return await db
        .collection(collection)
        .find(queryNotDeleted)
        .toArray();
    }

    const aggregate = [{ $match: queryNotDeleted }];
    const lookups = idKeys.slice(1).map((toJoin) => {
      const collectionName = toJoin.replace("_id", "");
      return {
        $lookup: {
          from: collectionName,
          localField: toJoin,
          foreignField: "_id",
          as: collectionName,
        },
      };
    });
    aggregate.push(...lookups);

    return await db
      .collection(collection)
      .aggregate(aggregate)
      .toArray();
  } catch (error) {
    console.error("ND_PopulateAuto error:", error.message);
    return [];
  }
}

/**
 * FindPaginated
 * ------------------------------------------------------------------
 * Retrieves a specific “page” of documents that match `query`,
 * sorted by `_id` ASC, using classic *skip/limit* pagination.
 *
 * Formula: `skip = pageNumber * nPerPage`
 * (pageNumber is zero-based → page 0 = first chunk)
 *
 * @param {Object}  query           MongoDB filter object.
 * @param {number}  pageNumber      Zero-based page index (0 ⇒ first page).
 * @param {number}  nPerPage        Page size (number of documents per page).
 * @param {string}  collection      Collection name.
 * @param {string} [databaseName]   Optional DB name; defaults to global `mongoDb`.
 *
 * @returns {Promise<Array>}        Array with ≤ `nPerPage` documents, or `[]` on error.
 *
 * @example
 * // page 0 (first 20 docs)
 * const firstPage = await FindPaginated({}, 0, 20, "orders");
 *
 * // page 3 (docs 60-79)
 * const page3 = await FindPaginated({ status: "shipped" }, 3, 20, "orders");
 */
async function FindPaginated(
  query,
  pageNumber,
  nPerPage,
  collection,
  databaseName,
) {
  try {
    /* -------- choose database and connect -------- */
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    /* -------- calculate skip -------- */
    const skip = pageNumber > 0 ? pageNumber * nPerPage : 0;

    /* -------- run paginated query -------- */
    return await db
      .collection(collection)
      .find(query)
      .sort({ _id: 1 })
      .skip(skip)
      .limit(nPerPage)
      .toArray();
  } catch (error) {
    console.log("FindPaginated error:", error.message);
    return [];
  }
}

/**
 * FindPaginatedOptions
 * ----------------------------------------------------
 * Finds documents matching `query` with pagination support and
 * configurable sorting, projection, and performance options.
 * Returns an array of documents for the specified page.
 *
 * Helper behaviour:
 *  • Automatically converts any field containing "_id" in `query`
 *    into a MongoDB `ObjectId`.
 *  • Calculates `skip` based on zero-based page numbering
 *    (pageNumber 0 = first page, pageNumber 1 = second page, etc.).
 *  • Supports flexible sorting, field projection, index hints,
 *    and disk-based operations for large result sets.
 *
 * @param {Object}  query           - Filter to locate documents.
 * @param {number}  pageNumber      - Zero-based page number (0 = first page).
 * @param {number}  nPerPage        - Number of documents per page (limit).
 * @param {string}  collection      - Collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @param {Object} [options]        - Configuration options:
 * @param {Object} [options.sort]   - Sort specification (e.g. `{ _id: -1, name: 1 }`).
 *                                    Defaults to `{ _id: 1 }` for consistency.
 * @param {Object} [options.projection] - Fields to include/exclude (e.g. `{ name: 1, _id: 0 }`).
 * @param {Object} [options.hint]   - Index hint for query optimization.
 * @param {boolean} [options.allowDiskUse] - Allow disk usage for large sorts (default: false).
 * @returns {Promise<Array>}        Array of documents for the requested page,
 *                                  or empty array `[]` on error.
 */
async function FindPaginatedOptions(
  query,
  pageNumber,
  nPerPage,
  collection,
  databaseName,
  options = {},
) {
  try {
    // Select the database (parameter → fallback to default)
    const dbName = databaseName || mongoDb;

    // Get DB handle
    const db = await getMongoClient(dbName);

    // Convert possible ObjectId / Date values
    query = ConvertIdtoObjectId(query);

    // Calculate skip
    const skip = pageNumber > 0 ? pageNumber * nPerPage : 0;

    // Extract options with defaults
    const {
      sort = { _id: 1 },
      projection = {},
      hint = undefined,
      allowDiskUse = false,
      ...mongoOptions
    } = options;

    /* -------- Core operation -------- */
    let cursor = db
      .collection(collection)
      .find(query, { projection, hint, allowDiskUse, ...mongoOptions })
      .sort(sort)
      .skip(skip)
      .limit(nPerPage);

    return await cursor.toArray();
  } catch (error) {
    console.log("FindPaginatedOptions error:", error.message);
    return [];
  }
}

/**
 * SaveManyBatch
 * ----------------------------------------------------
 * Inserts a batch of documents into a collection, performing
 * automatic conversions for any `"_id"` or `"_datetime"` fields
 * found inside each object.
 *
 * Conversions applied to each element in `arrToSave`:
 *  • Every property name containing “_id”  → `ObjectId`
 *  • Every property name containing “_datetime” → native `Date`
 *
 * @param {Array<Object>} arrToSave      - Array of plain objects to insert.
 * @param {string}        collection     - Target collection name.
 * @param {string} [databaseName]        - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<InsertManyResult|[]>} MongoDB `InsertManyResult` on success,
 *                                        or empty array on error.
 */
async function SaveManyBatch(arrToSave, collection, databaseName) {
  return SavetoMongoMany(arrToSave, collection, databaseName);
}

/**
 * SavetoMongoMany
 * ------------------------------------------------------------------
 * Bulk-inserts an array of documents into a collection after normalising
 * any `_id` and `_datetime` fields inside each object.
 *
 * 🔄  Pre-processing for every element in `arrToSave`
 *   • Keys containing “_id”        ➜ converted to `ObjectId`
 *   • Keys containing “_datetime”  ➜ converted to native `Date`
 *
 * @param {Array<Object>} arrToSave      Array of plain JS objects to insert.
 * @param {string}        collection     Name of the target MongoDB collection.
 * @param {string} [databaseName]        Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<InsertManyResult|[]>}
 *          On success: MongoDB `InsertManyResult`
 *          On failure: empty array (and error logged to console).
 */
async function SavetoMongoMany(arrToSave, collection, databaseName) {
  try {
    // 1. Normalise ids and dates
    arrToSave = arrToSave.map(ConvertIdtoObjectId).map(ConvertDatetoDatetime);

    // 2. Obtain database handle
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    // 3. Bulk-insert and return the MongoDB result
    return await db.collection(collection).insertMany(arrToSave);
  } catch (error) {
    console.error("SavetoMongoMany error:", error.message);
    return [];
  }
}

/**
 * SavetoMongo
 * ------------------------------------------------------------------
 * Inserts a single document into a collection after normalising any
 * `_id` or `_datetime` fields.
 *
 * Steps performed:
 *  1. Converts keys containing “_id” → `ObjectId`.
 *  2. Converts keys containing “_datetime” → native `Date`.
 *  3. Obtains a database handle (using `databaseName` or default `mongoDb`).
 *  4. Executes `insertOne` and returns MongoDB’s `InsertOneResult`.
 *
 * @param {Object}  objectToSave   Plain JS object to be persisted.
 * @param {string}  collection     Target MongoDB collection.
 * @param {string} [databaseName]  Optional database name; defaults to `mongoDb`.
 * @returns {Promise<InsertOneResult|null>} Insert result on success, or
 *                                          `null` on failure.
 */
async function SavetoMongo(objectToSave, collection, databaseName) {
  try {
    // 1. Normalise any IDs and date-time strings
    objectToSave = ConvertIdtoObjectId(objectToSave);
    objectToSave = ConvertDatetoDatetime(objectToSave);

    // 2. Decide which database to use
    const dbName = databaseName || mongoDb;

    // 3. Get DB handle (reusing or establishing connection)
    const db = await getMongoClient(dbName);

    // 4. Insert the document and return the result
    return await db.collection(collection).insertOne(objectToSave);
  } catch (error) {
    console.error("SavetoMongo error:", error.message);
    return null;
  }
}

/**
 * UpdateMongo
 * ------------------------------------------------------------------
 * Updates a single document that matches `query` by applying a `$set`
 * with the provided `newProperties`.
 *
 * Pre-processing:
 *   • Converts any property containing “_id” in `newProperties` ➜ `ObjectId`.
 *   • Converts any property containing “_datetime” ➜ native `Date`.
 *
 * @param {Object}  query           - MongoDB filter to locate the document.
 * @param {Object}  newProperties   - Plain object with the fields to update.
 * @param {string}  collection      - Target collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}
 *          On success: MongoDB `UpdateResult`
 *          On failure : empty array (and error logged).
 */
async function UpdateMongo(query, newProperties, collection, databaseName) {
  try {
    /* -------- 1. Normalise update payload -------- */
    newProperties = ConvertIdtoObjectId(newProperties);
    newProperties = ConvertDatetoDatetime(newProperties);

    /* -------- 2. Choose DB and connect -------- */
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    /* -------- 3. Perform the update -------- */
    const result = await db
      .collection(collection)
      .updateOne(query, { $set: newProperties });

    return result; // { acknowledged, matchedCount, modifiedCount, upsertedId }
  } catch (error) {
    console.error("UpdateMongo error:", error);
    return [];
  }
}

/**
 * UpdateMongoBy_id
 * ------------------------------------------------------------------
 * Updates a single document identified by its `_id`, applying a `$set`
 * with the provided `newProperties`.
 *
 * Pre-processing steps:
 *   • Converts any property in `newProperties` whose key contains “_id”
 *     to `ObjectId`.
 *   • Converts any property whose key contains “_datetime” to native `Date`.
 *
 * @param {string|ObjectId} _id        - The document’s `_id` to update.
 * @param {Object}          newProperties - Plain object containing the fields to update.
 * @param {string}          collection - Target collection name.
 * @param {string} [databaseName]      - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}
 *          MongoDB `UpdateResult` on success, or an empty array on failure.
 */
async function UpdateMongoBy_id(_id, newProperties, collection, databaseName) {
  try {
    /* -------- 1. Normalise update payload -------- */
    newProperties = ConvertIdtoObjectId(newProperties);
    newProperties = ConvertDatetoDatetime(newProperties);

    /* -------- 2. Build filter by ObjectId -------- */
    const query = { _id: new ObjectId(_id) };

    /* -------- 3. Obtain DB handle -------- */
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    /* -------- 4. Perform update -------- */
    const result = await db
      .collection(collection)
      .updateOne(query, { $set: newProperties });

    return result; // { acknowledged, matchedCount, modifiedCount, upsertedId }
  } catch (error) {
    console.error("UpdateMongoBy_id error:", error.message);
    return [];
  }
}

/**
 * UpdateMongoMany
 * ------------------------------------------------------------------
 * Updates all documents that match `query` by applying a `$set`
 * with `newProperties`.
 *
 * Normalisation steps:
 *   1. Converts every field in `newProperties` whose key contains “_id”
 *      to an `ObjectId`, and every “_datetime” field to a native `Date`.
 *   2. Converts any key containing “_id” inside `query` to `ObjectId`,
 *      leaving other filter fields untouched.
 *
 * @param {Object}  query            - MongoDB filter to select documents.
 * @param {Object}  newProperties    - Values to be assigned via `$set`.
 * @param {string}  collection       - Target collection.
 * @param {string} [databaseName]    - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}
 *          MongoDB `UpdateResult` on success, empty array on failure.
 */
async function UpdateMongoMany(query, newProperties, collection, databaseName) {
  try {
    /* -------- 1. Normalise update payload -------- */
    newProperties = ConvertIdtoObjectId(newProperties);
    newProperties = ConvertDatetoDatetime(newProperties);

    /* -------- 2. Normalise filter (ObjectId conversion) -------- */
    query = Object.keys(query).reduce((acc, key) => {
      return key.includes("_id")
        ? { ...acc, [key]: new ObjectId(query[key]) }
        : { ...acc, [key]: query[key] };
    }, {});

    /* -------- 3. Database connection -------- */
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    /* -------- 4. Execute bulk update -------- */
    return await db
      .collection(collection)
      .updateMany(query, { $set: newProperties });
  } catch (error) {
    console.error("UpdateMongoMany error:", error);
    return [];
  }
}

/**
 * UpdateOneRaw
 * ------------------------------------------------------------------
 * Direct wrapper around MongoDB’s `updateOne`, allowing the caller to
 * pass a fully-formed update document (`newProperties`) and `options`
 * object without this helper forcing `$set`.
 *
 * Pre-processing:
 *   • Converts any field in `query` or `newProperties` whose key
 *     contains “_id” → `ObjectId`.
 *   • Converts any field whose key contains “_datetime” → native `Date`.
 *
 * @param {Object}  query           - Filter used to locate the document.
 * @param {Object}  newProperties   - Raw update document
 *                                    (e.g. `{ $inc: { counter: 1 } }`,
 *                                    `{ $set: {...}, $unset: {...} }`).
 * @param {string}  collection      - Collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to `mongoDb`.
 * @param {Object} [options={}]     - Options forwarded to `updateOne`
 *                                    (upsert, write concern, etc.).
 * @returns {Promise<UpdateResult|null>}
 *          The MongoDB `UpdateResult` on success, or `null` on failure.
 */
async function UpdateOneRaw(
  query,
  newProperties,
  collection,
  databaseName,
  options = {},
) {
  try {
    /* -------- 1. Decide database & connect -------- */
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    /* -------- 2. Normalise filter and update docs -------- */
    query = ConvertIdtoObjectId(query);
    newProperties = ConvertIdtoObjectId(newProperties);
    newProperties = ConvertDatetoDatetime(newProperties);

    /* -------- 3. Execute raw update -------- */
    return await db
      .collection(collection)
      .updateOne(query, newProperties, options);
  } catch (err) {
    console.error("UpdateOneRaw error:", err);
    return null;
  }
}

/**
 * UpsertMongo
 * ------------------------------------------------------------------
 * Updates a single document if it exists; otherwise inserts a new one.
 * (`updateOne` with `{ upsert: true }`)
 *
 * Pre-processing on `newProperties`:
 *   • Fields containing “_id”   ➜ converted to `ObjectId`
 *   • Fields containing “_datetime” ➜ converted to native `Date`
 *
 * @param {Object}  query            - Filter used to locate the document.
 * @param {Object}  newProperties    - Values to set (wrapped in `$set` automatically).
 * @param {string}  collection       - Collection name.
 * @param {string} [databaseName]    - Optional DB name; defaults to global `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}
 *          MongoDB `UpdateResult` (contains `upsertedId` if a new doc was created),
 *          or an empty array on failure.
 */
async function UpsertMongo(query, newProperties, collection, databaseName) {
  try {
    /* -------- 1. Normalise update payload -------- */
    newProperties = ConvertIdtoObjectId(newProperties);
    newProperties = ConvertDatetoDatetime(newProperties);

    /* -------- 2. Connect to the correct DB -------- */
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    /* -------- 3. Perform upsert -------- */
    return await db
      .collection(collection)
      .updateOne(query, { $set: newProperties }, { upsert: true });
  } catch (error) {
    console.log("UpsertMongo error:", error);
    return [];
  }
}

/**
 * SavetoMongoCallback
 * ------------------------------------------------------------------
 * Inserts a single document into a collection as a fire-and-forget
 * operation.
 *
 * @param {Object}  objectToSave   - Document to insert.
 * @param {string}  collection     - Target collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 */
async function SavetoMongoCallback(objectToSave, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    await db.collection(collection).insertOne(objectToSave);
  } catch (error) {
    console.error("SavetoMongoCallback error:", error.message);
  }
}

/**
 * InsertIndex
 * ------------------------------------------------------------------
 * Creates a non-unique index on the specified field(s) within a collection.
 *
 * @param {Object}  index          - Index specification (e.g. `{ email: 1 }`).
 * @param {string}  collection     - Collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<string|[]>}   Index name on success, empty array on failure.
 */
async function InsertIndex(index, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    return await db.collection(collection).createIndex(index);
  } catch (error) {
    console.error("InsertIndex error:", error.message);
    return [];
  }
}

/**
 * InsertIndexUnique
 * ------------------------------------------------------------------
 * Creates a unique index on the specified field(s) within a collection.
 *
 * @param {Object}  index          - Index specification (e.g. `{ email: 1 }`).
 * @param {string}  collection     - Collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<string|[]>}   Index name on success, empty array on failure.
 */
async function InsertIndexUnique(index, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    return await db
      .collection(collection)
      .createIndex(index, { unique: true });
  } catch (error) {
    console.error("InsertIndexUnique error:", error.message);
    return [];
  }
}

/**
 * ND_DeleteMongoby_id
 * ------------------------------------------------------------------
 * Soft-deletes a document by setting `{ status: "deleted" }`.
 * Additionally, if the collection has unique indexes, the indexed
 * field values are prefixed with `"Deleted{timestamp}-"` to free
 * the original values for reuse without violating uniqueness.
 *
 * @param {string|ObjectId} _id         - The document's `_id`.
 * @param {string}          collection  - Collection name.
 * @param {string} [databaseName]       - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}  Update result on success, empty array on failure.
 */
async function ND_DeleteMongoby_id(_id, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: new ObjectId(_id) };

    /* -------- 1. Soft-delete the document -------- */
    const result = await db
      .collection(collection)
      .updateOne(query, { $set: tagDeleted });

    /* -------- 2. Handle unique index conflicts -------- */
    const indexes = await db.collection(collection).indexes();
    const indexedFields = indexes
      .map((idx) => Object.keys(idx.key)[0])
      .slice(1);

    if (indexedFields.length > 0) {
      const docs = await db.collection(collection).find(query).toArray();
      const doc = docs[0];

      const renamedIndexValues = indexedFields.reduce((acc, property) => {
        return {
          ...acc,
          [property]: "Deleted" + Date.now() + "-" + doc[property],
        };
      }, {});

      await db
        .collection(collection)
        .updateOne(query, { $set: renamedIndexValues });
    }

    return result;
  } catch (error) {
    console.error("ND_DeleteMongoby_id error:", error.message);
    return [];
  }
}

/**
 * getIndexs
 * ------------------------------------------------------------------
 * Retrieves all indexes defined on a collection.
 *
 * @param {string}  collection     - Collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<Array>}       Array of index definitions, or `[]` on error.
 */
async function getIndexs(collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    return await db.collection(collection).indexes();
  } catch (error) {
    console.error("getIndexs error:", error.message);
    return [];
  }
}

/**
 * UpdateMongoManyRename
 * ------------------------------------------------------------------
 * Renames fields in all documents matching `query` using the
 * `$rename` operator.
 *
 * @param {Object}  query           - Filter to select documents.
 * @param {Object}  newProperties   - Rename mapping (e.g. `{ oldName: "newName" }`).
 * @param {string}  collection      - Collection name.
 * @param {string} [databaseName]   - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>} Update result on success, empty array on failure.
 */
async function UpdateMongoManyRename(
  query,
  newProperties,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    return await db
      .collection(collection)
      .updateMany(query, { $rename: newProperties });
  } catch (error) {
    console.error("UpdateMongoManyRename error:", error.message);
    return [];
  }
}

/**
 * UpdateMongoBy_idPush
 * ------------------------------------------------------------------
 * Pushes a value into an array field of a single document
 * identified by its `_id`.
 *
 * @param {string|ObjectId} _id           - The document's `_id`.
 * @param {Object}          newProperties - Push specification (e.g. `{ tags: "new" }`).
 * @param {string}          collection    - Collection name.
 * @param {string} [databaseName]         - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}    Update result on success, empty array on failure.
 */
async function UpdateMongoBy_idPush(
  _id,
  newProperties,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: new ObjectId(_id) };
    return await db
      .collection(collection)
      .updateOne(query, { $push: newProperties });
  } catch (error) {
    console.error("UpdateMongoBy_idPush error:", error.message);
    return [];
  }
}

/**
 * UpdateMongoManyBy_idPush
 * ------------------------------------------------------------------
 * Pushes a value into an array field for multiple documents
 * identified by an array of `_id` values.
 *
 * @param {Array<string|ObjectId>} _idArr         - Array of document `_id`s.
 * @param {Object}                 newProperties  - Push specification.
 * @param {string}                 collection     - Collection name.
 * @param {string} [databaseName]                 - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}            Update result on success, empty array on failure.
 */
async function UpdateMongoManyBy_idPush(
  _idArr,
  newProperties,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: { $in: _idArr.map((e) => new ObjectId(e)) } };
    return await db
      .collection(collection)
      .updateMany(query, { $push: newProperties });
  } catch (error) {
    console.error("UpdateMongoManyBy_idPush error:", error.message);
    return [];
  }
}

/**
 * UpdateMongoManyBy_idAddToSet
 * ------------------------------------------------------------------
 * Adds a value to an array field (only if not already present) for
 * multiple documents identified by an array of `_id` values.
 *
 * @param {Array<string|ObjectId>} _idArr         - Array of document `_id`s.
 * @param {Object}                 newProperties  - AddToSet specification.
 * @param {string}                 collection     - Collection name.
 * @param {string} [databaseName]                 - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}            Update result on success, empty array on failure.
 */
async function UpdateMongoManyBy_idAddToSet(
  _idArr,
  newProperties,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: { $in: _idArr.map((e) => new ObjectId(e)) } };
    return await db
      .collection(collection)
      .updateMany(query, { $addToSet: newProperties });
  } catch (error) {
    console.error("UpdateMongoManyBy_idAddToSet error:", error.message);
    return [];
  }
}

/**
 * UpdateMongoManyBy_idPull
 * ------------------------------------------------------------------
 * Removes a value from an array field for multiple documents
 * identified by an array of `_id` values.
 *
 * @param {Array<string|ObjectId>} _idArr         - Array of document `_id`s.
 * @param {Object}                 newProperties  - Pull specification.
 * @param {string}                 collection     - Collection name.
 * @param {string} [databaseName]                 - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}            Update result on success, empty array on failure.
 */
async function UpdateMongoManyBy_idPull(
  _idArr,
  newProperties,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: { $in: _idArr.map((e) => new ObjectId(e)) } };
    return await db
      .collection(collection)
      .updateMany(query, { $pull: newProperties });
  } catch (error) {
    console.error("UpdateMongoManyBy_idPull error:", error.message);
    return [];
  }
}

/**
 * UpdateMongoManyPullIDToCollectionPull
 * ------------------------------------------------------------------
 * Removes matching values from array fields across all documents
 * that contain them. Uses `$pull` with the query as both the filter
 * and the pull specification.
 *
 * @param {Object}  query          - Filter and pull specification
 *                                   (e.g. `{ eventos_id: "abc" }`).
 * @param {string}  collection     - Collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>} Update result on success, empty array on failure.
 */
async function UpdateMongoManyPullIDToCollectionPull(
  query,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    return await db
      .collection(collection)
      .updateMany(query, { $pull: query });
  } catch (error) {
    console.error(
      "UpdateMongoManyPullIDToCollectionPull error:",
      error.message,
    );
    return [];
  }
}

/**
 * UpdateMongoBy_idRemoveProperty
 * ------------------------------------------------------------------
 * Removes (unsets) a single property from a document identified
 * by its `_id`.
 *
 * @param {string|ObjectId} _id        - The document's `_id`.
 * @param {string}          property   - Name of the property to remove.
 * @param {string}          collection - Collection name.
 * @param {string} [databaseName]      - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>} Update result on success, empty array on failure.
 */
async function UpdateMongoBy_idRemoveProperty(
  _id,
  property,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: new ObjectId(_id) };
    return await db
      .collection(collection)
      .updateOne(query, { $unset: { [property]: 1 } });
  } catch (error) {
    console.error("UpdateMongoBy_idRemoveProperty error:", error.message);
    return [];
  }
}

/**
 * UpdateBy_idPush_id
 * ------------------------------------------------------------------
 * Pushes an ObjectId reference into an array field of a document.
 * The array field name is derived from `originCollection`.
 *
 * @param {string|ObjectId} _id              - The document's `_id`.
 * @param {string}          originCollection - Name used as the array field key.
 * @param {string|ObjectId} new_id           - The ObjectId value to push.
 * @param {string}          collection       - Collection name.
 * @param {string} [databaseName]            - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>}       Update result on success, empty array on failure.
 */
async function UpdateBy_idPush_id(
  _id,
  originCollection,
  new_id,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: new ObjectId(_id) };
    return await db
      .collection(collection)
      .updateOne(query, {
        $push: { [originCollection]: new ObjectId(new_id) },
      });
  } catch (error) {
    console.error("UpdateBy_idPush_id error:", error.message);
    return [];
  }
}

/**
 * DeleteMongoCallback
 * ------------------------------------------------------------------
 * Deletes a single document by its `_id` as a fire-and-forget
 * operation.
 *
 * @param {string|ObjectId} idObjectToDelete - The document's `_id`.
 * @param {string}          collection       - Collection name.
 * @param {string} [databaseName]            - Optional DB name; defaults to `mongoDb`.
 */
async function DeleteMongoCallback(
  idObjectToDelete,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    await db.collection(collection).deleteOne({ _id: idObjectToDelete });
  } catch (error) {
    console.error("DeleteMongoCallback error:", error.message);
  }
}

/**
 * GetNextSequenceValue
 * ------------------------------------------------------------------
 * Atomically increments a `sequence_value` field and returns the
 * value **before** the increment. Useful for generating sequential
 * IDs or counters.
 *
 * If the document does not exist, it is created via `upsert: true`.
 *
 * @param {Object}  query          - Filter to locate the sequence document.
 * @param {number}  increment      - Amount to increment by.
 * @param {string}  collection     - Collection storing the sequence.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<number|null>} The sequence value before increment,
 *                                 or `null` on error.
 */
async function GetNextSequenceValue(
  query,
  increment,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    const result = await db
      .collection(collection)
      .findOneAndUpdate(
        query,
        { $inc: { sequence_value: increment } },
        { upsert: true },
      );

    return result.value.sequence_value;
  } catch (error) {
    console.error("GetNextSequenceValue error:", error.message);
    return null;
  }
}

/**
 * ND_FindOne
 * ------------------------------------------------------------------
 * Retrieves the first document matching `query` that has not been
 * soft-deleted (`status !== "deleted"`).
 *
 * @param {Object}  query          - MongoDB filter object.
 * @param {string}  collection     - Collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<Object>}      The matched document, or `{}` on error.
 */
async function ND_FindOne(query, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const queryNotDeleted = { ...query, ...operatorNotDeleted };
    return await db.collection(collection).findOne(queryNotDeleted);
  } catch (error) {
    console.error("ND_FindOne error:", error.message);
    return {};
  }
}

/**
 * ND_FindMany
 * ------------------------------------------------------------------
 * Retrieves all documents matching `query` that have not been
 * soft-deleted, with configurable sort order.
 *
 * @param {Object}  query          - MongoDB filter object.
 * @param {string}  collection     - Collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @param {Object} [order]         - Sort specification; defaults to `{ _id: 1 }`.
 * @returns {Promise<Array>}       Array of matched documents, or `[]` on error.
 */
async function ND_FindMany(
  query,
  collection,
  databaseName,
  order = { _id: 1 },
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const queryNotDeleted = { ...query, ...operatorNotDeleted };
    return await db
      .collection(collection)
      .find(queryNotDeleted)
      .sort(order)
      .toArray();
  } catch (error) {
    console.error("ND_FindMany error:", error.message);
    return [];
  }
}

/**
 * ND_FindPaginated
 * ------------------------------------------------------------------
 * Retrieves a specific page of documents matching `query` that
 * have not been soft-deleted, sorted by `_id` ascending.
 *
 * @param {Object}  query          - MongoDB filter object.
 * @param {number}  pageNumber     - Zero-based page index.
 * @param {number}  nPerPage       - Number of documents per page.
 * @param {string}  collection     - Collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<Array>}       Array with ≤ `nPerPage` documents,
 *                                 or `[]` on error.
 */
async function ND_FindPaginated(
  query,
  pageNumber,
  nPerPage,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const queryNotDeleted = { ...query, ...operatorNotDeleted };
    const skip = pageNumber > 0 ? pageNumber * nPerPage : 0;

    return await db
      .collection(collection)
      .find(queryNotDeleted)
      .sort({ _id: 1 })
      .skip(skip)
      .limit(nPerPage)
      .toArray();
  } catch (error) {
    console.error("ND_FindPaginated error:", error.message);
    return [];
  }
}

/**
 * Populate
 * ------------------------------------------------------------------
 * Performs `$lookup` joins on a collection using the specified
 * foreign collection names. Each join assumes the local field
 * is `"{collectionName}_id"` and the foreign field is `"_id"`.
 *
 * @param {string}        collection      - Base collection name.
 * @param {string} [databaseName]         - Optional DB name; defaults to `mongoDb`.
 * @param {Array<string>} joinCollection  - Array of collection names to join.
 * @returns {Promise<Array>}              Populated documents, or `[]` on error.
 */
async function Populate(collection, databaseName, joinCollection) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    const lookup = joinCollection.map((toJoin) => ({
      $lookup: {
        from: toJoin,
        localField: toJoin + "_id",
        foreignField: "_id",
        as: toJoin,
      },
    }));

    return await db.collection(collection).aggregate(lookup).toArray();
  } catch (error) {
    console.error("Populate error:", error.message);
    return [];
  }
}

/**
 * PopulateAuto
 * ------------------------------------------------------------------
 * Automatically detects `_id` reference fields in the first matching
 * document and creates `$lookup` stages to join the related
 * collections. The foreign collection name is inferred by stripping
 * `"_id"` from the field name (e.g. `user_id` → `user` collection).
 *
 * @param {Object}  query          - MongoDB filter object.
 * @param {string}  collection     - Base collection name.
 * @param {string} [databaseName]  - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<Array>}       Populated documents, or `[]` if none found / on error.
 */
async function PopulateAuto(query, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);

    if (query._id) query._id = new ObjectId(query._id);

    const doc = await db.collection(collection).findOne(query);
    if (!doc) return [];

    const allKeys = Object.keys(doc).filter((key) => key.includes("_id"));

    if (allKeys.length <= 1) {
      return await db.collection(collection).find(query).toArray();
    }

    const aggregate = [{ $match: query }];
    const lookups = allKeys.slice(1).map((toJoin) => {
      const collectionName = toJoin.replace("_id", "");
      return {
        $lookup: {
          from: collectionName,
          localField: toJoin,
          foreignField: "_id",
          as: collectionName,
        },
      };
    });
    aggregate.push(...lookups);

    return await db.collection(collection).aggregate(aggregate).toArray();
  } catch (error) {
    console.error("PopulateAuto error:", error.message);
    return [];
  }
}

/**
 * FindIDOnePopulated
 * ------------------------------------------------------------------
 * Finds a single document by `_id` and automatically populates
 * all detected `_id` reference fields via `$lookup`.
 *
 * @param {string|ObjectId} Id          - The document's `_id`.
 * @param {string}          collection  - Collection name.
 * @param {string} [databaseName]       - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<Array|Object>}     Populated documents array, or `{}`
 *                                      if not found / on error.
 */
async function FindIDOnePopulated(Id, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: new ObjectId(Id) };

    const doc = await db.collection(collection).findOne(query);
    if (!doc) return {};

    const allKeys = Object.keys(doc).filter((key) => key.includes("_id"));

    if (allKeys.length <= 1) {
      return await db.collection(collection).find(query).toArray();
    }

    const aggregate = [{ $match: query }];
    const lookups = allKeys.slice(1).map((toJoin) => {
      const collectionName = toJoin.replace("_id", "");
      return {
        $lookup: {
          from: collectionName,
          localField: toJoin,
          foreignField: "_id",
          as: collectionName,
        },
      };
    });
    aggregate.push(...lookups);

    return await db.collection(collection).aggregate(aggregate).toArray();
  } catch (error) {
    console.error("FindIDOnePopulated error:", error.message);
    return {};
  }
}

/**
 * ND_FindIDOnePopulated
 * ------------------------------------------------------------------
 * Finds a single non-deleted document by `_id` and automatically
 * populates all detected `_id` reference fields via `$lookup`.
 *
 * @param {string|ObjectId} Id          - The document's `_id`.
 * @param {string}          collection  - Collection name.
 * @param {string} [databaseName]       - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<Array|Object>}     Populated documents array, or `{}`
 *                                      if not found / on error.
 */
async function ND_FindIDOnePopulated(Id, collection, databaseName) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    const query = { _id: new ObjectId(Id) };
    const queryNotDeleted = { ...query, ...operatorNotDeleted };

    const doc = await db.collection(collection).findOne(queryNotDeleted);
    if (!doc) return {};

    const allKeys = Object.keys(doc).filter((key) => key.includes("_id"));

    if (allKeys.length <= 1) {
      return await db
        .collection(collection)
        .find(queryNotDeleted)
        .toArray();
    }

    const aggregate = [{ $match: queryNotDeleted }];
    const lookups = allKeys.slice(1).map((toJoin) => {
      const collectionName = toJoin.replace("_id", "");
      return {
        $lookup: {
          from: collectionName,
          localField: toJoin,
          foreignField: "_id",
          as: collectionName,
        },
      };
    });
    aggregate.push(...lookups);

    return await db.collection(collection).aggregate(aggregate).toArray();
  } catch (error) {
    console.error("ND_FindIDOnePopulated error:", error.message);
    return {};
  }
}

/**
 * UpdateMongoManyPull
 * ------------------------------------------------------------------
 * Removes values from array fields across all documents matching
 * `query` using the `$pull` operator.
 *
 * @param {Object}  query             - Filter to select documents.
 * @param {Object}  propertiesRemove  - Pull specification (e.g. `{ tags: "old" }`).
 * @param {string}  collection        - Collection name.
 * @param {string} [databaseName]     - Optional DB name; defaults to `mongoDb`.
 * @returns {Promise<UpdateResult|[]>} Update result on success, empty array on failure.
 */
async function UpdateMongoManyPull(
  query,
  propertiesRemove,
  collection,
  databaseName,
) {
  try {
    const dbName = databaseName || mongoDb;
    const db = await getMongoClient(dbName);
    return await db
      .collection(collection)
      .updateMany(query, { $pull: propertiesRemove });
  } catch (error) {
    console.error("UpdateMongoManyPull error:", error.message);
    return [];
  }
}

const factory = function (connectionString, defaultDbName) {
  mongo = { uri: connectionString };
  mongoDb = defaultDbName;

  return {
    AggregationMongo,
    AggregationMongoCursor,
    Count,
    DeleteMongo,
    DeleteMongoby_id,
    DeleteMongoCallback,
    disconnect: () => mongoDBConnectionManager.closeAllConnections(),
    Distinct,
    DropCollection,
    FindIDOne,
    FindIDOnePopulated,
    FindLimitLast,
    FindMany,
    FindManyLimit,
    FindManyOptions,
    FindOne,
    FindOneAndUpdate,
    FindOneLast,
    FindPaginated,
    FindPaginatedOptions,
    GetAll,
    getIndexs,
    GetLastMongo,
    GetNextSequenceValue,
    InsertIndex,
    InsertIndexUnique,
    ND_DeleteMongoby_id,
    ND_FindIDOnePopulated,
    ND_FindMany,
    ND_FindOne,
    ND_FindPaginated,
    ND_PopulateAuto,
    ObjectId,
    Populate,
    PopulateAuto,
    SaveManyBatch,
    SavetoMongo,
    SavetoMongoCallback,
    SavetoMongoMany,
    UpdateBy_idPush_id,
    UpdateMongo,
    UpdateMongoBy_id,
    UpdateMongoBy_idPush,
    UpdateMongoBy_idRemoveProperty,
    UpdateMongoMany,
    UpdateMongoManyBy_idAddToSet,
    UpdateMongoManyBy_idPull,
    UpdateMongoManyBy_idPush,
    UpdateMongoManyPull,
    UpdateMongoManyPullIDToCollectionPull,
    UpdateMongoManyRename,
    UpdateOneRaw,
    UpsertMongo,
  };
};

factory.ObjectId = ObjectId;
module.exports = factory;
