import { prepareTestDatabase } from "./utils/test-db";

export default async function globalSetup() {
  await prepareTestDatabase();
}
