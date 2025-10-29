export const SUPABASE_MOCK_CODE = `
// Supabase Mock for WebContainer Preview
// This is a mock implementation for preview purposes only

class SupabaseMock {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this._data = new Map();

    console.log('[Supabase Mock] Initialized with URL:', url);
  }

  from(table) {
    const self = this;
    return {
      _table: table,
      _filters: [],
      _orderBy: null,
      _limit: null,
      _single: false,

      select(columns = '*') {
        this._select = columns;
        return this;
      },

      insert(data) {
        this._operation = 'insert';
        this._data = Array.isArray(data) ? data : [data];
        return this;
      },

      update(data) {
        this._operation = 'update';
        this._updateData = data;
        return this;
      },

      delete() {
        this._operation = 'delete';
        return this;
      },

      eq(column, value) {
        this._filters.push({ type: 'eq', column, value });
        return this;
      },

      neq(column, value) {
        this._filters.push({ type: 'neq', column, value });
        return this;
      },

      gt(column, value) {
        this._filters.push({ type: 'gt', column, value });
        return this;
      },

      lt(column, value) {
        this._filters.push({ type: 'lt', column, value });
        return this;
      },

      gte(column, value) {
        this._filters.push({ type: 'gte', column, value });
        return this;
      },

      lte(column, value) {
        this._filters.push({ type: 'lte', column, value });
        return this;
      },

      like(column, pattern) {
        this._filters.push({ type: 'like', column, pattern });
        return this;
      },

      ilike(column, pattern) {
        this._filters.push({ type: 'ilike', column, pattern });
        return this;
      },

      is(column, value) {
        this._filters.push({ type: 'is', column, value });
        return this;
      },

      in(column, values) {
        this._filters.push({ type: 'in', column, values });
        return this;
      },

      contains(column, value) {
        this._filters.push({ type: 'contains', column, value });
        return this;
      },

      order(column, options = {}) {
        this._orderBy = { column, ascending: options.ascending !== false };
        return this;
      },

      limit(count) {
        this._limit = count;
        return this;
      },

      single() {
        this._single = true;
        return this;
      },

      maybeSingle() {
        this._single = true;
        this._maybe = true;
        return this;
      },

      async then(resolve, reject) {
        try {
          const result = await this._execute();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },

      async _execute() {
        const tableKey = this._table;

        if (!self._data.has(tableKey)) {
          self._data.set(tableKey, []);
        }

        const tableData = self._data.get(tableKey);

        switch (this._operation) {
          case 'insert': {
            const newRecords = this._data.map(record => ({
              ...record,
              id: record.id || crypto.randomUUID(),
              created_at: record.created_at || new Date().toISOString(),
            }));
            tableData.push(...newRecords);

            console.log(\`[Supabase Mock] Inserted \${newRecords.length} record(s) into \${tableKey}\`);

            return {
              data: this._single ? newRecords[0] : newRecords,
              error: null,
            };
          }

          case 'update': {
            let updated = 0;
            const updatedRecords = [];

            tableData.forEach(record => {
              if (this._matchesFilters(record)) {
                Object.assign(record, this._updateData);
                record.updated_at = new Date().toISOString();
                updatedRecords.push(record);
                updated++;
              }
            });

            console.log(\`[Supabase Mock] Updated \${updated} record(s) in \${tableKey}\`);

            return {
              data: this._single ? updatedRecords[0] : updatedRecords,
              error: null,
            };
          }

          case 'delete': {
            const before = tableData.length;
            const remaining = tableData.filter(record => !this._matchesFilters(record));
            const deleted = tableData.filter(record => this._matchesFilters(record));
            self._data.set(tableKey, remaining);

            console.log(\`[Supabase Mock] Deleted \${before - remaining.length} record(s) from \${tableKey}\`);

            return {
              data: deleted,
              error: null,
            };
          }

          default: {
            let results = [...tableData];

            if (this._filters.length > 0) {
              results = results.filter(record => this._matchesFilters(record));
            }

            if (this._orderBy) {
              const { column, ascending } = this._orderBy;
              results.sort((a, b) => {
                if (a[column] < b[column]) return ascending ? -1 : 1;
                if (a[column] > b[column]) return ascending ? 1 : -1;
                return 0;
              });
            }

            if (this._limit) {
              results = results.slice(0, this._limit);
            }

            console.log(\`[Supabase Mock] Selected \${results.length} record(s) from \${tableKey}\`);

            return {
              data: this._single ? (results[0] || null) : results,
              error: null,
            };
          }
        }
      },

      _matchesFilters(record) {
        return this._filters.every(filter => {
          const value = record[filter.column];

          switch (filter.type) {
            case 'eq': return value === filter.value;
            case 'neq': return value !== filter.value;
            case 'gt': return value > filter.value;
            case 'lt': return value < filter.value;
            case 'gte': return value >= filter.value;
            case 'lte': return value <= filter.value;
            case 'like':
              return String(value).toLowerCase().includes(String(filter.pattern).toLowerCase().replace(/%/g, ''));
            case 'ilike':
              return String(value).toLowerCase().includes(String(filter.pattern).toLowerCase().replace(/%/g, ''));
            case 'is': return value === filter.value;
            case 'in': return filter.values.includes(value);
            case 'contains':
              return Array.isArray(value) && value.includes(filter.value);
            default: return true;
          }
        });
      },
    };
  }

  channel(name) {
    console.log('[Supabase Mock] Created channel:', name);
    return {
      on(event, options, callback) {
        console.log('[Supabase Mock] Subscribed to:', event, options);
        return this;
      },
      subscribe() {
        console.log('[Supabase Mock] Channel subscribed');
        return this;
      },
      unsubscribe() {
        console.log('[Supabase Mock] Channel unsubscribed');
        return this;
      },
    };
  }

  get auth() {
    return {
      async signUp(credentials) {
        console.log('[Supabase Mock] Sign up:', credentials.email);
        return {
          data: {
            user: {
              id: crypto.randomUUID(),
              email: credentials.email,
              created_at: new Date().toISOString(),
            },
            session: {
              access_token: 'mock_access_token',
              refresh_token: 'mock_refresh_token',
            },
          },
          error: null,
        };
      },

      async signInWithPassword(credentials) {
        console.log('[Supabase Mock] Sign in:', credentials.email);
        return {
          data: {
            user: {
              id: crypto.randomUUID(),
              email: credentials.email,
            },
            session: {
              access_token: 'mock_access_token',
              refresh_token: 'mock_refresh_token',
            },
          },
          error: null,
        };
      },

      async signOut() {
        console.log('[Supabase Mock] Sign out');
        return { error: null };
      },

      async getUser() {
        console.log('[Supabase Mock] Get user');
        return {
          data: {
            user: {
              id: 'mock_user_id',
              email: 'demo@example.com',
            },
          },
          error: null,
        };
      },

      async getSession() {
        console.log('[Supabase Mock] Get session');
        return {
          data: {
            session: {
              access_token: 'mock_access_token',
              refresh_token: 'mock_refresh_token',
            },
          },
          error: null,
        };
      },

      onAuthStateChange(callback) {
        console.log('[Supabase Mock] Auth state change listener registered');
        return {
          data: {
            subscription: {
              unsubscribe: () => console.log('[Supabase Mock] Auth listener unsubscribed'),
            },
          },
        };
      },
    };
  }

  get storage() {
    return {
      from(bucket) {
        return {
          async upload(path, file, options = {}) {
            console.log(\`[Supabase Mock] File upload: \${path}\`);
            return {
              data: {
                path,
                id: crypto.randomUUID(),
                fullPath: \`\${bucket}/\${path}\`,
              },
              error: null,
            };
          },

          async download(path) {
            console.log(\`[Supabase Mock] File download: \${path}\`);
            return {
              data: new Blob(['mock file content']),
              error: null,
            };
          },

          async remove(paths) {
            console.log(\`[Supabase Mock] File remove: \${paths.join(', ')}\`);
            return {
              data: paths,
              error: null,
            };
          },

          getPublicUrl(path) {
            const url = \`https://mock-storage.supabase.co/storage/v1/object/public/\${bucket}/\${path}\`;
            console.log(\`[Supabase Mock] Public URL: \${url}\`);
            return {
              data: { publicUrl: url },
            };
          },

          async createSignedUrl(path, expiresIn) {
            console.log(\`[Supabase Mock] Signed URL: \${path} (expires in \${expiresIn}s)\`);
            return {
              data: {
                signedUrl: \`https://mock-storage.supabase.co/storage/v1/object/sign/\${bucket}/\${path}?token=mock_token\`,
              },
              error: null,
            };
          },
        };
      },
    };
  }
}

// Export for ES modules
export function createClient(url, key) {
  return new SupabaseMock(url, key);
}

// Global for UMD/browser
if (typeof window !== 'undefined') {
  window.createSupabaseClient = createClient;
}

console.log('[Supabase Mock] Module loaded - Database operations will be simulated in-memory for preview purposes');
`;
