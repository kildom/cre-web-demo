import * as monaco from 'monaco-editor'

self.MonacoEnvironment = {
    getWorkerUrl: function(moduleId, label) {
        if (label === "javascript") {
            return "js/ts.worker.js";
        }
        return "js/editor.worker.js";
    },
};

function setOutput(stderr, stdout) {
    document.getElementById("error").textContent = stderr;
    document.getElementById("output").textContent = stdout;
}

let worker = null;
let workerLastSource = null;

let workerIsRunning = false;
let workerKillTimeout = null;

let editor = null;

let sources = Object.create(null);

function executeCode() {
    let source = editor.getValue();
    if (workerIsRunning || source === workerLastSource) {
        return;
    }
    if (worker === null) {
        worker = new Worker(new URL('./worker.js', import.meta.url));
        worker.onmessage = function(e) {
            if (e.data.status) {
                setOutput("", e.data.status);
            } else {
                clearTimeout(workerKillTimeout);
                workerIsRunning = false;
                setOutput(e.data.stderr, e.data.stdout);
            }
        };
    }

    sources['/input.mjs'] = source;

    worker.postMessage({ source: sources, wasm_url: '../js.wasm' });
    workerLastSource = source;
    workerIsRunning = true;

    workerKillTimeout = setTimeout(function() {
        if (!workerIsRunning) {
            return;
        }
        setOutput("", "Timed out");
        worker.terminate();
        workerIsRunning = false;
        worker = null;
        executeCode();
    }, 5000);
}

function shareCode() {
    let url = window.location.href.split('?')[0];
    url += "?branch=" + document.getElementById("branch").value;
    url += "&source=" + encodeURIComponent(editor.getValue());
    navigator.clipboard.writeText(url);
}

const initSource = `
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
`;

self.onload = async function() {

    let creSource = await (await fetch("con-reg-exp.mjs")).text();

    sources['/input.mjs'] = initSource;
    sources['/console-stub.mjs'] = await (await fetch("console-stub.mjs")).text();
    sources['/input.js'] = `
        mainMod = parseModule('globalThis.console=(await import("/console-stub.mjs")).console;try{await import("/input.mjs");}catch(err){if(err instanceof SyntaxError)throw err;printErr(err.toString());printErr("stack:");printErr("    " + err.stack.replace(/(\\\\r?\\\\n)/g, "$1    "));}');
        creMod = parseModule(${JSON.stringify(creSource)});
        registerModule('con-reg-exp', creMod);
        moduleLink(mainMod);
        moduleEvaluate(mainMod);
    `,

    editor = monaco.editor.create(document.getElementById("editor"), {
        value: initSource,
        language: "javascript",
        minimap: {
            enabled: false
        },
        hideCursorInOverviewRuler: true,
        scrollbar: {vertical: "auto"},
        scrollBeyondLastLine: false,
        theme: "vs-dark",
    });

    // Move cursor to end and focus the editor.
    let numLines = editor.getModel().getLineCount();
    let col = editor.getModel().getLineMaxColumn(numLines);
    editor.setPosition({lineNumber: numLines, column: col});
    editor.focus();

    editor.onDidChangeModelContent(function(model) {
        executeCode();
    });
    executeCode();

    document.getElementById("share").onclick = shareCode;
};
