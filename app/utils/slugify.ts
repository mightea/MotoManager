import slugify from "slugify";

export const slug = (str: string): string => {
  return slugify(str, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g, // Remove special characters
    replacement: "-", // Replace spaces with hyphens
    trim: true, // Trim leading and trailing whitespace
  });
};
