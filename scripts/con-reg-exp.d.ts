/*!
 * Copyright 2024 Dominik Kilian
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the “Software”), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions
 * of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
*/
/**
 * The class extends the native JavaScript `Error` class to provide
 * error handling specifically for syntax and logic errors in the Convenient Regular Expressions.
 */
declare class CREError extends Error {
}
/**
 * The function is a tagged template literal function that produces RegExp object from
 * the Convenient Regular Expression.
 */
declare function cre(str: TemplateStringsArray, ...values: any[]): RegExp;
declare namespace cre {
    export var indices: typeof import("./con-reg-exp").default;
    export var global: typeof import("./con-reg-exp").default;
    export var ignoreCase: typeof import("./con-reg-exp").default;
    export var legacy: typeof import("./con-reg-exp").default;
    export var unicode: typeof import("./con-reg-exp").default;
    export var sticky: typeof import("./con-reg-exp").default;
    export var cache: typeof import("./con-reg-exp").default;
    export var Error: typeof CREError;
    var _a: typeof import("./con-reg-exp").default;
    export var cre: typeof import("./con-reg-exp").default;
    export { _a as default };
}
export default cre;
export { cre };
