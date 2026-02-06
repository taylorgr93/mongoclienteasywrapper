# mongoclienteasywrapper

> **Mongo Client Easy Wrapper** - A simple MongoDB wrapper library for common database operations using the `mongodb` Node.js driver.

## Installation

Install the library via npm:

    npm install mongoclienteasywrapper

## Configuration

Set up your MongoDB connection URI and database name in your code:

```js
const MongoWraper = require("mongoclienteasywrapper")(
  "mongodb://localhost:27017/yourDatabaseName"
);
```

## Main functions

#### Inserts a document into the specified collection:

```js
SavetoMongo(objectToSave, collection, databaseName);
```

Parameters:
objectToSave: Document to insert.
collection: Name of the collection.
databaseName: (Optional) Name of the database. If not provided, uses the default database.
Returns: Promise resolving to the result of the insertion.

#### Finds a single document by its \_id from the specified collection:

```js
FindIDOne(Id, collection, databaseName);
```

Parameters:
Id: ObjectId of the document to find.
collection: Name of the collection.
databaseName: (Optional) Name of the database. If not provided, uses the default database.
Returns: Promise resolving to the found document.

#### Deletes a document by its \_id from the specified collection:

```js
DeleteMongoby_id(_id, collection, databaseName);
```

Parameters:
\_id: ObjectId of the document to delete.
collection: Name of the collection.
databaseName: (Optional) Name of the database. If not provided, uses the default database.
Returns: Promise resolving to the result of the delete operation.

## Usage Example

```js
const { ObjectId } = require("mongodb");
const MongoWraper = require("mongoclienteasywrapper")(
  "mongodb://localhost:27017/yourDatabaseName"
);

// Insert a document
const insertDocument = async () => {
  const result = await MongoWraper.SavetoMongo(
    {
      _id: ObjectId("624e09075bda143a913c5d61"),
      name: "Test Document",
      datetime: new Date(),
    },
    "testCollection",
    "testDB"
  );
  console.log("Insert result:", result);
};

// Find a document by ID
const findDocument = async () => {
  const result = await MongoWraper.FindIDOne(
    "624e09075bda143a913c5d61",
    "testCollection",
    "testDB"
  );
  console.log("Find result:", result);
};

// Update Document by query
const updateDocument = async () => {
  const result = await MongoWraper.UpdateMongo(
    { _id: new ObjectId("624e09075bda143a913c5d61") },
    {
      property: newValue,
    },
    "testCollection",
    "testDB"
  );
  console.log("Update Document result:", result);
};

// Delete a document by ID
const deleteDocument = async () => {
  const result = await MongoWraper.DeleteMongoby_id(
    "624e09075bda143a913c5d61",
    "testCollection",
    "testDB"
  );
  console.log("Delete result:", result);
};

// Finds, update and return modified document (read-modify-read)
const findAndUpdateDocument = async () => {
  const result = await MongoClient.FindOneAndUpdate(
    { query },
    { $inc: { seq: 1 } },
    "testCollection",
    "testDB",
    { upsert: true, returnDocument: "after" }
  );
  console.log("Modified document:", result);
};
```

#### Running Tests

To run the tests defined in test.js, use:

```js
npm run test
```

License
This project is licensed under the MIT License - see the LICENSE file for details.
