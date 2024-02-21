
// Match JS floating point number

import cre from 'con-reg-exp';

// Convenient Regular Expression

let number = cre.global`
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
`;

// Usage

console.log('Compiled: let number =', number.toString());

let sampleText = `
    This is number: 7
    Scientific notation: 0.3e+10
    Some other examples: -.2, +0e0
    Those are not numbers, but numeric part will be extracted: 1e, x10, 10.10.10.10
`;

console.log(sampleText.match(number));
// Match JSON array of numbers


// Convenient Regular Expression

number = cre`
    optional "-";               // Sign
    {                           // Integral part
        "0";                    // Zero is special case
    } or {
        [1-9], repeat digit;    // Everything above zero
    }
    optional {                  // Optional factional part
        ".";
        at-least-1 digit;
    }
    optional {                  // Optional exponent part
        [eE];
        optional [+-];
        at-least-1 digit;
    }
`;

let ws = cre`repeat whitespace`;

let arrayOfNumbers = cre`
    begin-of-text, ${ws};      // Trim leading whitespaces
    "[", ${ws};                // Begin of array
    optional {                 // Optional, because array can be empty
        repeat {               // Numbers with trailing comma
            ${number}, ${ws};
            ",", ${ws};
        }
        ${number}, ${ws};      // Last number has no comma
    }
    "]", ${ws};                // End of array
    end-of-text;
`;

// Usage

console.log('Compiled: let arrayOfNumbers =', arrayOfNumbers.toString());

let sampleTexts = [
    '[1,2,3]',
    ' [ 1 , 2 , 3 ] ',
    '\n[\n1,\n2,\r\n3\n]\n',
    '[0.1, 0.2, 0.3]',
    '[1e1, 1e+1, 1.00E+1, 0.1E-1]',
    '[]',
    '[1,2,]',
    '[1,2,"3"]',
    '[.1]',
    '[1.]',
    '[1.e+12]',
];

for (let text of sampleTexts) {
    if (arrayOfNumbers.test(text)) {
        console.log(JSON.stringify(text), '=>', JSON.parse(text));
    } else {
        console.log(JSON.stringify(text), '=> invalid');
    }
}
// Match IPv4 address


// Convenient Regular Expression
let ipv4number = cre`
    {
        "25", [0-5];           // Range 250…255
    } or {
        "2", [0-4], digit;     // Range 240…249
    } or {
        "1", digit, digit;     // Range 100…199
    } or {
        optional [1-9], digit; // Range 0…99
    }
`;

let ipv4address = cre.global`
    // Disallow anything behind that reassembles IPv4 addresses
    lookbehind not (digit or ".");
    // Four numbers separated by dot
    ${ipv4number};
    3-times {
        ".";
        ${ipv4number};
    }
    // Disallow anything ahead that reassembles IPv4 addresses
    lookahead not (digit or ".");
`;

// Usage

console.log('Compiled: let ipv4address =', ipv4address.toString());

sampleText = `
    This sample will extract everything that looks like an IPv4 address,
    for example this is valid: 127.0.0.1, but this is not: 127.0.o.1.
    Also, ranges of numbers are checked, so "255.255.255.255" is ok,
    but "256.256.256.256" is not. If you get too many number, the
    pattern will also not match, for example "233.252.0.1.80" will not
    match, but "233.252.0.2:80" will match everything before ":".
`;

console.log(sampleText.match(ipv4address));
// Match time in both 12 and 24-hour format

// Convenient Regular Expression

let minutesAndSoOn = cre.ignoreCase`
    ":", [0-5], digit;                    // Minutes
    optional {
        ":", [0-5], digit;                // Seconds
        optional (".", at-least-1 digit); // Fraction of a second
    }
`;

let time = cre.global.ignoreCase`
    {
        // 12-hour format
        {
            "1", [0-2];                 // Range 10…12
        } or {
            optional "0", digit;        // Range 0…9
        }
        ${minutesAndSoOn};
        repeat whitespace;              // Allow any whitespaces before AM/PM
        "AM" or "PM";
    } or {
        // 24-hour format
        {
            "2", [0-3];                 // Range 20…23
        } or {
            optional [01], digit;       // Range 0…19
        }
        ${minutesAndSoOn};
    }
`;

// Usage

console.log('Compiled: let time =', time.toString());

sampleText = `
    sample time: 8:59
    12-hour format: 8:59AM
    24-hour format: 18:59
    you cannot combine these: 18:59PM
    or pass over valid range: 8:60
    with seconds: 8:58:09
    with fraction: 23:59:59.99
    or in nanosecond precision 23:59:59.999999999
`;

console.log(sampleText.match(time));