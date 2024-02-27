
export enum RunStatus {
    DOWNLOADING,
    COMPILING,
    LOADING,
    RUNNING,
}

export interface CompressMessage {
    type: 'compress' | 'decompress';
    mid?: number;
    version: number;
    input: Uint8Array;
}

export interface CompressResponse {
    type: 'compress' | 'decompress';
    mid: number;
    output: Uint8Array;
}

export interface ExecuteMessage {
    type: 'execute';
    mid?: number;
    typescript: boolean;
    name: string;
    code: string;
}

export interface ExecuteProgress {
    type: 'execute-progress';
    mid: number;
    status: RunStatus;
}

export interface ExecuteResponse {
    type: 'execute';
    mid: number;
    compileMessages: string;
    stdio: string[];
    fileName: string;
}

export interface ErrorResponse {
    type: 'error';
    mid: number;
    message: string;
}

export type WorkerMessage = CompressMessage | ExecuteMessage;
export type WorkerProgress = ExecuteProgress;
export type WorkerResponse = CompressResponse | ErrorResponse | ExecuteResponse;
