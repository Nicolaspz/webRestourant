// Browser-session cache only. Never persist tokens or application data to disk.
export class ReadCache {
  private generation = 0;
  private scope = '';
  private values = new Map<string, { value: unknown; expires: number }>();
  private pending = new Map<string, Promise<unknown>>();

  clear() {
    this.generation++;
    this.values.clear();
    this.pending.clear();
  }

  async get<T>(scope: string, key: string, ttl: number, loader: () => Promise<T>, force = false): Promise<T> {
    if (scope !== this.scope) { this.clear(); this.scope = scope; }
    const cached = this.values.get(key);
    if (!force && cached && cached.expires > Date.now()) return structuredClone(cached.value) as T;
    const existing = this.pending.get(key);
    if (existing) return structuredClone(await existing) as T;
    const generation = this.generation;
    const request = loader();
    this.pending.set(key, request);
    try {
      const value = await request;
      if (generation === this.generation) {
        if (this.values.size >= 100) this.values.delete(this.values.keys().next().value!);
        this.values.set(key, { value: structuredClone(value), expires: Date.now() + ttl });
      }
      return structuredClone(value);
    } finally {
      if (this.pending.get(key) === request) this.pending.delete(key);
    }
  }
}

export const readCache = new ReadCache();
