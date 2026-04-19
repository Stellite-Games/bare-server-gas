import type { ChunkInfo } from "@bare-server-gas/shared";

export interface StoredChunk {
  body: string;
  chunk: ChunkInfo;
}

interface ChunkSet {
  chunks: Map<number, StoredChunk>;
  createdAt: number;
}

export class ChunkStore {
  private store = new Map<string, ChunkSet>();
  private ttlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ttlSeconds = 300) {
    this.ttlMs = ttlSeconds * 1000;

    this.cleanupInterval = setInterval(() => this.cleanup(), this.ttlMs);
    if (this.cleanupInterval) {
      (this.cleanupInterval as NodeJS.Timeout).unref();
    }
  }

  set(id: string, index: number, chunk: StoredChunk): void {
    let chunkSet = this.store.get(id);
    if (!chunkSet) {
      chunkSet = { chunks: new Map(), createdAt: Date.now() };
      this.store.set(id, chunkSet);
    }
    chunkSet.chunks.set(index, chunk);
  }

  get(id: string, index: number): StoredChunk | undefined {
    const chunkSet = this.store.get(id);
    if (!chunkSet) return undefined;

    if (Date.now() - chunkSet.createdAt > this.ttlMs) {
      this.store.delete(id);
      return undefined;
    }

    return chunkSet.chunks.get(index);
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, chunkSet] of this.store) {
      if (now - chunkSet.createdAt > this.ttlMs) {
        this.store.delete(id);
      }
    }
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}
