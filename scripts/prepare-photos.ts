import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

async function main() {
  const sourceDir = path.join(process.cwd(), "foty");
  const targetDir = path.join(process.cwd(), "public", "foty");
  const files = (await readdir(sourceDir)).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
  await mkdir(targetDir, { recursive: true });

  const existing = await readdir(targetDir).catch(() => []);
  for (const file of existing) {
    if (!files.includes(file)) await rm(path.join(targetDir, file), { force: true });
  }

  for (const file of files) {
    const output = path.join(targetDir, file.replace(/\.(png|webp)$/i, ".jpg"));
    await sharp(path.join(sourceDir, file))
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 76, mozjpeg: true })
      .toFile(output);
    console.log(file);
  }

  console.log(`Gotowe: ${files.length} zdjęć w public/foty`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
