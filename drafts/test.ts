import { deflateSync } from 'fflate';
import * as fs from 'fs';

const dataText = `

// Match JS floating point number

import cre from 'con-reg-exp';

// Convenient Regular Expression

const number = cre.global\`
    optional [+-];                    // Sign
    {
        at-least-1 digit;             // Integral part
        optional (".", repeat digit); // Optional factional part
    } or {
        ".";
        at-least-1 digit;             // Variant with only fractional part
    }
    optional {                        // Optional exponent part
        [eE];
        optional [+-];
        at-least-1 digit;
    }
\`;

// Usage

console.log('Compiled: const number =', number.toString());

let sampleText = \`
    This is number: 7
    Scientific notation: 0.3e+10
    Some other examples: -.2, +0e0
    Those are not numbers, but numeric part will be extracted: 1e, x10, 10.10.10.10
\`;

console.log(sampleText.match(number));

await new Promise((resolve, reject) => {
    setTimeout(resolve, 2000);
});

console.log('OK');

`;

let dictText = `
.match(.toString(.exec(";
 = + - % ( ) --; ++; ];
console.log('
                                                               // 
// Convenient Regular Expression
    } or {
    };
if () {
switch ();
const ];
let cre.global\`.ignoreCase\`.indices\`.legacy\`.unicode\`.sticky\`.cache\`;
optional at-least-1 digit;
import cre from 'con-reg-exp';
`;

dictText = "JSON.stringify(.parse( RegExp(.input(.lastMatch(.lastParen(.leftContext(.rightContext(.compile(.exec(.test(.toString(.replace(.match(.matchAll(;\n                                // `;\n\n    \n\nconsole.log(\n\nconst \n\nlet undefined \n\nvar \n\nif (\n\nfor (\n\nwhile (\n\nswitch (    case of in instanceof new true false do {\n    this. break;\n return    } else {\n        } or {\n        ) {\n        }\n);\n\n`;\n\n';\n\n\";\n\n/* */\n\n// = + - * / || && += -= *= ++;\n --;\n == === !== != >= <= < > ?? & | ~ ^ << >> >>> ... \nimport cre from 'con-reg-exp';\n\nimport cre from \"con-reg-exp\";\n\n = cre`.indices`.global`.ignoreCase`.legacy`.unicode`.sticky`.cache`optional begin-of-text; end-of-text; begin-of-line; end-of-line; word-boundary; repeat at-least-1 at-most-times -to- not new-line; line-feed; carriage-return; tabulation; null; space; any; digit; white-space; whitespace; word-character; line-terminator; prop< property< lookahead look-ahead lookbehind look-behind group \"${}\" '${}' ${ ";

const enc = new TextEncoder();
const data = enc.encode(dataText);
const dict = enc.encode(dictText);

let out = deflateSync(data, {
    level: 9,
    dictionary: dict,
});

let str = new Buffer(out).toString('base64');

console.log(data.length, '=>', out.length, Math.round(out.length / data.length * 100), '%');
console.log(data.length, '=>', str.length, Math.round(str.length / data.length * 100), '%');
console.log('#' + str);


let chunks = [
    'JSON.stringify(',
    '.parse(',
    ' RegExp(',
    '.input(',
    '.lastMatch(',
    '.lastParen(',
    '.leftContext(',
    '.rightContext(',
    '.compile(',
    '.exec(',
    '.test(',
    '.toString(',
    '.replace(',
    '.match(',
    '.matchAll(',
    ';\n                                // ',
    '`;\n\n    ',
    '\n\nconsole.log(',
    '\n\nconst ',
    '\n\nlet ',
    ' undefined ',
    '\n\nvar ',
    '\n\nif (',
    '\n\nfor (',
    '\n\nwhile (',
    '\n\nswitch (',
    '    case ',
    ' of ',
    ' in ',
    ' instanceof ',
    ' new ',
    ' true ',
    ' false ',
    ' do {\n    ',
    ' this.',
    ' break;\n',
    ' return ',
    '    } else {\n        ',
    '    } or {\n        ',
    '    ) {\n        ',
    '    }\n',
    ');\n\n',
    '\n`;\n\n',
    '\';\n\n',
    '";\n\n',
    '\n/* ',
    ' */\n\n',
    '\n// ',
    ' = + - * / || && += -= *= ++;\n --;\n == === !== != >= <= < > ?? & | ~ ^ << >> >>> ... ',
    '\nimport cre from \'con-reg-exp\';\n\n',
    '\nimport cre from "con-reg-exp";\n\n',
    ' = cre`',
    '.indices`',
    '.global`',
    '.ignoreCase`',
    '.legacy`',
    '.unicode`',
    '.sticky`',
    '.cache`',
    'optional ',
    ' begin-of-text;',
    ' end-of-text;',
    ' begin-of-line;',
    ' end-of-line;',
    ' word-boundary;',
    ' repeat ',
    ' at-least-1 ',
    ' at-most-',
    '-times ',
    '-to-',
    ' not ',
    ' new-line;',
    ' line-feed;',
    ' carriage-return;',
    ' tabulation;',
    ' null;',
    ' space;',
    ' any;',
    ' digit;',
    ' white-space;',
    ' whitespace;',
    ' word-character;',
    ' line-terminator;',
    ' prop<',
    ' property<',
    ' lookahead ',
    ' look-ahead ',
    ' lookbehind ',
    ' look-behind ',
    ' group ',
    ' "${}" ',
    ' \'${}\' ',
    ' ${ ',
];
/*

let text = fs.readFileSync('codes.txt', 'utf8');

function count(text: string, substring: string): number {
    return text.split(substring).length - 1;
}

console.log('hist');

let hist = Object.create(null);

for (let i = 0; i < text.length - 4; i++) {
    let maxChunkLength = Math.min(30, text.length - i);
    for (let j = 4; j <= maxChunkLength; j++) {
        let chunk = text.substring(i, i + j);
        if (hist[chunk] !== undefined) continue;
        hist[chunk] = count(text, chunk) - 1;
    }
}

console.log('filter');

let entries = Object.entries(hist).filter(entry => entry[1] > 5) as [string, number][];

entries = entries.filter(entry => chunks.every(chunk => chunk.indexOf(entry[0]) < 0));

for (let entry of [...entries]) {
    entries = entries.filter(inner => inner[0].length >= entry[0].length || inner[1] !== entry[1] || entry[0].indexOf(inner[0]) < 0);
}

hist = Object.fromEntries(entries.sort((a, b) => a[1] - b[1]));

console.log(hist);

*/

let gen = '';

for (let chunk of chunks) {
    let overlap = 0;
    while (overlap < chunk.length && overlap < gen.length && gen.endsWith(chunk.substring(0, overlap + 1))) {
        overlap++;
    }
    if (overlap) console.log('overlap:', overlap, JSON.stringify(gen.substring(gen.length - overlap - 3)), JSON.stringify(chunk));
    gen += chunk.substring(overlap);
}

let dictCompressed = deflateSync(enc.encode(gen), {
    level: 9,
    mem: 10,
});

console.log(JSON.stringify(gen), gen.length, new Buffer(dictCompressed).toString('base64').length);
