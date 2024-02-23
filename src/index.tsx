

import * as monaco from 'monaco-editor';//esm/vs/editor/editor.main.js';

import { Alignment, Button, ContextMenu, Icon, InputGroup, Menu, MenuDivider, MenuItem, Navbar, Popover, Spinner, Tab, TabId, Tabs } from '@blueprintjs/core';
import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';

import 'normalize.css/normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

interface FileState {
    readonly id: number;
    readonly name: string;
    readonly mutable: {
        content: string | monaco.editor.ITextModel;
        viewState?: monaco.editor.ICodeEditorViewState;
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

const initialState: State = { // TODO: try to load from storage first
    selectedFileId: 0,
    files: [
        {
            id: 0,
            name: 'Untitled-1.js',
            mutable: {
                content: '\nlet x;// TODO: put some intro here\n',
            }
        },
        {
            id: 1,
            name: 'Untitled-12.ts',
            mutable: {
                content: '\nlet x: Set<string>;// TODO: put some intro here\n',
            }
        },
        {
            id: 2,
            name: 'Untitled-123.ts',
            mutable: {
                content: '\nlet x: Set<string>;// TODO: put some intro here\n',
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
};

let lastFileId: number = 10;

let curState: State;
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
    return tempState ? tempState : curState;
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
    await new Promise(r => setTimeout(r, 10));
    let state = getState();
    disposeEditorFile(state.files.find(file => file.id === id));
    let selected = state.files.find(file => file.id !== id)!.id;
    for (let file of state.files) {
        if (file.id === id) break;
        selected = file.id;
    }
    state = { ...state, selectedFileId: selected, files: state.files.filter(file => file.id !== id) };
    setState(state);
    restoreEditorFile();
    renameDone();
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

function renameUpdate(file: FileState, text: string)
{
    let state = getState();
    setState({ ...state, files: state.files.map(file => file.id !== state.selectedFileId ? file : {...file, name: text})});
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
                                <MenuItem text="JavaScript" icon="add" />
                                <MenuItem text="TypeScript" icon="add" />
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
                            <InputGroup onKeyUp={key => key.key === 'Enter' || key.key === 'Escape' ? renameDone() : null} inputClassName='file-name-input' style={{width: `calc(25px + ${file.name.length}ch)`}} large={true} autoFocus={true} value={file.name} onValueChange={text => renameUpdate(file, text)} onBlur={() => renameDone()}/>
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


window.onload = () => {
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
    mainPanel.appendChild(panel);
    ReactDOM.render(<App />, document.getElementById('reactRoot'));
    restoreEditorFile();
};
