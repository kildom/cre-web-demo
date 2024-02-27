
import { deflateSync, inflateSync } from 'fflate';
import { CompressMessage, WorkerMessage, WorkerResponse } from './shared.js';

const dictionaryText = "JSON.stringify(.parse( RegExp(.input(.lastMatch(.lastParen(.leftContext(.rightContext(.compile(.exec(.test(.toString(.replace(.match(.matchAll(;\n                                // `;\n\n    \n\nconsole.log(\n\nconst \n\nlet undefined \n\nvar \n\nif (\n\nfor (\n\nwhile (\n\nswitch (    case of in instanceof new true false do {\n    this. break;\n return    } else {\n        } or {\n        ) {\n        }\n);\n\n`;\n\n';\n\n\";\n\n/* */\n\n// = + - * / || && += -= *= ++;\n --;\n == === !== != >= <= < > ?? & | ~ ^ << >> >>> ... \nimport cre from 'con-reg-exp';\n\nimport cre from \"con-reg-exp\";\n\n = cre`.indices`.global`.ignoreCase`.legacy`.unicode`.sticky`.cache`optional begin-of-text; end-of-text; begin-of-line; end-of-line; word-boundary; repeat at-least-1 at-most-times -to- not new-line; line-feed; carriage-return; tabulation; null; space; any; digit; white-space; whitespace; word-character; line-terminator; prop< property< lookahead look-ahead lookbehind look-behind group \"${}\" '${}' ${ ";

const encoder = new TextEncoder();
const dictionary = encoder.encode(JSON.stringify(dictionaryText));

onmessage = (event) => {
    let message = event.data as WorkerMessage;
    try {
        switch (message.type) {
            case 'compress':
                compressMessage(message);
                break;
            case 'decompress':
                decompressMessage(message);
                break;
        }
    } catch (err) {
        response({
            type: 'error',
            mid: message.mid || 0,
            message: err.message || 'Unknown exception',
        });
    }
};

function response(res: WorkerResponse) {
    postMessage(res);
}

function compressMessage(message: CompressMessage) {
    let output = deflateSync(message.input, { level: 9, dictionary, mem: 7 });
    console.log('Compress', message.input.length, output.length);
    response({
        type: 'compress',
        mid: message.mid || 0,
        output,
    });
}

function decompressMessage(message: CompressMessage) {
    let output = inflateSync(message.input, { dictionary });
    console.log('Decompress', message.input.length, output.length);
    response({
        type: 'decompress',
        mid: message.mid || 0,
        output,
    });
}
