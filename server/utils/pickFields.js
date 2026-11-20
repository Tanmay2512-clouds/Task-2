module.exports = function pickFields(source, allowed) {
  const result = {};
  if (!source || typeof source !== "object" || Array.isArray(source)) return result;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
  }
  return result;
};
