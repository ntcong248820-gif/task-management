const serverStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

if (typeof window === "undefined") {
  const storage = globalThis.localStorage as Storage | undefined

  if (!storage || typeof storage.getItem !== "function") {
    Object.defineProperty(globalThis, "localStorage", {
      value: serverStorage,
      configurable: true,
    })
  }
}
