  # Changelog

  All notable changes to this project will be documented in this file.

  ---

  ## [1.3.0] – 2026-08-13

  ### Added

  - **`Transaction(callback, transactionOptions?)`** — Executes multiple operations as an atomic unit with automatic retry via `session.withTransaction()`. The `tx` proxy object mirrors the full wrapper API.
  - **`StartSession()`** — Returns a raw `ClientSession` for manual transaction control (begin, commit, abort).
  - **`getClient()`** — New method on `MongoDBConnectionManager` to expose the underlying `MongoClient` for session creation.
  - **`sessionOpts`** — All async wrapper functions now accept an optional last parameter `sessionOpts = {}` to pass a `session` for manual transaction usage. Backward compatible.

  ### Fixed

  - **Error handling in transactions** — All catch blocks now re-throw errors when a `session` is active, ensuring `withTransaction()` detects failures and triggers automatic rollback. Normal (non-transaction) calls retain the existing fallback behavior.
  - **Connection liveness check** — `Transaction` and `StartSession` now verify the connection is alive before obtaining the client, matching the existing `getMongoClient` pattern.

  ### Tests

  - Added Group 10: Transaction commit and Transaction rollback tests. Gracefully skip on standalone servers (replica set required).
  - Total tests: 52 → 56.

  ### Documentation

  - Added Transactions section to `README.md` with examples for both `Transaction()` and `StartSession()` APIs.
  - Updated Error handling note in Important Notes to clarify transaction behavior.

  ---

  ## [1.2.16] – 2026-08-01

  ### Changed

  - **`ConvertDatetoDatetime`** — Made recursive to handle nested objects and added `_bsontype` guard to preserve BSON types.
  - **`SaveManyBatch`** — Refactored to delegate directly to `SavetoMongoMany` instead of duplicating logic.

  ### Fixed

  - **`FindManyOptions`** — Applied `skip` option to cursor (was being ignored).
  - **Error returns** — Standardized error return values and `_id` conversion across all functions.

  ### Tests

  - Added `ConvertDatetoDatetime` unit tests (Group 7): top-level, nested, `$` operators, ObjectId preservation, Date preservation.
  - Added `FindManyOptions` tests: sort, limit, skip, projection.
  - Added `FindLimitLast` with `_id` conversion test.
  - Cleanup and reorganization of test groups.
  - Total tests: 34 → 52.

  ---

  ## [1.2.15] – 2026-06-30

  ### Added

  - **`InsertIndex`** — New function to create a non-unique index on a collection. Mirrors `InsertIndexUnique` without the `{ unique: true }` option.
  - **`ObjectId`** — Re-exported from the wrapper instance (`db.ObjectId`) and as a static property (`require("mongoclienteasywrapper").ObjectId`). Users no longer need to import directly from `mongodb`.

  ### Tests

  - Added Group 7: `InsertIndex`, `InsertIndexUnique`, `getIndexs`, and index collection cleanup.
  - Added Group 8: `ObjectId` static export and instance export.

  ---

  ## [1.2.14] – 2026-06-09

  ### Fixed

  - **`ConvertIdtoObjectId`** — Date objects were destroyed by recursion (`new Date()` → `{}`). Added `instanceof Date` guard. (fix lost during 1.2.13 merge)
  - **`ConvertIdtoObjectId`** — Removed `endsWith("Id")` matching (camelCase). Only `_id` (underscore) fields are now detected. (fix lost during 1.2.13 merge)
  - **`index.d.ts`** — Added missing `disconnect()` type definition.

  ---

  ## [1.2.13] – 2026-06-05

  ### Fixed

  - **`ConvertIdtoObjectId`** — Date objects were destroyed by recursion (`new Date()` → `{}`). Added `instanceof Date` guard.
  - **`ConvertIdtoObjectId`** — Removed `endsWith("Id")` matching (camelCase). Only `_id` (underscore) fields are now detected, reducing
  false warnings on external IDs like `refundId`.
  - **`disconnect()`** — Fixed reference to `connectionManager` (undefined) → `mongoDBConnectionManager`.

  ### Added

  - **`disconnect()`** — Exposes `closeAllConnections()` for clean shutdown in scripts, lambdas, and tests.

  ### Tests

  - Added `Preserve Date objects` test for `ConvertIdtoObjectId`.
  - Total tests: 31 → 32.

  ---

  ## [1.2.12] – 2026-06-02

  ### Changed

  - **`ConvertIdtoObjectId`** rewritten with recursive conversion, hex24 validation, `$` operator support, and `console.warn` for invalid
  ObjectId strings. Replaces the old flat single-level converter.
  - Removed unused legacy files: `common.js`, `assing.js` (broken imports, dead code).
  - Removed draft file `utils/convertId copy.js`.
  - Moved `index-old.js` to `legacy/` folder.
  - Added `files` whitelist to `package.json` — npm only publishes essential files.
  - Added `engines` field (`node >= 14.0.0`) to `package.json`.
  - Added TypeScript type definitions (`index.d.ts`) for all 51 exported functions.

  ### Tests

  - Added test infrastructure: `assert` module, `runTest` helper with pass/fail counters, proper `process.exit(1)` on failure.
  - Added assertions to all 10 existing tests (previously only logged results without validation).
  - Fixed `ObjectId()` calls without `new` across all test data (~15 occurrences).
  - Fixed `error.me` typo in `ND_PopulateAuto` test.
  - Added 6 new Core CRUD tests: `FindOne`, `FindMany`, `FindManyLimit`, `UpdateMongo`, `UpsertMongo`, `Count`.
  - Added 8 new `ConvertIdtoObjectId` unit tests: valid hex, invalid string, null, nested objects, `$` operators, arrays, non-id keys,
  existing ObjectId.
  - Total tests: 10 → 31.

  ### Documentation

  - Rewrote `README.md`: added npm/license badges, setup with `defaultDbName`, ~20 functions documented with examples, remaining ~30 listed
  with signatures, organized by category (Insert, Find, Pagination, Update, Delete, Aggregation, Population, ND\_, Other), added "Important 
  Notes" section.
  - Added "Why use this instead of Mongoose?" comparison table to `README.md`.
  - Improved `package.json` description and keywords for npm search discoverability.
  - Added JSDoc to `MongoDBConnectionManager` class.
  - Cleaned duplicate comment in `mongoDBConnectionManager.js` `isConnected()`.

  ---

  ## [1.2.9] – 2026-05-26

  ### Changed

  - **`SavetoMongoCallback`** converted from legacy callback-based pattern to `async`/`await` using `getMongoClient`.
  - **`DeleteMongoCallback`** converted from legacy callback-based pattern to `async`/`await` using `getMongoClient`.
  - All remaining functions refactored to project conventions: `const` everywhere, `databaseName || mongoDb` pattern, no `var`, direct 
  returns without unnecessary intermediate variables.
  - **`module.exports`** export order fixed: `UpdateOneRaw` now listed before `UpsertMongo` (alphabetical order).
  - Removed outdated `indexNew.js` draft file.
  - Removed commented-out legacy code across `index.js` (`db.close()` calls, old `MongoClient.connect` blocks, debug `console.log` 
  statements).

  ### Documentation

  - Added inline English JSDoc to:
    - `ND_PopulateAuto`
    - `SavetoMongoCallback`
    - `InsertIndexUnique`
    - `ND_DeleteMongoby_id`
    - `getIndexs`
    - `UpdateMongoManyRename`
    - `UpdateMongoBy_idPush`
    - `UpdateMongoManyBy_idPush`
    - `UpdateMongoManyBy_idAddToSet`
    - `UpdateMongoManyBy_idPull`
    - `UpdateMongoManyPullIDToCollectionPull`
    - `UpdateMongoBy_idRemoveProperty`
    - `UpdateBy_idPush_id`
    - `DeleteMongoCallback`
    - `GetNextSequenceValue`
    - `ND_FindOne`
    - `ND_FindMany`
    - `ND_FindPaginated`
    - `Populate`
    - `PopulateAuto`
    - `FindIDOnePopulated`
    - `ND_FindIDOnePopulated`
    - `UpdateMongoManyPull`
  - Removed all Spanish-language inline comments from `index.js` (English only).

  ---

  ## [1.2.8] – 2026‑02‑25

### Added

- _(no additions in this release)_

## Changed

- `Count`: Replaced deprecated `.count()` with `.countDocuments()` for MongoDB driver compatibility.
- `Count`: Error handler now returns `0` instead of `{}` for consistent numeric return type.

## Fixed

- _(no additions in this release)_

## Documentation

- _(no additions in this release)_

---

## [1.2.7] – 2026‑02‑06

### Added

- _(no additions in this release)_

## Changed

- `MongoDBConnectionManager.connect`: Removed deprecated `useNewUrlParser` and `useUnifiedTopology` options (not needed in MongoDB Driver 4.x+)
- `MongoDBConnectionManager.connect`: Client is now assigned only after successful connection to prevent inconsistent state on connection failure
- `MongoDBConnectionManager.getDatabase`: Changed from async to sync method since `client.db()` is synchronous

## Fixed

- Fixed potential bug where `this.client` could be assigned before connection was established, causing inconsistent state if connection failed

## Documentation

- Updated inline comments for MongoDB Driver 4.x+ compatibility

---

## [1.2.6] – 2025‑11‑06

### Added

- **`FindManyOptions`** new method to retrieve documents with configurable options:
- `sort`: Sort specification (defaults to `{ _id: 1 }`)
- `projection`: Fields to include/exclude
- `limit`: Maximum number of documents (0 = no limit)
- `skip`: Number of documents to skip (useful for pagination)
- Supports additional MongoDB cursor options via spread operator

### Changed

- _(no changes in this release)_

### Fixed

- _(no fixes in this release)_

### Documentation

- Added inline English JSDoc comments to:
  - `FindManyOptions`

---

## [1.2.5] – 2025‑09‑25

### Added

- **`AggregationMongoCursor`** added optional `batchSize` parameter (default set to `100`).

### Changed

- **`AggregationMongoCursor`** refactored to use the new conversion helpers for consistency.

### Fixed

- _(no fixes in this release)_

### Documentation

- Added inline English JSDoc comments to:
  - `AggregationMongoCursor`

---

## [1.2.4] – 2025‑09‑04

### Added

- **`FindPaginatedOptions`** FindPaginated with flexible options.
- **`convertId copy`** (Draft file) Now supports deep recursion, MongoDB operators, and smart hex validation for safer ID conversion

### Changed

### Fixed

### Documentation

- Added inline English JSDoc comments to:
  - `FindPaginatedOptions`

---

## [1.2.3] – 2025‑07‑17

### Added

### Changed

- **`Distinct`** refactored to use the new conversion helpers.
- **`FindPaginated`** refactored to use the new conversion helpers.
- **`Count`** refactored to use the new conversion helpers.
- **`FindLimitLast`** refactored to use the new conversion helpers.
- **`FindPaginated`** refactored to use the new conversion helpers.

### Fixed

- **`FindMany`** method returns parameters without options.

### Documentation

- Added inline English JSDoc comments to:
  - `Distinct`
  - `FindPaginated`
  - `Count`
  - `FindLimitLast`
  - `FindPaginated`

---

## [1.2.2]  ‑  2025‑07‑16

### Added

- **Generic pagination support** across services.
  - Query params `page` & `limit` now parsed and validated (auto‑cast to numbers).
- **Pagination test suite (shared collection)**:
  - Seeds numbered docs into the existing test collection.
  - `testFindManyPagination()` asserts skip/limit + ordering.
  - `testFindManyProjection()` asserts projection exclusion.

### Changed

- **`FindMany`**
  - New 4th param `options` supporting `projection`, `sort`, `skip`, `limit`, `hint`, etc.
  - Explicitly applies `skip`/`limit` on the cursor (handles `0` correctly).
  - Backward‑compatible: defaults to `{}` when omitted.
- Updated service methods that paginate (e.g., Transactions) to pass `page`/`limit` options and return `{ meta, data }`.
- Added pagination‑aware log messages (include page & limit).

### Fixed

- Incorrect page‑1 results when `skip=0` (falsy check) — now respected.
- Projection leakage in tests: wrapper honors `projection` exclusions.

### Documentation

- Expanded JSDoc for **`FindMany`** to document the `options` argument and show pagination usage.
- Added comments to pagination test helpers explaining seed/cleanup flow.

---

## [1.2.1]  ‑  2025‑07‑15

### Added

- **Generic pagination support**
  - `PaginationQueryDto` (`src/common/dto/pagination-query.dto.ts`)  
    Handles `page` and `limit` query params with validation/auto‑casting.
  - Helper `countDocuments` in `mongoclienteasywrapper` for total‑record count (used by paginated endpoints).

### Changed

- **`FindMany`**
  - New 4th parameter **`options`** (projection, sort, skip, limit, hint, …).
  - Backward‑compatible – defaults to `{}` when omitted.
  - Log messages now include page and limit information.
- **Other services** that rely on `FindMany` updated to pass `options` when appropriate.

### Fixed

### Documentation

- Added detailed JSDoc to **`FindMany`** illustrating the new `options` argument and sample pagination usage.

---

## [1.1.5] - 2025-07-08

### Added

- New **`src/utils/`** folder containing helper utilities:
  - `convertIdToObjectId`
  - `convertDateToDatetime`

### Changed

- **`DropCollection`** refactored to use the new conversion helpers.
- **`FindMany`** refactored to use the new conversion helpers.
- **`FindManyLimit`** refactored to use the new conversion helpers.
- **`FindOneLast`** refactored to use the new conversion helpers.
- **`GetAll`** refactored to use the new conversion helpers.
- **`GetLastMongo`** refactored to use the new conversion helpers.
- **`UpsertMongo`** refactored to use the new conversion helpers.
- All internal import paths updated to reference the new utilities.

### Fixed

### Documentation

- Added inline English JSDoc comments to:
  - `aggregationMongo`
  - `DeleteMongoby_id`
  - `DeleteMongo`
  - `DropCollection`
  - `FindIDOne`
  - `FindMany`
  - `FindManyLimit`
  - `FindOne`
  - `FindOneAndUpdate`
  - `FindOneLast`
  - `GetAll`
  - `GetLastMongo`
  - `SaveManyBatch`
  - `SavetoMongoMany`
  - `SavetoMongo`
  - `UpdateMongo`
  - `UpdateMongoBy_id`
  - `UpdateMongoMany`
  - `UpdateOneRaw`
  - `UpsertMongo`
  - `getMongoClient`

---

## [1.1.4] - 2025-06-13

### Added

- `FindOneAndUpdate`: Adds support for updating and returning a document in a single operation.
- `UpdateOneRaw`: Directly updates documents using raw MongoDB update syntax with flexible options.

### Changed

- Improved `FindOne` to support conversion of ObjectIds and Dates before querying.
- Updated `UpdateMongo` function to the new convention

### Fixed

---
