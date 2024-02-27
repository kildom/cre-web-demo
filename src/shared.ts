
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

export interface ErrorResponse {
    type: 'error';
    mid: number;
    message: string;
}

export type WorkerMessage = CompressMessage;
export type WorkerResponse = CompressResponse | ErrorResponse;
