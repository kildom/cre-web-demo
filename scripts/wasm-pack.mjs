import * as fs from 'node:fs';
import lzma from 'lzma';

function pack() {
    console.log('Compressing...');
    let wasm = fs.readFileSync('static/js.wasm');
    lzma.compress(wasm, 8, (result, error) => {
        process.stdout.write('\r      \r');
        if (error) {
            console.error(error);
            process.exit(1);
        }
        console.log(wasm.length, '=>', result.length, Math.round(result.length / wasm.length * 100), '%');
        fs.writeFileSync('ext/js.wasm.lzma', new Uint8Array(result));
    }, (percent) => {
        process.stdout.write('\r' + (Math.round(percent * 100)) + '%  ');
    });
}

function unpack() {
    console.log('Decompressing...');
    let cmp = fs.readFileSync('ext/js.wasm.lzma');
    lzma.decompress(cmp, (result, error) => {
        process.stdout.write('\r      \r');
        if (error) {
            console.error(error);
            process.exit(1);
        }
        console.log(cmp.length, '=>', result.length);
        fs.mkdirSync('dist', { recursive: true });
        fs.writeFileSync('static/js.wasm', new Uint8Array(result));
    }, (percent) => {
        process.stdout.write('\r' + (Math.round(percent * 100)) + '%  ');
    });
}

if (process.argv[2] === 'pack') {
    pack();
} else if (process.argv.length < 3) {
    unpack();
} else {
    console.error('Invalid parameters', process.argv);
    process.exit(2);
}