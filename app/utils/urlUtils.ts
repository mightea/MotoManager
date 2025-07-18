import { slug } from "./slugify";

export const urlMotorcycle = ({
  id,
  make,
  model,
}: {
  id: number;
  make: string;
  model: string;
}) => `/motorcycles/${slug(`${make} ${model}`)}/${id}`;
