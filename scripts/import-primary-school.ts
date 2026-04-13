/**
 * One-time bulk import script for primary school student photos.
 *
 * Usage:
 *   npx tsx scripts/import-primary-school.ts
 *
 * Required env vars (from .env or exported):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ROOT_DIR = path.resolve(__dirname, "../초등부 아이들");
const SKIP_FOLDERS = ["장결자", "확인요망"];
const BUCKET = "children-photos";
// Placeholder silhouette PNGs are all under 3.2KB; smallest real PNG is 51KB
const PLACEHOLDER_SIZE_THRESHOLD = 10_000;

interface ParsedStudent {
  filePath: string;
  fileName: string;
  department: string;
  grade: number;
  classNumber: number;
  name: string;
}

// Handles: "1부-3-1 김은엽", "1부 4-2 이시아", "1부4-3 김민찬", "1부 6-1이루다",
//          "2부 3-3 권시온", "2부 5-5김서준"
const FILE_PATTERN =
  /^(\d부)[- ]?(\d)-(\d+)\s*(.+)\.(jpg|jpeg|png)$/i;

const NAME_PATTERN = /^[A-Za-z\uAC00-\uD7AF][A-Za-z\uAC00-\uD7AF .'-]{1,19}$/;

function parseFileName(
  fileName: string
): Omit<ParsedStudent, "filePath"> | null {
  const match = fileName.match(FILE_PATTERN);
  if (!match) return null;

  const [, department, gradeStr, classStr, rawName] = match;
  const name = rawName.trim();
  const grade = parseInt(gradeStr, 10);
  const classNumber = parseInt(classStr, 10);

  return { fileName, department, grade, classNumber, name };
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_FOLDERS.some((skip) => entry.name.includes(skip))) {
        console.log(`  Skipping folder: ${entry.name}`);
        continue;
      }
      results.push(...walkDir(fullPath));
    } else if (/\.(jpg|jpeg|png)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  console.log(`Scanning: ${ROOT_DIR}\n`);

  if (!fs.existsSync(ROOT_DIR)) {
    console.error(`Directory not found: ${ROOT_DIR}`);
    process.exit(1);
  }

  const files = walkDir(ROOT_DIR);
  console.log(`Found ${files.length} image files\n`);

  const parsed: ParsedStudent[] = [];
  const skipped: { file: string; reason: string }[] = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const result = parseFileName(fileName);

    if (!result) {
      skipped.push({ file: fileName, reason: "filename parse failed" });
      continue;
    }

    if (!NAME_PATTERN.test(result.name)) {
      skipped.push({
        file: fileName,
        reason: `name '${result.name}' not valid (2-20 chars)`,
      });
      continue;
    }

    const fileSize = fs.statSync(filePath).size;
    if (fileName.toLowerCase().endsWith(".png") && fileSize < PLACEHOLDER_SIZE_THRESHOLD) {
      skipped.push({
        file: fileName,
        reason: `placeholder image (${fileSize} bytes)`,
      });
      continue;
    }

    parsed.push({ ...result, filePath });
  }

  console.log(`Parsed: ${parsed.length}, Skipped: ${skipped.length}\n`);

  if (skipped.length > 0) {
    console.log("Skipped files:");
    for (const s of skipped) {
      console.log(`  ${s.file} -- ${s.reason}`);
    }
    console.log();
  }

  let uploaded = 0;
  let failed = 0;
  let duplicateSkipped = 0;

  for (const student of parsed) {
    const { data: existingChild, error: existingChildError } = await supabase
      .from("children")
      .select("id")
      .eq("group_type", "primary")
      .eq("department", student.department)
      .eq("grade", student.grade)
      .eq("class_number", student.classNumber)
      .eq("name", student.name)
      .limit(1);

    if (existingChildError) {
      console.error(
        `  Duplicate check failed: ${student.fileName} -- ${existingChildError.message}`
      );
      failed++;
      continue;
    }

    if (existingChild && existingChild.length > 0) {
      duplicateSkipped++;
      continue;
    }

    const ext = path.extname(student.fileName).toLowerCase();
    const storageName = `primary-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}${ext}`;

    const fileBuffer = fs.readFileSync(student.filePath);
    const contentType =
      ext === ".png" ? "image/png" : "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storageName, fileBuffer, { contentType });

    if (uploadError) {
      console.error(`  Upload failed: ${student.fileName} -- ${uploadError.message}`);
      failed++;
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(storageName);

    const { error: insertError } = await supabase.from("children").insert({
      name: student.name,
      photo_url: publicUrl,
      group_type: "primary",
      department: student.department,
      grade: student.grade,
      class_number: student.classNumber,
    });

    if (insertError) {
      console.error(
        `  DB insert failed: ${student.name} -- ${insertError.message}`
      );
      failed++;
      continue;
    }

    uploaded++;
    if (uploaded % 10 === 0) {
      console.log(`  Uploaded ${uploaded}/${parsed.length}...`);
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Duplicates skipped: ${duplicateSkipped}`);
  console.log(`  Skipped:  ${skipped.length}`);
  console.log(`  Total:    ${files.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
