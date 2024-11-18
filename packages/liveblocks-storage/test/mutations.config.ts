import type { LayeredCache } from "~/LayeredCache.js";
import type { Json } from "~/lib/Json.js";

export function put(stub: LayeredCache, key: string, value: Json): void {
  stub.set(key, value);
}

export function del(stub: LayeredCache, key: string): void {
  stub.delete(key);
}

export function putRandom(stub: LayeredCache, key: string): void {
  stub.set(key, Math.floor(Math.random() * 1_000_000));
}

export function putAndFail(stub: LayeredCache, key: string, value: Json): void {
  put(stub, key, value);
  throw new Error("b0rked");
}

export function dupe(stub: LayeredCache, src: string, target: string): void {
  const value = stub.get(src);
  if (value === undefined) {
    throw new Error(`No such key '${src}'`);
  }
  stub.set(target, value);
}

export function inc(stub: LayeredCache, key: string): void {
  const count = stub.getNumber(key) ?? 0;
  stub.set(key, count + 1);
}

export function dec(stub: LayeredCache, key: string): void {
  const count = stub.getNumber(key) ?? 0;
  if (count <= 0) {
    throw new Error("Cannot decrement beyond 0");
  }
  stub.set(key, count - 1);
}
