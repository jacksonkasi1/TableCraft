export class MemoryCache {
  get(_key: string) { return undefined; }
  set(_key: string, _value: any, _ttl: number, _swr: number) {}
  isRevalidating(_key: string) { return false; }
  markRevalidating(_key: string) {}
  unmarkRevalidating(_key: string) {}
  static buildKey(name: string, _params: any) { return name; }
}
