

import * as monaco from 'monaco-editor';//esm/vs/editor/editor.main.js';

import { Alignment, Button, ContextMenu, Icon, InputGroup, Menu, MenuDivider, MenuItem, Navbar, Popover, Spinner, Tab, TabId, Tabs } from '@blueprintjs/core';
import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';

import 'normalize.css/normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';


const INITIAL_FILE = 'Intro.js';
const INITIAL_CONTENT = `
let x;// TODO: put some intro here
`;

interface FileState {
    readonly id: number;
    readonly name: string;
    readonly mutable: {
        content: string | monaco.editor.ITextModel;
        viewState?: monaco.editor.ICodeEditorViewState;
        dirty: boolean;
    };
}

interface RecentFile {
    name: string;
    time: number;
}

interface State {
    readonly selectedFileId: number;
    readonly files: FileState[];
    readonly renaming: boolean;
    readonly status: string;
    readonly progress: boolean;
    readonly recent: RecentFile[];
    readonly mutable: {
        storageVersion: number;
        closedIds: number[];
    }
}

(self as any).MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        if (label === 'json') {
            return './vs/language/json/json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return './vs/language/css/css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './vs/language/html/html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
            return './vs/language/typescript/ts.worker.js';
        }
        return './vs/editor/editor.worker.js';
    }
};

monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
});

monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
});

let initialState: State = { // TODO: try to load from storage first
    selectedFileId: 0,
    files: [
        {
            id: 0,
            name: 'Untitled-1.js',
            mutable: {
                content: '\nlet x;// TODO: put some intro here\n',
                dirty: false,
            }
        },
        {
            id: 1,
            name: 'Untitled-12.ts',
            mutable: {
                content: '\nlet x: Set<string>;// TODO: put some intro here\n',
                dirty: false,
            }
        },
        {
            id: 2,
            name: 'Untitled-123.ts',
            mutable: {
                content: '\nlet x: Set<string>;// TODO: put some intro here\n',
                dirty: false,
            }
        },
    ],
    renaming: false,
    status: '',
    progress: false,
    recent: [
        {
            name: 'Untitled-123.js',
            time: Date.now() - 1000000,
        },
        {
            name: 'Other file.js',
            time: Date.now() - 5000000,
        },
        {
            name: 'Some older.js',
            time: Date.now() - 15000000,
        },
    ],
    mutable: {
        closedIds: [],
        storageVersion: -1,
    }
};

let lastFileId: number = 10;

let curState: State | undefined = undefined;
let tempState: State | undefined = undefined;
let setStateReal: React.Dispatch<React.SetStateAction<State>>;

function setState(state: State) {
    if (tempState) {
        if (state === tempState) return; // ignore - this is recently set state
    } else {
        if (state === curState) return; // ignore - this is current state
    }
    tempState = state;
    setStateReal(state);
}

function getState(): State {
    if (!curState) {
        throw new Error('State not ready');
    }
    return tempState || curState;
}

function tabSelected(newTabId: number, prevTabId: undefined | number) {
    storeEditorFile();
    let state = getState();
    setState({ ...state, selectedFileId: newTabId });
    restoreEditorFile();
    renameDone();
};

function formatDate(time: number | Date): string {
    if (typeof time !== 'number') {
        time = time.getTime();
    }
    return Math.round((Date.now() - time) / 1000).toString();
}

async function fileClosed(id: number) {
    await delay(10);
    let state = getState();
    disposeEditorFile(state.files.find(file => file.id === id));
    let selected = state.files.find(file => file.id !== id)!.id;
    for (let file of state.files) {
        if (file.id === id) break;
        selected = file.id;
    }
    state = { ...state, selectedFileId: selected, files: state.files.filter(file => file.id !== id) };
    state.mutable.closedIds.push(id);
    setState(state);
    restoreEditorFile();
    renameDone();
    dbSynchronizeRequest();
}

function languageFromName(name: string): string {
    let ext = '';
    let m = name.match(/\.([a-z]+)$/);
    if (m) {
        ext = m[1].toLowerCase();
    }
    return extensions[ext] || 'javascript';
}

function restoreEditorFile() {
    let state = getState();
    let id = state.selectedFileId;
    let file = state.files.find(file => file.id === id) as FileState;
    let language = languageFromName(file.name);
    let model: monaco.editor.ITextModel;
    if (typeof file.mutable.content === 'string') {
        model = monaco.editor.createModel(file.mutable.content, language);
        file.mutable.content = model;
    } else {
        model = file.mutable.content;
    }
    editor.setModel(null);
    editor.setModel(model);
    editor.setValue(editor.getValue());
    if (file.mutable.viewState) {
        editor.restoreViewState(file.mutable.viewState);
    }
    editor.focus();
    setTimeout(() => editor?.focus(), 50);
}

function storeEditorFile() {
    if (editor === undefined) {
        return;
    }
    let state = getState();
    let id = state.selectedFileId;
    let file = state.files.find(file => file.id === id) as FileState;
    let model = editor.getModel();
    file.mutable.content = model || editor.getValue();
    file.mutable.viewState = editor.saveViewState() || undefined;
}

function disposeEditorFile(file?: FileState) {
    if (file) {
        if (typeof file.mutable.content !== 'string') {
            file.mutable.content.dispose();
        }
        file.mutable.content = '';
        file.mutable.viewState = undefined;
    }
}

function renameStart(file: FileState) {
    let state = getState();
    if (state.selectedFileId !== file.id) {
        return;
    }
    setTimeout(() => {
        let state = getState();
        if (state.selectedFileId !== file.id) {
            return;
        }
        setState({ ...state, renaming: true })
    }, 100);
}

function renameUpdate(file: FileState, text: string) { // TODO: remove file parameter
    let state = getState();
    setState({ ...state, files: state.files.map(file => file.id !== state.selectedFileId ? file : { ...file, name: text }) });
}

function renameDone() {
    let state = getState();
    setState({ ...state, renaming: false });
    let file = state.files.find(file => file.id === state.selectedFileId) as FileState;
    let name = file.name.trim();
    if (name === '') {
        name = 'Untitled';
    }
    if (name !== file.name) {
        renameUpdate(file, name);
    }
    let language = languageFromName(name);
    if (typeof file.mutable.content !== 'string' && language !== file.mutable.content.getLanguageId()) {
        monaco.editor.setModelLanguage(file.mutable.content, language);
    }
    file.mutable.dirty = true;
    dbSynchronizeRequest();
}

const NEW_FILE_TEMPLATE = `
// Import Convenient Regular Expressions
import cre from "con-reg-exp";

const yourExpression = cre\`\`;
`;

function newFile(ext: string) {
    let state = getState();
    let names = new Set(state.files.map(file => file.name));
    let fileName = `Untitled.${ext}`;
    let index = 2;
    while (names.has(fileName)) {
        fileName = `Untitled (${index}).${ext}`;
        index++;
    }
    let file: FileState = {
        id: generateFileId(state),
        name: fileName,
        mutable: {
            content: NEW_FILE_TEMPLATE,
            dirty: true,
        }
    }
    setState({ ...state, files: [...state.files, file]});
    tabSelected(file.id, state.selectedFileId);
    dbSynchronizeRequest();
}


function App() {
    let arr = React.useState<State>({ ...initialState });
    let state = arr[0];
    setStateReal = arr[1];
    curState = state;
    tempState = undefined;
    //console.log(state);
    return (
        <>
            <div className="bottons">
                <Navbar>
                    <Navbar.Group align={Alignment.LEFT}>
                        <Navbar.Heading><span style={{ fontSize: '85%' }}><a href="https://kildom.github.io/con-reg-exp/" target="_blank">Convenient Regular Expressions</a><br />Web Demo</span></Navbar.Heading>
                        <Navbar.Divider />
                        <Popover placement="bottom" content={
                            <Menu large={true}>
                                <MenuItem text="JavaScript" icon="add" onClick={() => newFile('js')} />
                                <MenuItem text="TypeScript" icon="add" onClick={() => newFile('ts')} />
                            </Menu>
                        }>
                            <Button minimal={true} icon="add" text="New" rightIcon="caret-down" />
                        </Popover>
                        <Popover placement="bottom" content={
                            <Menu large={true}>
                                <MenuItem text="number.js" icon="document" label="Match JS floating point number" labelClassName='menu-label' />
                                <MenuItem text="json-array.js" icon="document" label="Match JSON array of numbers" labelClassName='menu-label' />
                                <MenuItem text="ipv4-address.js" icon="document" label="Match IPv4 address" labelClassName='menu-label' />
                                <MenuItem text="time.js" icon="document" label="Match time in both 12 and 24-hour format" labelClassName='menu-label' />
                            </Menu>
                        }>
                            <Button minimal={true} text="Samples" icon="code" rightIcon="caret-down" />
                        </Popover>
                        <Popover placement="bottom" content={
                            <Menu large={true}>
                                <MenuItem text="Open tutorial" icon="share" label="Go to tutorial page first" labelClassName='menu-label' intent='primary' />
                                <MenuDivider />
                                <MenuItem text="tutorial-1.js" icon="document" label="Simples expression" labelClassName='menu-label' />
                                <MenuItem text="tutorial-1a.js" icon="document" label="Simple expression with character class" labelClassName='menu-label' />
                            </Menu>
                        }>
                            <Button minimal={true} text="Tutorial" icon="learning" rightIcon="caret-down" />
                        </Popover>
                        <Popover placement="bottom" content={
                            <Menu large={true}>
                                <MenuItem text="From URL" icon="text-highlight" />
                                <MenuItem text="Local File" icon="folder-shared" />
                                <MenuItem text="Recently closed" icon="history">
                                    {state.recent.map(item => (
                                        <MenuItem text={item.name} icon="document" label={formatDate(item.time)} labelClassName='menu-label' />
                                    ))}
                                </MenuItem>
                            </Menu>
                        }>
                            <Button minimal={true} icon="folder-open" text="Open" rightIcon="caret-down" />
                        </Popover>
                        <Button minimal={true} icon="share" text="Share" />
                        <Button minimal={true} icon="download" text="Download" />
                        <Navbar.Divider />
                        {/*<Spinner size={20} />*/}
                        <Navbar.Heading><span style={{ fontSize: '90%' }}>  Running...</span></Navbar.Heading>
                    </Navbar.Group>
                </Navbar>
            </div>
            <div className="tabs">
                <Tabs selectedTabId={state.selectedFileId} large={true}
                    onChange={tabSelected}>
                    {state.files.map(file =>
                        (state.renaming && file.id === state.selectedFileId) ? (
                            <InputGroup onKeyUp={key => key.key === 'Enter' || key.key === 'Escape' ? renameDone() : null} inputClassName='file-name-input' style={{ width: `calc(25px + ${file.name.length}ch)` }} large={true} autoFocus={true} value={file.name} onValueChange={text => renameUpdate(file, text)} onBlur={() => renameDone()} />
                        ) : (
                            <Tab id={file.id} onMouseUp={() => renameStart(file)}>  {file.name} {state.files.length > 1 ? (
                                <Icon icon="small-cross" className='close-icon' onClick={() => fileClosed(file.id)} />
                            ) : ' '}</Tab>
                        ))}
                </Tabs>
            </div>
        </>
    );
}

const extensions: { [key: string]: string } = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    mts: 'typescript',
    cts: 'typescript',
};
let editor: monaco.editor.IStandaloneCodeEditor;

let db: IDBDatabase;

interface ExternalPromiseResult<T> {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
}

interface DBFile {
    id: number;
    name: string;
    content: string;
};

interface DBVersion {
    id: 'version';
    version: number;
};

type DBEntry = DBFile | DBVersion;

function externalPromise<T = void>(): ExternalPromiseResult<T> {
    let result = {} as ExternalPromiseResult<T>;
    result.promise = new Promise<T>((resolve, reject) => {
        result.resolve = resolve;
        result.reject = reject;
    });
    return result;
}

function requestToPromise<T = void>(req: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(new Error('IndexedDB Request Failed'));
    });
}

class AbortedError extends Error { }

function transactionCommit(transaction: IDBTransaction): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        transaction.onerror = () => reject(new Error('Transaction error!'));
        transaction.onabort = () => reject(new AbortedError('Transaction aborted!'));
        transaction.oncomplete = () => resolve();
        transaction.commit();
    });
}

function transactionAbort(transaction: IDBTransaction): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        transaction.onerror = () => reject(new Error('Transaction error!'));
        transaction.onabort = () => resolve();
        transaction.oncomplete = () => resolve();
        transaction.abort();
    });
}

function delay(time: number): Promise<void> {
    return new Promise(r => setTimeout(r, time));
}

function deffer(): Promise<void> {
    return delay(0);
}

function generateFileId(state?: State) {
    let id: number;
    let repeat = false;
    do {
        id = Math.floor(Math.random() * 4503599627370496);
        if (state) {
            for (let file of state.files) {
                repeat = id === file.id;
            }
        }
    } while (repeat);
    return id;
}

async function openStorage() {
    const INDEXED_DB_VERSION = 13;
    let openReq = indexedDB.open('cre-web-demo-storage', INDEXED_DB_VERSION);
    let ep = externalPromise();
    openReq.onerror = () => ep.reject(new Error('Open persistent storage failed!'));
    openReq.onblocked = () => ep.reject(new Error('Open persistent storage failed!'));
    openReq.onsuccess = () => ep.resolve();
    openReq.onupgradeneeded = async () => {
        try {
            try {
                openReq.result.deleteObjectStore('files');
                openReq.result.deleteObjectStore('recent');
            } catch (err) { }
            let files = openReq.result.createObjectStore('files', { keyPath: 'id' });
            openReq.result.createObjectStore('recent');
            files.put({
                id: generateFileId(),
                name: INITIAL_FILE,
                content: INITIAL_CONTENT,
            });
            files.put({
                id: 'version',
                version: -1,
            });
            await transactionCommit(openReq.transaction as IDBTransaction);
            ep.resolve();
        } catch (err) {
            ep.reject(err);
        }
    }
    await ep.promise;
    db = openReq.result;
    let transaction = db.transaction('files', 'readonly');
    let files = transaction.objectStore('files');
    let list = await requestToPromise(files.getAll()) as DBEntry[];
    let stateFiles: FileState[] = [];
    for (let entry of list) {
        if ('version' in entry) {
            initialState.mutable.storageVersion = entry.version;
        } else {
            stateFiles.push({
                id: entry.id,
                name: entry.name,
                mutable: {
                    content: entry.content,
                    dirty: false,
                },
            });
        }
    }
    if (stateFiles.length > 0) {
        initialState = { ...initialState, files: stateFiles, selectedFileId: stateFiles[0].id };
    }
    /*let inIntoState = initialState.files.length === 1
        && initialState.files[0].name === INITIAL_FILE
        && initialState.files[0].mutable.content === INITIAL_CONTENT;*/
    // TODO: Load from URL and make it active
}

async function loadStorageChanges() {
    let state = getState();
    let transaction = db.transaction('files', 'readonly');
    let store = transaction.objectStore('files');
    let versionObject = await requestToPromise(store.get('version')) as DBVersion;
    let version = versionObject?.version || -1;
    if (version === state.mutable.storageVersion) {
        await transactionAbort(transaction);
        return;
    }
    for (let file of state.files) {
        if (file.mutable.dirty) continue;
        let row = (await requestToPromise(store.get(file.id))) as (DBFile | undefined);
        state = getState();
        if (!row) continue;
        let fileContent = file.mutable.content;
        if (typeof fileContent !== 'string') {
            fileContent = fileContent.getValue();
        }
        if (row.content !== fileContent) {
            if (typeof file.mutable.content !== 'string') {
                file.mutable.content.setValue(row.content);
            } else {
                file.mutable.content = row.content;
            }
            console.log('Recv Content', row.name);
        }
        if (row.name !== file.name) {
            state = getState();
            console.log('Recv Name', row.name, '=>', file.name);
            setState({ ...state, files: state.files.map(f => f.id !== file.id ? f : { ...f, name: row!.name }) });
        }
    }
    await transactionCommit(transaction);
    state.mutable.storageVersion = version;
}

async function storeStorageChanges() {
    let state = getState();
    let rows: DBFile[] = [];
    let closedIds = state.mutable.closedIds;
    state.mutable.closedIds = [];
    for (let file of state.files) {
        if (file.mutable.dirty) {
            file.mutable.dirty = false;
            let content = file.mutable.content;
            rows.push({
                id: file.id,
                name: file.name,
                content: typeof content === 'string' ? content : content.getValue(),
            });
        }
    }
    if (closedIds.length > 0 || rows.length > 0) {
        let changes = 0;
        let transaction = db.transaction('files', 'readwrite');
        try {
            let storage = transaction.objectStore('files');
            for (let id of closedIds) {
                let old = await requestToPromise(storage.get(id));
                if (old) {
                    changes++;
                    await requestToPromise(storage.delete(id));
                }
            }
            for (let row of rows) {
                let old = await requestToPromise(storage.get(row.id)) as (DBFile | undefined);
                if (!old || old.content !== row.content || old.name !== row.name) {
                    changes++;
                    await requestToPromise(storage.put(row));
                }
            }
            if (changes) {
                console.log('Changes', changes);
                let versionChange: DBVersion = {
                    id: 'version',
                    version: generateFileId(),
                }
                await requestToPromise(storage.put(versionChange));
                await transactionCommit(transaction);
                state.mutable.storageVersion = versionChange.version;
            } else {
                await transactionAbort(transaction);
            }
        } catch (error) {
            await transactionAbort(transaction);
            throw error;
        }
    }
}

async function dbSynchronize() {
    if (!curState) return;
    try {
        await loadStorageChanges();
        await storeStorageChanges();
    } catch (err) {
        try {
            await delay(50);
            await storeStorageChanges();
        } catch (err) {
            await delay(100);
            await storeStorageChanges();
        }
    }
}

let dbSynchronizing = false;
let dbSynchronizeWaiting = false;
let dbSynchronizeTimer = setTimeout(() => { }, 0);

async function dbSynchronizeRequest() {
    clearTimeout(dbSynchronizeTimer);
    if (dbSynchronizing) {
        if (dbSynchronizeWaiting) return;
        dbSynchronizeWaiting = true;
        while (dbSynchronizing) {
            await delay(2);
        }
        dbSynchronizeWaiting = false;
    }
    dbSynchronizing = true;
    try {
        await dbSynchronize();
    } finally {
        dbSynchronizing = false;
        dbSynchronizeTimer = setTimeout(dbSynchronizeRequest, 1000);
    }
}

function editorValueChange() {
    let state = getState();
    let file = state.files.find(file => file.id === state.selectedFileId);
    file!.mutable.dirty = true;
    dbSynchronizeRequest();
}

window.onload = async () => {
    await openStorage(); // TODO: handle errors to allow other stuff even when storage does not work properly
    // TODO: initialization: read data from storage, read source from URL
    let mainPanel = document.querySelector('.editorPanel') as HTMLElement;
    let panel = document.createElement('div');
    panel.className = 'editor';
    editor = monaco.editor.create(panel, {
        theme: 'vs-dark',
        automaticLayout: true,
        extraEditorClassName: 'editorControl',
        model: null,
    });
    editor.onDidChangeModelContent(editorValueChange);
    mainPanel.appendChild(panel);
    ReactDOM.render(<App />, document.getElementById('reactRoot'));
    restoreEditorFile();
    dbSynchronizeRequest();
};
