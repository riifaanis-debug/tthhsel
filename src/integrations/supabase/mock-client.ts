import defaultData from "@/data/wallet.json";

export class MockSupabaseQueryBuilder {
  private table: string;
  private filters: { col: string; val: any; op?: string }[] = [];
  private isUpdate = false;
  private patchData: any = null;
  private isDelete = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = "*") {
    return this;
  }

  order(field: string, options?: any) {
    return this;
  }

  limit(n: number) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val, op: "eq" });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, val, op: "neq" });
    return this;
  }

  not(col: string, op: string, val: any) {
    this.filters.push({ col, val, op: "not" });
    return this;
  }

  update(patch: any) {
    this.isUpdate = true;
    this.patchData = patch;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  private getDataList(): any[] {
    if (typeof window !== "undefined") {
      try {
        const key = "mock_" + this.table;
        const s = localStorage.getItem(key);
        if (s) {
          return JSON.parse(s);
        }
        if (this.table === "customers") {
          return defaultData || [];
        }
      } catch (e) {
        console.error("error reading mock", e);
      }
    } else {
      const key = `mock_${this.table}`;
      const memoryList = (globalThis as any)[key];
      if (memoryList) {
        return memoryList;
      }
      if (this.table === "customers") {
        return defaultData || [];
      }
    }
    return [];
  }

  private saveDataList(list: any[]) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mock_" + this.table, JSON.stringify(list));
      } catch (e) {
        console.error("error writing mock", e);
      }
    } else {
      (globalThis as any)[`mock_${this.table}`] = list;
    }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    let list = this.getDataList();

    if (this.isDelete) {
      list = list.filter((item) => {
        if (this.filters.length === 0) return false;
        return !this.filters.every((f) => {
          if (f.op === "eq") return item[f.col] === f.val;
          if (f.op === "neq") return item[f.col] !== f.val;
          if (f.op === "not") return item[f.col] !== f.val;
          return true;
        });
      });
      this.saveDataList(list);
      return Promise.resolve({ data: list, error: null }).then(onfulfilled, onrejected);
    }

    if (this.isUpdate) {
      list = list.map((item) => {
        const matches = this.filters.every((f) => {
          if (f.op === "eq") return item[f.col] === f.val;
          if (f.op === "neq") return item[f.col] !== f.val;
          if (f.op === "not") return item[f.col] !== f.val;
          return true;
        });
        if (matches) {
          return { ...item, ...this.patchData };
        }
        return item;
      });
      this.saveDataList(list);
      return Promise.resolve({ data: list, error: null }).then(onfulfilled, onrejected);
    }

    let data = list;
    if (this.filters.length > 0) {
      data = data.filter((item) => {
        return this.filters.every((f) => {
          if (f.op === "eq") {
            const itemVal = item[f.col];
            // Normalize comparison for safety
            if (itemVal != null && f.val != null) {
              return String(itemVal) === String(f.val);
            }
            return itemVal === f.val;
          }
          if (f.op === "neq") return item[f.col] !== f.val;
          if (f.op === "not") return item[f.col] !== f.val;
          return true;
        });
      });
    }

    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
  }

  async upsert(row: any, options?: any) {
    const isArray = Array.isArray(row);
    const rows = isArray ? row : [row];
    const list = this.getDataList();

    for (const item of rows) {
      const pk = item.customer_key || item.id;
      const idx = list.findIndex((x) => (x.customer_key || x.id) === pk);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item };
      } else {
        list.push(item);
      }
    }
    this.saveDataList(list);
    return { data: row, error: null };
  }

  async insert(row: any) {
    const isArray = Array.isArray(row);
    const rows = isArray ? row : [row];
    const list = this.getDataList();

    for (const item of rows) {
      list.push({
        ...item,
        created_at: item.created_at || new Date().toISOString(),
      });
    }
    this.saveDataList(list);
    return { data: row, error: null };
  }
}

export class MockSupabaseClient {
  from(table: string) {
    return new MockSupabaseQueryBuilder(table);
  }

  auth = {
    getSession: async () => {
      return { data: { session: null }, error: null };
    },
    getUser: async () => {
      return { data: { user: null }, error: null };
    },
    onAuthStateChange: () => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  };
}
