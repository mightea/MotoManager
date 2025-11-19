/**
 * Helper function to check if a value is falsy and get rid of massive if chains.
 *
 * @example
 * // changes something like this:
 * if (value === null || value === undefined || value === false || value === "" || value === 0) {
 *  return true;
 * }
 *
 * // to this:
 * if (isFalsy(value)) {
 *  return true;
 * }
 * @param value The value you want to check
 * @returns true if the value is falsy, false otherwise
 */
export const isFalsy = (
  value: unknown
): value is "" | 0 | false | null | undefined => {
  return (
    value === null ||
    value === undefined ||
    value === false ||
    value === "" ||
    value === 0
  );
};

/**
 * Checks if a value is truthy.
 *
 * A value is considered truthy if it is not falsy. In JavaScript, falsy values are:
 * - `false`
 * - `0`
 * - `-0`
 * - `0n` (BigInt zero)
 * - `""` (empty string)
 * - `null`
 * - `undefined`
 * - `NaN`
 *
 * @param value - The value to check.                                               
 * @returns `true` if the value is truthy, otherwise `false`.                       
 */
export const isTruthy = (value: unknown): value is number | string | true =>
  !isFalsy(value);

/**
 * Helper function to check if a value is nullish and get rid of conditional chains.
 *
 * @example
 * // changes something like this:
 * if (value === null || value === undefined) {
 *   return true;
 * }
 *
 * // to this:
 * if (isNullish(value)) {
 *   return true;
 * }
 *
 * @param value The value you want to check                                         
 * @returns true if the value is nullish, false otherwise                           
 */
export const isNullish = (value: unknown): value is null | undefined => {
  return value === null || value === undefined;
};
