import archiver from "archiver";
import { PassThrough } from "node:stream";

import type { ZipArchiveEntry } from "./contract";

export function renderZipBuffer(entries: ZipArchiveEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);

    archive.pipe(stream);

    for (const entry of entries) {
      archive.append(entry.buffer, { name: entry.fileName });
    }

    void archive.finalize();
  });
}
