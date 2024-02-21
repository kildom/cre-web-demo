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

let extensions;

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


self.onload = async function() {

    extensions = await eval("import('../extensions.js')");

    extensions.setupEditor(monaco);

    let creSource = await (await fetch("con-reg-exp.mjs")).text();
    let initSource = await (await fetch("test.mjs")).text();

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
        "semanticHighlighting.enabled": true,
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
};
