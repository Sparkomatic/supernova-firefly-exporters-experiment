/**
 * Utility function to safely set a value in a nested object based on a path.
 * It creates the nested structure if it doesn't exist.
 * @param obj The object to modify.
 * @param path An array of strings representing the path.
 * @param value The value to set at the end of the path.
 */
export function deepSet(obj: any, path: string[], value: any): void {
  let schema = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    if (schema[p] === undefined || schema[p] === null) {
      schema[p] = {};
    }
    schema = schema[p];
  }
  schema[path[path.length - 1]] = value;
} 