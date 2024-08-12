import localForage from "localforage";

class DataBase<T> {
  private db: LocalForage;

  constructor() {
    this.db = localForage.createInstance({
      name: "data",
    });
  }

  get(key: string) {
    return this.db.getItem<T>(key);
  }

  set(key: string, value: T) {
    return this.db.setItem<T>(key, value);
  }
}

export default DataBase;
