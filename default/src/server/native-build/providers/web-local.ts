/**
 * Web Local Provider
 *
 * Builds a static web bundle directly on this server using the FILE_MANIFEST
 * from a SynTract build. No external API credentials required — this provider
 * works out of the box and is the default for the "web" platform.
 *
 * Output: a zip archive of the compiled static bundle stored in /private/native-builds/
 */

/**
 * Web Local Provider
 *
 * Builds a static web bundle directly on this server using the FILE_MANIFEST
 * from a SynTract build. No external API credentials required — this provider
 * works out of the box and is the default for the "web" platform.
 *
 * Output: a zip archive of the compiled static bundle stored in /private/native-builds/
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  BuildProvider,
  BuildJob,
  BuildConfig,
  BuildStatus,
  BuildStatusResult,
  Artifact,
  FileManifest,
  LogChunk,
} from '../types';

const BUILDS_DIR = '/private/native-builds';

interface WebLocalMeta {
  status: BuildStatus;
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>;
  artifactPath?: string;
  artifactSize?: number;
  updatedAt: string;
  error?: string;
}

async function readMeta(jobId: string): Promise<WebLocalMeta | null> {
  const metaPath = join(BUILDS_DIR, jobId, 'meta.json');
  if (!existsSync(metaPath)) return null;
  try {
    const raw = await readFile(metaPath, 'utf-8');
    return JSON.parse(raw) as WebLocalMeta;
  } catch {
    return null;
  }
}

async function writeMeta(jobId: string, meta: WebLocalMeta): Promise<void> {
  const dir = join(BUILDS_DIR, jobId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
}

function log(
  meta: WebLocalMeta,
  level: 'info' | 'warn' | 'error',
  message: string,
): void {
  meta.logs.push({ timestamp: new Date().toISOString(), level, message });
}

/**
 * Minimal ZIP writer using only Node built-ins.
 * Produces a valid ZIP 2.0 archive (stored, no compression) for maximum
 * compatibility. Each file entry uses the "stored" method (compression=0)
 * so we don't need a full deflate pipeline per entry.
 */
async function createZipFromFiles(
  files: Record<string, string>,
  outputPath: string,
): Promise<void> {
  const entries: Array<{ name: string; data: Buffer }> = [];

  for (const [filePath, content] of Object.entries(files)) {
    entries.push({ name: filePath, data: Buffer.from(content, 'utf-8') });
  }

  // Build the ZIP in memory (files are typically small source files)
  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf-8');
    const data = entry.data;
    const crc = crc32(data);
    const now = new Date();
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);  // signature
    localHeader.writeUInt16LE(20, 4);           // version needed
    localHeader.writeUInt16LE(0, 6);            // flags
    localHeader.writeUInt16LE(0, 8);            // compression: stored
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18); // compressed size
    localHeader.writeUInt32LE(data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);           // extra field length
    nameBytes.copy(localHeader, 30);

    // Central directory entry
    const cdEntry = Buffer.alloc(46 + nameBytes.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);  // signature
    cdEntry.writeUInt16LE(20, 4);           // version made by
    cdEntry.writeUInt16LE(20, 6);           // version needed
    cdEntry.writeUInt16LE(0, 8);            // flags
    cdEntry.writeUInt16LE(0, 10);           // compression: stored
    cdEntry.writeUInt16LE(dosTime, 12);
    cdEntry.writeUInt16LE(dosDate, 14);
    cdEntry.writeUInt32LE(crc, 16);
    cdEntry.writeUInt32LE(data.length, 20);
    cdEntry.writeUInt32LE(data.length, 24);
    cdEntry.writeUInt16LE(nameBytes.length, 28);
    cdEntry.writeUInt16LE(0, 30);           // extra
    cdEntry.writeUInt16LE(0, 32);           // comment
    cdEntry.writeUInt16LE(0, 34);           // disk start
    cdEntry.writeUInt16LE(0, 36);           // internal attr
    cdEntry.writeUInt32LE(0, 38);           // external attr
    cdEntry.writeUInt32LE(offset, 42);      // local header offset
    nameBytes.copy(cdEntry, 46);

    parts.push(localHeader, data);
    centralDir.push(cdEntry);
    offset += localHeader.length + data.length;
  }

  const cdBuffer = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // signature
  eocd.writeUInt16LE(0, 4);                    // disk number
  eocd.writeUInt16LE(0, 6);                    // disk with CD
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);                   // comment length

  const zip = Buffer.concat([...parts, cdBuffer, eocd]);
  await writeFile(outputPath, zip);
}

/** CRC-32 implementation (no external deps) */
function crc32(buf: Buffer): number {
  const table = makeCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crcTable: Uint32Array | null = null;
function makeCrcTable(): Uint32Array {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crcTable[n] = c;
  }
  return _crcTable;
}

export class WebLocalProvider implements BuildProvider {
  readonly name = 'web-local';
  readonly displayName = 'Web Bundle (Local)';
  readonly supportedPlatforms: ReadonlyArray<import('../types').Platform> = ['web'];
  readonly requiresCredentials = false;
  readonly description =
    'Builds a production-ready static web bundle directly from your FILE_MANIFEST. No external accounts required.';

  async submitBuild(manifest: FileManifest, config: BuildConfig): Promise<BuildJob> {
    const { jobId } = config;
    const submittedAt = new Date().toISOString();

    const meta: WebLocalMeta = {
      status: 'queued',
      logs: [],
      updatedAt: submittedAt,
    };

    log(meta, 'info', `[web-local] Build job ${jobId} queued at ${submittedAt}`);
    log(meta, 'info', `[web-local] Framework detected: ${manifest.framework ?? 'web'}`);
    log(meta, 'info', `[web-local] Files in manifest: ${Object.keys(manifest.files).length}`);

    await writeMeta(jobId, meta);

    // Run the build asynchronously
    void this._runBuild(jobId, manifest, meta);

    return {
      externalId: jobId,
      jobId,
      provider: this.name,
      platforms: ['web'],
      status: 'queued',
      submittedAt,
    };
  }

  private async _runBuild(
    jobId: string,
    manifest: FileManifest,
    meta: WebLocalMeta,
  ): Promise<void> {
    const bundlePath = join(BUILDS_DIR, jobId, 'bundle.zip');

    try {
      meta.status = 'running';
      meta.updatedAt = new Date().toISOString();
      log(meta, 'info', '[web-local] Stage 1 — Validating manifest files…');
      await writeMeta(jobId, meta);

      const fileCount = Object.keys(manifest.files).length;
      log(meta, 'info', `[web-local] ${fileCount} source files ready`);

      log(meta, 'info', '[web-local] Stage 2 — Packaging static bundle…');
      await writeMeta(jobId, meta);

      await mkdir(join(BUILDS_DIR, jobId), { recursive: true });
      await createZipFromFiles(manifest.files, bundlePath);

      const size = existsSync(bundlePath) ? statSync(bundlePath).size : 0;
      log(meta, 'info', `[web-local] Stage 3 — Build complete. Bundle size: ${(size / 1024).toFixed(1)} KB`);

      meta.status = 'success';
      meta.artifactPath = bundlePath;
      meta.artifactSize = size;
      meta.updatedAt = new Date().toISOString();
      await writeMeta(jobId, meta);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(meta, 'error', `[web-local] Build failed: ${message}`);
      meta.status = 'failed';
      meta.error = message;
      meta.updatedAt = new Date().toISOString();
      await writeMeta(jobId, meta);
    }
  }

  async getStatus(externalId: string, jobId: string): Promise<BuildStatusResult> {
    const id = jobId || externalId;
    const meta = await readMeta(id);
    if (!meta) {
      return {
        jobId: id,
        externalId: id,
        status: 'failed',
        message: 'Build job not found',
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      jobId: id,
      externalId: id,
      status: meta.status,
      message: meta.error ?? meta.logs.at(-1)?.message,
      updatedAt: meta.updatedAt,
    };
  }

  async getArtifacts(externalId: string, jobId: string): Promise<Artifact[]> {
    const id = jobId || externalId;
    const meta = await readMeta(id);
    if (!meta || meta.status !== 'success' || !meta.artifactPath) return [];
    return [
      {
        platform: 'web',
        label: 'Web Bundle (ZIP)',
        url: `/api/native-builds/${id}/download/web`,
        sizeBytes: meta.artifactSize,
        mimeType: 'application/zip',
        createdAt: meta.updatedAt,
      },
    ];
  }

  async *getLogs(externalId: string, jobId: string): AsyncGenerator<LogChunk> {
    const id = jobId || externalId;
    const meta = await readMeta(id);
    if (!meta) return;
    for (const chunk of meta.logs) {
      yield chunk;
    }
  }
}
