
import cre from "./con-reg-exp.mjs";

const creModulePath = (new URL('./con-reg-exp.mjs', import.meta.url)).href;
const consoleModulePath = (new URL('./console-stub.mjs', import.meta.url)).href;

async function runCommand(code) {
    try {
        code = code.replace(cre`
            group {
                "from";
                repeat whitespace;
                ['"];
            }
            "con-reg-exp";
            group ['"];
        `, `$1${creModulePath}$2`);
        code = `import { console } from "${consoleModulePath}";postMessage({ type: 'running' });` + code;
        let buffer = new TextEncoder().encode(code);
        let dataURL = await new Promise(r => {
            const reader = new FileReader();
            reader.onload = () => r(reader.result);
            reader.readAsDataURL(new File([buffer], 'script.mjs', { type: 'text/javascript;charset=utf-8' }));
        });
        await import(dataURL);
        postMessage({ type: 'done' });
    } catch (error) {
        postMessage({ type: 'done', error });
    }
}

addEventListener("message", (event) => {
    let data = event.data;
    if (data.type === 'run') {
        runCommand(data.code);
    }
});
