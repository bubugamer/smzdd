import fs from "node:fs";
import path from "node:path";

export const root = "/Users/xiemingsi/WorkSpace/smzdd";

export function readText(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

export function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

export function listFiles(relDir, predicate = () => true) {
  const base = path.join(root, relDir);
  const rows = [];

  function walk(currentRelDir) {
    const abs = path.join(root, currentRelDir);
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    for (const entry of entries) {
      const nextRel = path.join(currentRelDir, entry.name);
      if (entry.isDirectory()) {
        walk(nextRel);
      } else if (entry.isFile() && predicate(nextRel)) {
        rows.push(nextRel);
      }
    }
  }

  walk(relDir);
  return rows.sort();
}
