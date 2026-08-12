/**
 * Recursively converts any property whose name contains "_datetime" to Date,
 * both in objects and arrays, without breaking operators ($set, $inc, ...).
 */
function ConvertDatetoDatetime(input) {
  if (input == null) return input;

  if (Array.isArray(input)) {
    return input.map((v) => ConvertDatetoDatetime(v));
  }

  if (typeof input !== "object") return input;
  if (input instanceof Date) return input;
  if (input._bsontype) return input;

  const out = {};
  for (const [key, val] of Object.entries(input)) {
    if (key.startsWith("$")) {
      out[key] = ConvertDatetoDatetime(val);
      continue;
    }

    if (key.includes("_datetime")) {
      out[key] = Array.isArray(val)
        ? val.map((v) => new Date(v))
        : new Date(val);
    } else {
      out[key] = ConvertDatetoDatetime(val);
    }
  }
  return out;
}

module.exports = { ConvertDatetoDatetime };
