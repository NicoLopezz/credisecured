import "dotenv/config";
import { reindexAll } from "../src/lib/searchIndex";

async function main() {
  console.log("🔍 Reindexando todo...");
  const count = await reindexAll();
  console.log(`✅ ${count} entradas creadas en SearchIndex`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
