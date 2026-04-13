/**
 * Deletes all primary-school children from DB and Storage.
 *
 * Usage:
 *   npx tsx scripts/reset-primary-school.ts --yes
 *
 * Required env vars:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "children-photos";

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
  );
  process.exit(1);
}

if (!process.argv.includes("--yes")) {
  console.error(
    "Safety check failed. Re-run with --yes:\n  npx tsx scripts/reset-primary-school.ts --yes"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function extractFileName(photoUrl: string): string | null {
  try {
    const urlWithoutParams = photoUrl.split("?")[0];
    const fileName = urlWithoutParams.split("/").pop() || "";
    return fileName || null;
  } catch {
    return null;
  }
}

async function listAllBucketFiles(prefix = ""): Promise<string[]> {
  const fileNames: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
      search: prefix || undefined,
    });

    if (error) {
      throw new Error(`Storage list failed: ${error.message}`);
    }

    const names = (data || [])
      .filter((entry) => entry.name && !entry.name.endsWith("/"))
      .map((entry) => entry.name);

    fileNames.push(...names);

    if (!data || data.length < limit) break;
    offset += limit;
  }

  return fileNames;
}

async function removeFiles(fileNames: string[]) {
  if (fileNames.length === 0) return 0;

  let removed = 0;
  const chunkSize = 100;
  for (let i = 0; i < fileNames.length; i += chunkSize) {
    const chunk = fileNames.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }
    removed += chunk.length;
  }
  return removed;
}

async function main() {
  console.log("Fetching primary children...");
  const { data: primaryChildren, error: fetchError } = await supabase
    .from("children")
    .select("id, photo_url")
    .eq("group_type", "primary");

  if (fetchError) {
    throw new Error(`Children fetch failed: ${fetchError.message}`);
  }

  const children = primaryChildren || [];
  const referencedPrimaryFiles = new Set<string>();
  for (const child of children) {
    const fileName = extractFileName(child.photo_url);
    if (fileName) referencedPrimaryFiles.add(fileName);
  }

  console.log(`Primary children in DB: ${children.length}`);
  console.log(`Referenced photo files: ${referencedPrimaryFiles.size}`);

  console.log("Finding additional primary-* files in storage...");
  const allFiles = await listAllBucketFiles("primary-");
  const prefixedPrimaryFiles = allFiles.filter((name) =>
    name.startsWith("primary-")
  );

  const filesToDeleteSet = new Set<string>();
  referencedPrimaryFiles.forEach((name) => filesToDeleteSet.add(name));
  prefixedPrimaryFiles.forEach((name) => filesToDeleteSet.add(name));
  const filesToDelete = Array.from(filesToDeleteSet);
  console.log(`primary-* files in storage: ${prefixedPrimaryFiles.length}`);
  console.log(`Total files to delete: ${filesToDelete.length}`);

  if (children.length > 0) {
    console.log("Deleting primary children rows...");
    const { error: deleteRowsError } = await supabase
      .from("children")
      .delete()
      .eq("group_type", "primary");

    if (deleteRowsError) {
      throw new Error(`Children delete failed: ${deleteRowsError.message}`);
    }
  } else {
    console.log("No primary children rows to delete.");
  }

  console.log("Deleting primary files from storage...");
  const removedCount = await removeFiles(filesToDelete);

  console.log("\n=== Reset Complete ===");
  console.log(`Deleted DB rows: ${children.length}`);
  console.log(`Deleted storage files: ${removedCount}`);
  console.log("\nNow run:");
  console.log("  npx tsx scripts/import-primary-school.ts");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
