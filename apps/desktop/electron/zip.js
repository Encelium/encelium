// A small .zip writer (no dependencies): deflates text-like files, stores already-compressed
// ones (pictures, videos, archives) as they are, and streams to disk so big folders don't
// fill memory. Names are UTF-8, so Arabic file names survive.
import { createWriteStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { crc32, deflateRawSync } from "node:zlib";

const STORE_AS_IS = /\.(png|jpe?g|gif|webp|avif|heic|mp4|mov|mkv|webm|mp3|m4a|aac|ogg|zip|7z|rar|gz|xz|br|woff2?|pdf|docx|xlsx|pptx)$/i;
const MAX_ENTRIES = 65000; // the classic zip format stops at 65,535
const MAX_TOTAL = 3.9 * 1024 ** 3; // and at 4 GB

function dosDateTime(date) {
  const d = date.getFullYear() < 1980 ? new Date(1980, 0, 1) : date;
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const day = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, day };
}

/**
 * Write `files` ({ path: full path on disk, name: path inside the zip with "/" }) to `target`.
 * Throws a plain-language Error if the folder is too big for a zip.
 */
export async function writeZip(target, files) {
  if (files.length > MAX_ENTRIES) throw new Error("too-many");
  const out = createWriteStream(target);
  const write = (buf) => new Promise((resolve, reject) => out.write(buf, (err) => (err ? reject(err) : resolve())));
  const central = [];
  let offset = 0;
  try {
    for (const f of files) {
      const info = await stat(f.path);
      const raw = await readFile(f.path);
      const store = STORE_AS_IS.test(f.name) || raw.length === 0;
      const data = store ? raw : deflateRawSync(raw, { level: 6 });
      const packed = !store && data.length < raw.length ? data : raw;
      const method = packed === raw ? 0 : 8;
      const crc = crc32(raw) >>> 0;
      const name = Buffer.from(f.name, "utf8");
      const { time, day } = dosDateTime(info.mtime);
      if (offset + packed.length + name.length + 30 > MAX_TOTAL) throw new Error("too-big");

      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);          // version needed
      local.writeUInt16LE(0x0800, 6);      // UTF-8 names
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(day, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(packed.length, 18);
      local.writeUInt32LE(raw.length, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);
      await write(local); await write(name); await write(packed);

      central.push({ name, method, time, day, crc, size: packed.length, raw: raw.length, offset });
      offset += local.length + name.length + packed.length;
    }

    const start = offset;
    for (const c of central) {
      const h = Buffer.alloc(46);
      h.writeUInt32LE(0x02014b50, 0);
      h.writeUInt16LE(20, 4); h.writeUInt16LE(20, 6);
      h.writeUInt16LE(0x0800, 8);
      h.writeUInt16LE(c.method, 10);
      h.writeUInt16LE(c.time, 12); h.writeUInt16LE(c.day, 14);
      h.writeUInt32LE(c.crc, 16);
      h.writeUInt32LE(c.size, 20); h.writeUInt32LE(c.raw, 24);
      h.writeUInt16LE(c.name.length, 28);
      h.writeUInt32LE(c.offset, 42);
      await write(h); await write(c.name);
      offset += h.length + c.name.length;
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(offset - start, 12); end.writeUInt32LE(start, 16);
    await write(end);
  } finally {
    await new Promise((resolve) => out.end(resolve));
  }
}
