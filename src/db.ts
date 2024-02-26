
export class DatabaseBlockedError extends Error { }
export class AbortError extends Error { }

function convertDOMStringList(list: DOMStringList): string[] {
    return new Array(list.length).fill(undefined).map((_, i) => list.item(i) as string);
}

export class Database {

    constructor(public raw: IDBDatabase, private _transaction?: Transaction) { }

    public deleteObjectStore(name: string): void {
        this.raw.deleteObjectStore(name);
    }

    public createObjectStore<T>(name: string, options?: IDBObjectStoreParameters): ObjectStore<T> {
        if (!this._transaction) {
            throw new DOMException('The method was not called from a "versionchange" transaction callback.', 'InvalidStateError');
        }
        let storeRaw = this.raw.createObjectStore(name, options);
        return new ObjectStore<T>(storeRaw, this._transaction);
    }

    public transaction(name: string, mode: 'readonly' | 'readwrite', options?: IDBTransactionOptions): Transaction {
        return new Transaction(this.raw.transaction(name, mode, options), this);
    }

    public close(): void {
        this.raw.close();
    }
}

export class ObjectStore<T> {

    constructor(public raw: IDBObjectStore, private _transaction: Transaction) { }

    public get autoIncrement(): boolean { return this.raw.autoIncrement; }
    public get indexNames(): string[] { return convertDOMStringList(this.raw.indexNames); }
    public get name(): string { return this.raw.name; }
    public get transaction(): Transaction { return this._transaction; }

    public put(value: T, key?: IDBValidKey): Promise<IDBValidKey> {
        return new Promise<IDBValidKey>((resolve, reject) => {
            let res = this.raw.put(value, key);
            res.onsuccess = () => resolve(res.result);
            res.onerror = () => reject(res.error);
        });
    }

    public getAll(query?: IDBValidKey | IDBKeyRange | null, count?: number): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            let res = this.raw.getAll(query, count);
            res.onsuccess = () => resolve(res.result);
            res.onerror = () => reject(res.error);
        });
    }

    public get(key: IDBValidKey | IDBKeyRange): Promise<T | undefined> {
        return new Promise<T | undefined>((resolve, reject) => {
            let res = this.raw.get(key);
            res.onsuccess = () => resolve(res.result);
            res.onerror = () => reject(res.error);
        });
    }

    public delete(key: IDBValidKey | IDBKeyRange): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let res = this.raw.delete(key);
            res.onsuccess = () => resolve();
            res.onerror = () => reject(res.error);
        });
    }

}

export enum TransactionState {
    ACTIVE,
    COMMITTING,
    COMMITTED,
    ABORTING,
    ABORTED,
    ERROR,
}

export class Transaction {
    private _state = TransactionState.ACTIVE;
    private resolve?: (value: void | PromiseLike<void>) => void;
    private reject?: (reason?: any) => void;
    private promise?: Promise<void>;
    private error?: any;

    public constructor(public raw: IDBTransaction, private _db: Database) {
    }

    public get state(): TransactionState {
        return this._state;
    }

    public get db(): Database {
        return this._db;
    }

    public get durability(): 'default' | 'relaxed' | 'strict' {
        return this.raw.durability;
    }

    public get mode(): 'readonly' | 'readwrite' | 'versionchange' {
        return this.raw.mode;
    }

    public get objectStoreNames(): string[] {
        return convertDOMStringList(this.raw.objectStoreNames);
    }

    public objectStore<T>(name: string): ObjectStore<T> {
        let store = this.raw.objectStore(name);
        return new ObjectStore<T>(store, this);
    }

    public commit(): Promise<void> {
        switch (this._state) {
            case TransactionState.COMMITTED:
                return Promise.resolve();
            case TransactionState.COMMITTING:
                return this.promise as Promise<void>;
            case TransactionState.ABORTED:
            case TransactionState.ABORTING:
                return Promise.reject(new AbortError('Transaction aborted already.'));
            case TransactionState.ERROR:
                return Promise.reject(this.error);
        }
        this.promise = new Promise<void>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        this.raw.oncomplete = () => {
            this._state = TransactionState.COMMITTED;
            this.resolve?.();
        }
        this.raw.onerror = () => {
            this._state = TransactionState.ERROR;
            this.error = this.raw.error || new Error('Transaction error.');
            this.reject?.(this.error);
        }
        this.raw.onabort = () => {
            this._state = TransactionState.ERROR;
            this.error = new AbortError('Transaction aborted unexpectedly.');
            this.reject?.(this.error);
        }
        this._state = TransactionState.COMMITTING;
        this.raw.commit();
        return this.promise;
    }

    public abort(): Promise<void> {
        switch (this._state) {
            case TransactionState.ABORTED:
                return Promise.resolve();
            case TransactionState.ABORTING:
                return this.promise as Promise<void>;
            case TransactionState.COMMITTED:
            case TransactionState.COMMITTING:
                return Promise.reject(new AbortError('Transaction committed already.'));
            case TransactionState.ERROR:
                return Promise.reject(this.error);
        }
        this.promise = new Promise<void>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        let oncomplete = () => {
            this._state = TransactionState.ABORTED;
            this.resolve?.();
        }
        this.raw.oncomplete = oncomplete;
        this.raw.onabort = oncomplete;
        this.raw.onerror = () => {
            this._state = TransactionState.ERROR;
            this.error = this.raw.error || new Error('Transaction error.');
            this.reject?.(this.error);
        }
        this._state = TransactionState.ABORTING;
        this.raw.abort();
        return this.promise;
    }

    public async finalize() {
        try {
            switch (this._state) {
                case TransactionState.ACTIVE:
                    await this.abort();
                    return;
                case TransactionState.ABORTING:
                case TransactionState.COMMITTING:
                    await this.promise;
                    return;
                case TransactionState.ABORTED:
                case TransactionState.COMMITTED:
                case TransactionState.ERROR:
                    return;
            }
        } catch (err) { }
    }

    public [Symbol.asyncDispose](): Promise<void> {
        return this.finalize();
    }
}

function openImpl(
    resolve: (value: Database | PromiseLike<Database>) => void,
    reject: (reason?: any) => void,
    retryCounter: number,
    name: string,
    version: number | undefined,
    callback: VersionChangeCallback,
    blockTimeout: number) {

    let res = indexedDB.open(name, version);
    res.onerror = () => reject(res.error);
    res.onsuccess = () => resolve(new Database(res.result));
    res.onupgradeneeded = (event) => {
        let transaction = new Transaction(res.transaction as IDBTransaction, this);
        let database = new Database(res.result, transaction);
        try {
            let callbackResult = callback(database, transaction, event.oldVersion, event.newVersion || 0);
            if (callbackResult instanceof Promise) {
                callbackResult
                    .then(() => transaction.commit())
                    .catch((err) => {
                        reject(err);
                        transaction.abort();
                    });
            } else {
                transaction.commit();
            }
        } catch (err) {
            reject(err);
            try {
                transaction.finalize();
                database.close();
            } catch (errIgnore) { }
        }
    };
    res.onblocked = () => {
        if (blockTimeout <= 0) {
            throw new DatabaseBlockedError('Database is blocked by "versionchange" transaction.');
        }
        let delayTime = Math.round(Math.max(1, Math.min(50, blockTimeout / 5, retryCounter * retryCounter)));
        setTimeout(() => {
            openImpl(resolve, reject, retryCounter + 1, name, version, callback, blockTimeout - delayTime);
        }, delayTime);
    };
}

type VersionChangeCallback = (database: Database, transaction: Transaction, oldVersion: number, newVersion: number) => any;

export function open(name: string, version: number, callback: VersionChangeCallback, blockTimeout: number = 0): Promise<Database> {
    return new Promise<Database>((resolve, reject) => openImpl(resolve, reject, 0, name, version, callback, blockTimeout));
}

export function cmp(a: any, b: any): -1 | 0 | 1 {
    return indexedDB.cmp(a, b) as (-1 | 0 | 1);
}

export function databases(): Promise<IDBDatabaseInfo[]> {
    return indexedDB.databases();
}

