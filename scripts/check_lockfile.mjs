import fs from "node:fs";
const locks=["package-lock.json","pnpm-lock.yaml","yarn.lock"];
const found=locks.filter(x=>fs.existsSync(x));
if(!found.length){
  console.error("LOCKFILE MISSING: reproducible CI cannot use npm ci yet.");
  process.exit(1);
}
console.log("Lockfile PASS:",found.join(", "));
