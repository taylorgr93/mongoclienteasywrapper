// test.js
const assert = require("assert");
const { ObjectId } = require("mongodb");
const MongoWraper = require("../index")(
  "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.3.0",
);

const testCollection = "testCollection";
const testCollection2 = "testCollection2";
const testDB = "testDB";
const testIdDocument1 = "624e09075bda143a913c5d61";
const testIdDocument2 = "624e09075bda143a913c5d62";
const testIdDocument3 = "624e09075bda143a913c5d63";

const arrayToSave = [
  {
    _id: new ObjectId(testIdDocument1),
    name: "Test Document 1",
    status: "active",
    datetime: new Date(),
  },
  {
    _id: new ObjectId(testIdDocument2),
    name: "Test Document 2",
    status: "active",
    datetime: new Date(),
  },
  {
    _id: new ObjectId(testIdDocument3),
    name: "Test Document 3",
    status: "active",
    datetime: new Date(),
  },
];

const testIdDocument4 = "624e09075bda143a913c5d64";
const testIdDocument5 = "624e09075bda143a913c5d65";
const testIdDocument6 = "624e09075bda143a913c5d66";

const arrayToSaveReference = [
  {
    _id: new ObjectId(testIdDocument4),
    name: "Test Document 4",
    testCollection_id: new ObjectId(testIdDocument1),
    status: "active",
    datetime: new Date(),
  },
  {
    _id: new ObjectId(testIdDocument5),
    name: "Test Document 5",
    testCollection_id: new ObjectId(testIdDocument2),
    status: "active",
    datetime: new Date(),
  },
  {
    _id: new ObjectId(testIdDocument6),
    name: "Test Document 6",
    testCollection_id: new ObjectId(testIdDocument6),
    status: "active",
    datetime: new Date(),
  },
];

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.error(`  ✗ ${name} — ${error.message}`);
  }
}

// --------------- Existing tests with assertions ---------------

const testSavetoMongo = async () => {
  const documentToSave = {
    _id: new ObjectId(testIdDocument1),
    name: "Test Document",
    status: "active",
    datetime: new Date(),
  };

  const result = await MongoWraper.SavetoMongo(
    documentToSave,
    testCollection,
    testDB,
  );

  assert.strictEqual(result.acknowledged, true, "insert should be acknowledged");
  assert.ok(result.insertedId, "insertedId should exist");
};

const testFindIDOne = async () => {
  const result = await MongoWraper.FindIDOne(
    testIdDocument1,
    testCollection,
    testDB,
  );

  assert.ok(result._id, "document should have _id");
  assert.strictEqual(result.name, "Test Document", "name should match");
};

const testUpdateMongoBy_id = async () => {
  const result = await MongoWraper.UpdateMongoBy_id(
    testIdDocument1,
    { newProperty: "newValue" },
    testCollection,
    testDB,
  );

  assert.strictEqual(result.matchedCount, 1, "should match 1 document");
  assert.strictEqual(result.modifiedCount, 1, "should modify 1 document");
};

const testDeleteMongoby_id = async () => {
  const result = await MongoWraper.DeleteMongoby_id(
    testIdDocument1,
    testCollection,
    testDB,
  );

  assert.strictEqual(result.deletedCount, 1, "should delete 1 document");
};

const testSavetoMongoMany = async () => {
  const result = await MongoWraper.SavetoMongoMany(
    arrayToSave,
    testCollection,
    testDB,
  );

  assert.strictEqual(result.acknowledged, true, "insert should be acknowledged");
  assert.strictEqual(result.insertedCount, 3, "should insert 3 documents");
};

const testAggregationMongo = async () => {
  const aggregationPipeline = [
    {
      $match: {
        _id: {
          $in: [
            new ObjectId(testIdDocument1),
            new ObjectId(testIdDocument2),
            new ObjectId(testIdDocument3),
          ],
        },
        status: { $ne: "deleted" },
      },
    },
    { $sort: { _id: -1 } },
  ];

  const result = await MongoWraper.AggregationMongo(
    aggregationPipeline,
    testCollection,
    testDB,
  );

  assert.strictEqual(result.length, 3, "should return 3 documents");
  assert.strictEqual(
    result[0]._id.toString(),
    testIdDocument3,
    "first result should be the last inserted (desc sort)",
  );
};

const testDeleteMongo = async (arrayToRemove, collection, expectedCount) => {
  const query = { _id: { $in: arrayToRemove } };
  const result = await MongoWraper.DeleteMongo(query, collection, testDB);

  assert.strictEqual(result.acknowledged, true, "delete should be acknowledged");
  assert.strictEqual(
    result.deletedCount,
    expectedCount,
    `should delete ${expectedCount} documents`,
  );
};

const testSaveManyBatch = async () => {
  const result = await MongoWraper.SaveManyBatch(
    arrayToSaveReference,
    testCollection2,
    testDB,
  );

  assert.strictEqual(result.acknowledged, true, "insert should be acknowledged");
  assert.strictEqual(result.insertedCount, 3, "should insert 3 documents");
};

const testUpdateMongoMany = async (collection) => {
  const result = await MongoWraper.UpdateMongoMany(
    { status: "active" },
    { newProperty: "newValue" },
    collection,
    testDB,
  );

  assert.strictEqual(result.matchedCount, 3, "should match 3 documents");
  assert.strictEqual(result.modifiedCount, 3, "should modify 3 documents");
};

const testND_PopulateAuto = async () => {
  const result = await MongoWraper.ND_PopulateAuto(
    { _id: testIdDocument4 },
    testCollection2,
    testDB,
  );

  assert.ok(Array.isArray(result), "result should be an array");
  assert.ok(result.length >= 1, "should return at least 1 document");
  assert.ok(
    Array.isArray(result[0].testCollection),
    "testCollection should be populated as array",
  );
  assert.strictEqual(
    result[0].testCollection[0]._id.toString(),
    testIdDocument1,
    "populated doc should match referenced _id",
  );
};

// --------------- Core CRUD tests ---------------

const testFindOne = async () => {
  const result = await MongoWraper.FindOne(
    { name: "Test Document 1" },
    testCollection,
    testDB,
  );

  assert.ok(result, "should return a document");
  assert.ok(result._id, "document should have _id");
  assert.strictEqual(result.name, "Test Document 1", "name should match");
};

const testFindMany = async () => {
  const result = await MongoWraper.FindMany(
    {
      _id: {
        $in: [
          new ObjectId(testIdDocument1),
          new ObjectId(testIdDocument2),
          new ObjectId(testIdDocument3),
        ],
      },
      status: "active",
    },
    testCollection,
    testDB,
  );

  assert.ok(Array.isArray(result), "should return an array");
  assert.strictEqual(result.length, 3, "should find 3 active documents");
};

const testFindManyLimit = async () => {
  const result = await MongoWraper.FindManyLimit(
    {
      _id: {
        $in: [
          new ObjectId(testIdDocument1),
          new ObjectId(testIdDocument2),
          new ObjectId(testIdDocument3),
        ],
      },
    },
    2,
    testCollection,
    testDB,
  );

  assert.ok(Array.isArray(result), "should return an array");
  assert.strictEqual(result.length, 2, "should return only 2 documents");
};

const testUpdateMongo = async () => {
  const result = await MongoWraper.UpdateMongo(
    { name: "Test Document 1" },
    { updatedField: "updated" },
    testCollection,
    testDB,
  );

  assert.strictEqual(result.matchedCount, 1, "should match 1 document");
  assert.strictEqual(result.modifiedCount, 1, "should modify 1 document");
};

const testUpsertMongo = async () => {
  const upsertId = "624e09075bda143a913c5d70";

  const insertResult = await MongoWraper.UpsertMongo(
    { _id: new ObjectId(upsertId) },
    { name: "Upserted Doc", status: "active" },
    testCollection,
    testDB,
  );

  assert.ok(insertResult.upsertedId, "should insert new document");

  const updateResult = await MongoWraper.UpsertMongo(
    { _id: new ObjectId(upsertId) },
    { name: "Upserted Doc", status: "updated" },
    testCollection,
    testDB,
  );

  assert.strictEqual(updateResult.matchedCount, 1, "should match existing document");
  assert.strictEqual(updateResult.upsertedCount, 0, "should not insert again");

  await MongoWraper.DeleteMongoby_id(upsertId, testCollection, testDB);
};

const testCount = async () => {
  const result = await MongoWraper.Count(
    {
      _id: {
        $in: [
          new ObjectId(testIdDocument1),
          new ObjectId(testIdDocument2),
          new ObjectId(testIdDocument3),
        ],
      },
    },
    testCollection,
    testDB,
  );

  assert.strictEqual(typeof result, "number", "should return a number");
  assert.strictEqual(result, 3, "should count 3 documents");
};

// --------------- ConvertIdtoObjectId tests ---------------

const { ConvertIdtoObjectId } = require("../utils/convertId");

const testConvertValidHex = async () => {
  const result = ConvertIdtoObjectId({ user_id: testIdDocument1 });
  assert.ok(result.user_id instanceof ObjectId, "should convert valid hex to ObjectId");
  assert.strictEqual(result.user_id.toString(), testIdDocument1);
};

const testConvertInvalidString = async () => {
  const result = ConvertIdtoObjectId({ user_id: "not-a-valid-id" });
  assert.strictEqual(result.user_id, "not-a-valid-id", "should leave invalid string as-is");
};

const testConvertNull = async () => {
  const result = ConvertIdtoObjectId({ user_id: null });
  assert.strictEqual(result.user_id, null, "should leave null as-is");
};

const testConvertNested = async () => {
  const result = ConvertIdtoObjectId({
    data: { order_id: testIdDocument1 },
  });
  assert.ok(result.data.order_id instanceof ObjectId, "should convert nested _id fields");
};

const testConvertOperator = async () => {
  const result = ConvertIdtoObjectId({
    $set: { user_id: testIdDocument1 },
  });
  assert.ok(result.$set.user_id instanceof ObjectId, "should convert inside $ operators");
};

const testConvertArray = async () => {
  const result = ConvertIdtoObjectId({
    user_id: [testIdDocument1, testIdDocument2],
  });
  assert.ok(Array.isArray(result.user_id), "should return an array");
  assert.ok(result.user_id[0] instanceof ObjectId, "should convert array items to ObjectId");
  assert.ok(result.user_id[1] instanceof ObjectId, "should convert all array items");
};

const testConvertSkipsNonIdKeys = async () => {
  const result = ConvertIdtoObjectId({ name: "Alice", status: "active" });
  assert.strictEqual(result.name, "Alice", "should not modify non-id fields");
  assert.strictEqual(result.status, "active", "should preserve other fields");
};

const testConvertAlreadyObjectId = async () => {
  const oid = new ObjectId(testIdDocument1);
  const result = ConvertIdtoObjectId({ user_id: oid });
  assert.ok(result.user_id instanceof ObjectId, "should keep existing ObjectId");
};

// --------------- FindManyOptions tests ---------------

const testFindManyOptionsSort = async () => {
  const result = await MongoWraper.FindManyOptions(
    {
      _id: {
        $in: [
          new ObjectId(testIdDocument1),
          new ObjectId(testIdDocument2),
          new ObjectId(testIdDocument3),
        ],
      },
    },
    testCollection,
    testDB,
    { sort: { _id: -1 } },
  );

  assert.ok(Array.isArray(result), "should return an array");
  assert.strictEqual(result.length, 3, "should return 3 documents");
  assert.strictEqual(
    result[0]._id.toString(),
    testIdDocument3,
    "first result should be the last _id (desc sort)",
  );
};

const testFindManyOptionsLimit = async () => {
  const result = await MongoWraper.FindManyOptions(
    {
      _id: {
        $in: [
          new ObjectId(testIdDocument1),
          new ObjectId(testIdDocument2),
          new ObjectId(testIdDocument3),
        ],
      },
    },
    testCollection,
    testDB,
    { limit: 2 },
  );

  assert.ok(Array.isArray(result), "should return an array");
  assert.strictEqual(result.length, 2, "should return only 2 documents");
};

const testFindManyOptionsSkip = async () => {
  const all = await MongoWraper.FindManyOptions(
    {
      _id: {
        $in: [
          new ObjectId(testIdDocument1),
          new ObjectId(testIdDocument2),
          new ObjectId(testIdDocument3),
        ],
      },
    },
    testCollection,
    testDB,
    { sort: { _id: 1 } },
  );

  const skipped = await MongoWraper.FindManyOptions(
    {
      _id: {
        $in: [
          new ObjectId(testIdDocument1),
          new ObjectId(testIdDocument2),
          new ObjectId(testIdDocument3),
        ],
      },
    },
    testCollection,
    testDB,
    { sort: { _id: 1 }, skip: 1 },
  );

  assert.strictEqual(skipped.length, 2, "should return 2 documents after skipping 1");
  assert.strictEqual(
    skipped[0]._id.toString(),
    all[1]._id.toString(),
    "first skipped result should be the second document",
  );
};

const testFindManyOptionsProjection = async () => {
  const result = await MongoWraper.FindManyOptions(
    { _id: new ObjectId(testIdDocument1) },
    testCollection,
    testDB,
    { projection: { name: 1, _id: 0 } },
  );

  assert.strictEqual(result.length, 1, "should return 1 document");
  assert.ok(result[0].name, "should include projected field");
  assert.strictEqual(result[0]._id, undefined, "should exclude _id");
  assert.strictEqual(result[0].status, undefined, "should exclude non-projected fields");
};

// --------------- Distinct tests ---------------

const testDistinct = async () => {
  const result = await MongoWraper.Distinct("name", testCollection, testDB);

  assert.ok(Array.isArray(result), "should return an array");
  assert.strictEqual(result.length, 3, "should return 3 distinct names");
  assert.ok(result.includes("Test Document 1"), "should include 'Test Document 1'");
};

// --------------- FindLimitLast tests ---------------

const testFindLimitLast = async () => {
  const result = await MongoWraper.FindLimitLast(
    { status: "active" },
    2,
    testCollection,
    testDB,
  );

  assert.ok(Array.isArray(result), "should return an array");
  assert.strictEqual(result.length, 2, "should return 2 documents");
  assert.strictEqual(
    result[0]._id.toString(),
    testIdDocument3,
    "first result should be the newest document (desc sort)",
  );
};

const testFindLimitLastWithIdConversion = async () => {
  const result = await MongoWraper.FindLimitLast(
    { testCollection_id: testIdDocument1 },
    10,
    testCollection2,
    testDB,
  );

  assert.ok(Array.isArray(result), "should return an array");
  assert.strictEqual(result.length, 1, "should find 1 document matching the _id reference");
};

// --------------- FindOneLast tests ---------------

const testFindOneLast = async () => {
  const result = await MongoWraper.FindOneLast(
    { status: "active" },
    { _id: -1 },
    testCollection,
    testDB,
  );

  assert.ok(result, "should return a document");
  assert.strictEqual(
    result._id.toString(),
    testIdDocument3,
    "should return the newest document",
  );
};

// --------------- DeleteMongoCallback tests ---------------

const testDeleteMongoCallback = async () => {
  const tempId = "624e09075bda143a913c5d99";
  await MongoWraper.SavetoMongo(
    { _id: new ObjectId(tempId), name: "temp", status: "temp" },
    testCollection,
    testDB,
  );

  await MongoWraper.DeleteMongoCallback(tempId, testCollection, testDB);

  const result = await MongoWraper.FindIDOne(tempId, testCollection, testDB);
  assert.strictEqual(result, null, "document should be deleted");
};

// --------------- ConvertDatetoDatetime tests ---------------

const { ConvertDatetoDatetime } = require("../utils/convertDatetime");

const testDatetimeTopLevel = async () => {
  const result = ConvertDatetoDatetime({ created_datetime: "2024-01-15" });
  assert.ok(result.created_datetime instanceof Date, "should convert top-level _datetime to Date");
};

const testDatetimeNested = async () => {
  const result = ConvertDatetoDatetime({
    data: { updated_datetime: "2024-06-01" },
  });
  assert.ok(
    result.data.updated_datetime instanceof Date,
    "should convert nested _datetime to Date",
  );
};

const testDatetimeInsideOperator = async () => {
  const result = ConvertDatetoDatetime({
    $set: { created_datetime: "2024-01-15" },
  });
  assert.ok(
    result.$set.created_datetime instanceof Date,
    "should convert _datetime inside $ operators",
  );
};

const testDatetimePreservesObjectId = async () => {
  const oid = new ObjectId(testIdDocument1);
  const result = ConvertDatetoDatetime({ user_id: oid, name: "test" });
  assert.ok(result.user_id instanceof ObjectId, "should preserve ObjectId values");
  assert.strictEqual(result.name, "test", "should preserve other fields");
};

const testDatetimePreservesDate = async () => {
  const now = new Date();
  const result = ConvertDatetoDatetime({ createdAt: now });
  assert.ok(result.createdAt instanceof Date, "should preserve existing Date objects");
  assert.strictEqual(result.createdAt.getTime(), now.getTime(), "should keep same date value");
};

const testObjectIdStaticExport = async () => {
  const { ObjectId: StaticObjectId } = require("../index");
  assert.strictEqual(StaticObjectId, ObjectId, "static export should be the same ObjectId class");
  const id = new StaticObjectId(testIdDocument1);
  assert.ok(id instanceof ObjectId, "should create a valid ObjectId instance");
};

const testObjectIdInstanceExport = async () => {
  assert.strictEqual(MongoWraper.ObjectId, ObjectId, "instance export should be the same ObjectId class");
  const id = new MongoWraper.ObjectId(testIdDocument1);
  assert.ok(id instanceof ObjectId, "should create a valid ObjectId instance");
};

const testIndexCollection = "testIndexCollection";

const testInsertIndex = async () => {
  const result = await MongoWraper.InsertIndex({ name: 1 }, testIndexCollection, testDB);
  assert.strictEqual(typeof result, "string", "should return index name");
};

const testInsertIndexUnique = async () => {
  const result = await MongoWraper.InsertIndexUnique({ email: 1 }, testIndexCollection, testDB);
  assert.strictEqual(typeof result, "string", "should return index name");
};

const testGetIndexs = async () => {
  const indexes = await MongoWraper.getIndexs(testIndexCollection, testDB);
  assert.ok(Array.isArray(indexes), "should return an array");
  const indexNames = indexes.map((i) => i.name);
  assert.ok(indexNames.includes("name_1"), "should contain the non-unique index");
  assert.ok(indexNames.includes("email_1"), "should contain the unique index");
};

const testCleanupIndexCollection = async () => {
  const result = await MongoWraper.DropCollection(testIndexCollection, testDB);
  assert.strictEqual(result, true, "should drop the index test collection");
};

const testConvertPreservesDate = async () => {
  const now = new Date();
  const result = ConvertIdtoObjectId({ refundedAt: now, user_id: testIdDocument1 });
  assert.ok(result.refundedAt instanceof Date, "should preserve Date objects");
  assert.strictEqual(result.refundedAt.getTime(), now.getTime(), "should keep same date value");
  assert.ok(result.user_id instanceof ObjectId, "should still convert _id fields");
};

// --------------- Transaction tests ---------------

const txCollection = "testTxCollection";

const testTransactionCommit = async () => {
  try {
    await MongoWraper.Transaction(async (tx) => {
      await tx.SavetoMongo({ _id: new ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa"), name: "tx-doc" }, txCollection, testDB);
      await tx.UpdateMongoBy_id("aaaaaaaaaaaaaaaaaaaaaaaa", { name: "tx-doc-updated" }, txCollection, testDB);
    });
    const doc = await MongoWraper.FindIDOne("aaaaaaaaaaaaaaaaaaaaaaaa", txCollection, testDB);
    assert.strictEqual(doc.name, "tx-doc-updated");
    await MongoWraper.DeleteMongoby_id("aaaaaaaaaaaaaaaaaaaaaaaa", txCollection, testDB);
  } catch (error) {
    if (error.message && error.message.includes("Transaction numbers")) {
      console.log("    ⚠ Skipped (standalone server — replica set required)");
      return;
    }
    throw error;
  }
};

const testTransactionRollback = async () => {
  try {
    await MongoWraper.SavetoMongo({ _id: new ObjectId("bbbbbbbbbbbbbbbbbbbbbbbb"), name: "before-tx" }, txCollection, testDB);
    try {
      await MongoWraper.Transaction(async (tx) => {
        await tx.UpdateMongoBy_id("bbbbbbbbbbbbbbbbbbbbbbbb", { name: "inside-tx" }, txCollection, testDB);
        throw new Error("intentional rollback");
      });
    } catch (e) {
      if (e.message !== "intentional rollback") throw e;
    }
    const doc = await MongoWraper.FindIDOne("bbbbbbbbbbbbbbbbbbbbbbbb", txCollection, testDB);
    assert.strictEqual(doc.name, "before-tx");
    await MongoWraper.DeleteMongoby_id("bbbbbbbbbbbbbbbbbbbbbbbb", txCollection, testDB);
  } catch (error) {
    if (error.message && error.message.includes("Transaction numbers")) {
      console.log("    ⚠ Skipped (standalone server — replica set required)");
      return;
    }
    throw error;
  }
};

// --------------- Test runner ---------------

async function cleanupTestData() {
  await MongoWraper.DropCollection(testCollection, testDB);
  await MongoWraper.DropCollection(testCollection2, testDB);
  await MongoWraper.DropCollection(testIndexCollection, testDB);
  await MongoWraper.DropCollection(txCollection, testDB);
}

const runTests = async () => {
  console.time("test");

  // Clean up residual data from previous failed runs
  await cleanupTestData();

  // Group 1: Single document CRUD
  console.log("\nGroup 1: Single document CRUD");
  await runTest("SavetoMongo", testSavetoMongo);
  await runTest("FindIDOne", testFindIDOne);
  await runTest("UpdateMongoBy_id", testUpdateMongoBy_id);
  await runTest("DeleteMongoby_id", testDeleteMongoby_id);

  // Group 2: Bulk operations + aggregation
  console.log("\nGroup 2: Bulk operations + aggregation");
  await runTest("SavetoMongoMany", testSavetoMongoMany);
  await runTest("AggregationMongo", testAggregationMongo);
  await runTest("DeleteMongo", () =>
    testDeleteMongo(
      [
        new ObjectId(testIdDocument1),
        new ObjectId(testIdDocument2),
        new ObjectId(testIdDocument3),
      ],
      testCollection,
      3,
    ),
  );

  // Group 3: Batch insert + bulk update
  console.log("\nGroup 3: Batch insert + bulk update");
  await runTest("SaveManyBatch", testSaveManyBatch);
  await runTest("UpdateMongoMany", () => testUpdateMongoMany(testCollection2));
  await runTest("DeleteMongo (collection2)", () =>
    testDeleteMongo(
      [
        new ObjectId(testIdDocument4),
        new ObjectId(testIdDocument5),
        new ObjectId(testIdDocument6),
      ],
      testCollection2,
      3,
    ),
  );

  // Group 4: Population
  console.log("\nGroup 4: Population");
  await runTest("SavetoMongoMany (re-insert)", testSavetoMongoMany);
  await runTest("SaveManyBatch (re-insert refs)", testSaveManyBatch);
  await runTest("ND_PopulateAuto", testND_PopulateAuto);
  await runTest("DeleteMongo (cleanup collection1)", () =>
    testDeleteMongo(
      [
        new ObjectId(testIdDocument1),
        new ObjectId(testIdDocument2),
        new ObjectId(testIdDocument3),
      ],
      testCollection,
      3,
    ),
  );
  await runTest("DeleteMongo (cleanup collection2)", () =>
    testDeleteMongo(
      [
        new ObjectId(testIdDocument4),
        new ObjectId(testIdDocument5),
        new ObjectId(testIdDocument6),
      ],
      testCollection2,
      3,
    ),
  );

  // Group 5: Core CRUD (FindOne, FindMany, FindManyLimit, UpdateMongo, UpsertMongo, Count)
  console.log("\nGroup 5: Core CRUD");
  await runTest("SavetoMongoMany (setup)", testSavetoMongoMany);
  await runTest("FindOne", testFindOne);
  await runTest("FindMany", testFindMany);
  await runTest("FindManyLimit", testFindManyLimit);
  await runTest("FindManyOptions sort", testFindManyOptionsSort);
  await runTest("FindManyOptions limit", testFindManyOptionsLimit);
  await runTest("FindManyOptions skip", testFindManyOptionsSkip);
  await runTest("FindManyOptions projection", testFindManyOptionsProjection);
  await runTest("Distinct", testDistinct);
  await runTest("FindLimitLast", testFindLimitLast);
  await runTest("FindOneLast", testFindOneLast);
  await runTest("UpdateMongo", testUpdateMongo);
  await runTest("UpsertMongo", testUpsertMongo);
  await runTest("Count", testCount);
  await runTest("DeleteMongoCallback", testDeleteMongoCallback);
  await runTest("DeleteMongo (cleanup)", () =>
    testDeleteMongo(
      [
        new ObjectId(testIdDocument1),
        new ObjectId(testIdDocument2),
        new ObjectId(testIdDocument3),
      ],
      testCollection,
      3,
    ),
  );

  // Group 5b: FindLimitLast with _id conversion (needs testCollection2 data)
  console.log("\nGroup 5b: FindLimitLast _id conversion");
  await runTest("SaveManyBatch (setup refs)", testSaveManyBatch);
  await runTest("FindLimitLast with _id conversion", testFindLimitLastWithIdConversion);
  await runTest("DeleteMongo (cleanup collection2)", () =>
    testDeleteMongo(
      [
        new ObjectId(testIdDocument4),
        new ObjectId(testIdDocument5),
        new ObjectId(testIdDocument6),
      ],
      testCollection2,
      3,
    ),
  );

  // Group 6: ConvertIdtoObjectId utility
  console.log("\nGroup 6: ConvertIdtoObjectId");
  await runTest("Convert valid hex24 to ObjectId", testConvertValidHex);
  await runTest("Leave invalid string as-is", testConvertInvalidString);
  await runTest("Leave null as-is", testConvertNull);
  await runTest("Convert nested _id fields", testConvertNested);
  await runTest("Convert inside $ operators", testConvertOperator);
  await runTest("Convert array of ids", testConvertArray);
  await runTest("Skip non-id keys", testConvertSkipsNonIdKeys);
  await runTest("Keep existing ObjectId", testConvertAlreadyObjectId);
  await runTest("Preserve Date objects", testConvertPreservesDate);

  // Group 7: ConvertDatetoDatetime utility
  console.log("\nGroup 7: ConvertDatetoDatetime");
  await runTest("Convert top-level _datetime to Date", testDatetimeTopLevel);
  await runTest("Convert nested _datetime to Date", testDatetimeNested);
  await runTest("Convert _datetime inside $ operators", testDatetimeInsideOperator);
  await runTest("Preserve ObjectId values", testDatetimePreservesObjectId);
  await runTest("Preserve existing Date objects", testDatetimePreservesDate);

  // Group 8: Indexes
  console.log("\nGroup 8: Indexes");
  await runTest("InsertIndex", testInsertIndex);
  await runTest("InsertIndexUnique", testInsertIndexUnique);
  await runTest("getIndexs", testGetIndexs);
  await runTest("DropCollection (cleanup indexes)", testCleanupIndexCollection);

  // Group 9: ObjectId export
  console.log("\nGroup 9: ObjectId export");
  await runTest("ObjectId static export", testObjectIdStaticExport);
  await runTest("ObjectId instance export", testObjectIdInstanceExport);

  // Group 10: Transactions (require replica set)
  console.log("\nGroup 10: Transactions");
  await runTest("Transaction commit", testTransactionCommit);
  await runTest("Transaction rollback", testTransactionRollback);

  // Final cleanup
  await cleanupTestData();

  // Summary
  console.log(`\n${passed} passed, ${failed} failed\n`);
  console.timeEnd("test");
  process.exit(failed > 0 ? 1 : 0);
};

runTests();
