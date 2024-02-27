
function convertObject(value, indent) {
    let list;
    let chars;
    if (value instanceof Array) {
        list = value.map(x => convert(x, indent + 1));
        chars = '[.]';
    } else if (value instanceof RegExp) {
        return value.toString();
    } else {
        list = Object.entries(value).map(([key, value]) => `${/^[a-z0-9$_]/i.test(key) ? key : JSON.stringify(key)}: ${convert(value, indent + 1)}`);
        chars = '{.}';
    }
    if (list.length === 0) return chars.replace('.', '');
    let totalLength = 0;
    let singleLine = list.every(x => {
        totalLength += x.length + 3;
        return x.indexOf('\n') < 0;
    });
    singleLine = singleLine && totalLength < 60;
    if (singleLine) {
        return chars.replace('.', ' ' + list.join(', ') + ' ');
    }
    let result = list.join(',\n' + '    '.repeat(indent + 1));
    return chars.replace('.', '\n' + '    '.repeat(indent + 1) + result + '\n' + '    '.repeat(indent));
}

function convert(value, indent) {
    switch (typeof value) {
        case 'string':
            return indent == 0 ? value : JSON.stringify(value);
        case 'number':
            return value.toString();
        case 'undefined':
            return 'undefined';
        case 'boolean':
            return value ? 'true' : 'false';
        case 'function':
            return `[Function (${value.displayName || value.name})]`;
        case 'symbol':
            return `[${value.toString()}]`;
        case 'bigint':
            return value.toString() + 'n';
        case 'object':
            return value === null ? 'null' : convertObject(value, indent);
    }
}

function printText(error, ...args) {
    let text = args.map(x => convert(x, 0)).join(' ');
    if (error) {
        printErr(text);
    } else {
        print(text);
    }
}

function unsupported() {
    printErr('Unsupported console method called.');
}

class ConsoleStub {
    assert(cond, ...args) { if (!cond) printText(true, ...args); }
    clear(...args) { unsupported(); }
    count(...args) { unsupported(); }
    countReset(...args) { unsupported(); }
    debug(...args) { printText(false, ...args); }
    dir(...args) { unsupported(); }
    dirxml(...args) { unsupported(); }
    error(...args) { printText(true, ...args); }
    group(...args) { unsupported(); }
    groupCollapsed(...args) { unsupported(); }
    groupEnd(...args) { unsupported(); }
    info(...args) { printText(false, ...args); }
    log(...args) { printText(false, ...args); }
    profile(...args) { unsupported(); }
    profileEnd(...args) { unsupported(); }
    table(...args) { unsupported(); }
    time(...args) { unsupported(); }
    timeEnd(...args) { unsupported(); }
    timeLog(...args) { unsupported(); }
    timeStamp(...args) { unsupported(); }
    trace(...args) { unsupported(); }
    warn(...args) { printText(true, ...args); }
};

export const console = new ConsoleStub();
