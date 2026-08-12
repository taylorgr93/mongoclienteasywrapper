const { ObjectId } = require("mongodb");

function isHex24(s) {
  return typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);
}

/**
 * Recursively converts any property whose name ends in "_id"
 * to ObjectId, both in objects and arrays, without breaking operators ($set, $inc, ...).
 */
function ConvertIdtoObjectId(input) {
  if (input == null) return input;

  if (Array.isArray(input)) {
    return input.map((v) => ConvertIdtoObjectId(v));
  }

  if (typeof input !== "object") return input;
  if (input instanceof Date) return input;
  if (input._bsontype) return input;

  const out = {};
  for (const [key, val] of Object.entries(input)) {
    if (key.startsWith("$")) {
      out[key] = ConvertIdtoObjectId(val);
      continue;
    }

    const looksLikeIdKey = key.endsWith("_id");
    if (looksLikeIdKey) {
      if (Array.isArray(val)) {
        out[key] = val.map((v) =>
          isHex24(v) ? new ObjectId(v) : ConvertIdtoObjectId(v),
        );
      } else if (isHex24(val)) {
        out[key] = new ObjectId(val);
      } else if (typeof val === "string" && val.length > 0) {
        console.warn(
          `ConvertIdtoObjectId: "${key}" contains "${val}" which is not a valid ObjectId`,
        );
        out[key] = val;
      } else {
        out[key] = ConvertIdtoObjectId(val);
      }
    } else {
      out[key] = ConvertIdtoObjectId(val);
    }
  }
  return out;
}

module.exports = { ConvertIdtoObjectId };
