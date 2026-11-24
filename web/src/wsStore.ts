// 当前工作区/知识库选择：localStorage 持久化 + useSyncExternalStore 订阅。
export function withLocalStorage<T>(access: (storage: Storage) => T): T | undefined {
  try {
    return access(localStorage);
  } catch {
    // 浏览器可能在取到存储对象之前就抛出，界面仍可使用内存状态。
    return undefined;
  }
}

function makeStore(key: string) {
  let current = withLocalStorage((storage) => storage.getItem(key)) ?? null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    clear: () => {
      current = null;
      withLocalStorage((storage) => storage.removeItem(key));
      listeners.forEach((l) => l());
    },
    set: (id: string) => {
      current = id;
      withLocalStorage((storage) => storage.setItem(key, id));
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export const wsStore = makeStore("utopia.ws");
export const kbStore = makeStore("utopia.kb");
