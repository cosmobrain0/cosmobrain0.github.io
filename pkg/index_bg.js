let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

    heap[idx] = obj;
    return idx;
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error('expected a boolean argument');
    }
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (typeof(arg) !== 'string') throw new Error('expected a string argument');

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);

            } else {
                state.a = a;
            }
        }
    };
    real.original = state;

    return real;
}

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error('expected a number argument');
}
function __wbg_adapter_26(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hbf0cfddc659d0341(arg0, arg1);
}

function __wbg_adapter_29(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h1633621c3a873ed1(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_32(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h632b915da9505506(arg0, arg1, addHeapObject(arg2));
}

/**
*/
export function start() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.start(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

export function __wbindgen_number_new(arg0) {
    const ret = arg0;
    return addHeapObject(ret);
};

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

export function __wbindgen_cb_drop(arg0) {
    const obj = takeObject(arg0).original;
    if (obj.cnt-- == 1) {
        obj.a = 0;
        return true;
    }
    const ret = false;
    _assertBoolean(ret);
    return ret;
};

export function __wbg_crypto_70a96de3b6b73dac() { return logError(function (arg0) {
    const ret = getObject(arg0).crypto;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_msCrypto_adbc770ec9eca9c7() { return logError(function (arg0) {
    const ret = getObject(arg0).msCrypto;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_getRandomValues_3774744e221a22ad() { return handleError(function (arg0, arg1) {
    getObject(arg0).getRandomValues(getObject(arg1));
}, arguments) };

export function __wbg_randomFillSync_e950366c42764a07() { return handleError(function (arg0, arg1) {
    getObject(arg0).randomFillSync(takeObject(arg1));
}, arguments) };

export function __wbg_require_f05d779769764e82() { return handleError(function () {
    const ret = module.require;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_process_dd1577445152112e() { return logError(function (arg0) {
    const ret = getObject(arg0).process;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_versions_58036bec3add9e6f() { return logError(function (arg0) {
    const ret = getObject(arg0).versions;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_node_6a9d28205ed5b0d8() { return logError(function (arg0) {
    const ret = getObject(arg0).node;
    return addHeapObject(ret);
}, arguments) };

export function __wbindgen_is_object(arg0) {
    const val = getObject(arg0);
    const ret = typeof(val) === 'object' && val !== null;
    _assertBoolean(ret);
    return ret;
};

export function __wbindgen_is_string(arg0) {
    const ret = typeof(getObject(arg0)) === 'string';
    _assertBoolean(ret);
    return ret;
};

export function __wbg_instanceof_Window_e266f02eee43b570() { return logError(function (arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Window;
    } catch {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments) };

export function __wbg_document_950215a728589a2d() { return logError(function (arg0) {
    const ret = getObject(arg0).document;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_requestAnimationFrame_afe426b568f84138() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).requestAnimationFrame(getObject(arg1));
    _assertNum(ret);
    return ret;
}, arguments) };

export function __wbg_body_be46234bb33edd63() { return logError(function (arg0) {
    const ret = getObject(arg0).body;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_getElementById_eb93a47327bb5585() { return logError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getElementById(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_instanceof_HtmlCanvasElement_f5f69dab93281ebe() { return logError(function (arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof HTMLCanvasElement;
    } catch {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments) };

export function __wbg_setwidth_81c62bc806e0a727() { return logError(function (arg0, arg1) {
    getObject(arg0).width = arg1 >>> 0;
}, arguments) };

export function __wbg_setheight_98cf0db22c40ef07() { return logError(function (arg0, arg1) {
    getObject(arg0).height = arg1 >>> 0;
}, arguments) };

export function __wbg_getContext_3ae404b649cf9287() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_addEventListener_615d4590d38da1c9() { return handleError(function (arg0, arg1, arg2, arg3) {
    getObject(arg0).addEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3));
}, arguments) };

export function __wbg_log_7bb108d119bafbc1() { return logError(function (arg0) {
    console.log(getObject(arg0));
}, arguments) };

export function __wbg_log_d047cf0648d2678e() { return logError(function (arg0, arg1) {
    console.log(getObject(arg0), getObject(arg1));
}, arguments) };

export function __wbg_instanceof_CanvasRenderingContext2d_3e95629461ed9f67() { return logError(function (arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof CanvasRenderingContext2D;
    } catch {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments) };

export function __wbg_setstrokeStyle_073fc10b086c1727() { return logError(function (arg0, arg1) {
    getObject(arg0).strokeStyle = getObject(arg1);
}, arguments) };

export function __wbg_setfillStyle_b065cfad34a78974() { return logError(function (arg0, arg1) {
    getObject(arg0).fillStyle = getObject(arg1);
}, arguments) };

export function __wbg_setlineWidth_2b5a5da5c4bf4084() { return logError(function (arg0, arg1) {
    getObject(arg0).lineWidth = arg1;
}, arguments) };

export function __wbg_beginPath_0948db80d0d23ce3() { return logError(function (arg0) {
    getObject(arg0).beginPath();
}, arguments) };

export function __wbg_fill_ae4121c3dafa1f99() { return logError(function (arg0) {
    getObject(arg0).fill();
}, arguments) };

export function __wbg_stroke_6e1b85c72caa53ea() { return logError(function (arg0) {
    getObject(arg0).stroke();
}, arguments) };

export function __wbg_arc_37174ad97fea93a9() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).arc(arg1, arg2, arg3, arg4, arg5);
}, arguments) };

export function __wbg_lineTo_b902f35217ff96ab() { return logError(function (arg0, arg1, arg2) {
    getObject(arg0).lineTo(arg1, arg2);
}, arguments) };

export function __wbg_moveTo_b0d9695c44d309f0() { return logError(function (arg0, arg1, arg2) {
    getObject(arg0).moveTo(arg1, arg2);
}, arguments) };

export function __wbg_clearRect_92c5351269c74162() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).clearRect(arg1, arg2, arg3, arg4);
}, arguments) };

export function __wbg_fillRect_f63ba845233f000a() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).fillRect(arg1, arg2, arg3, arg4);
}, arguments) };

export function __wbg_offsetX_413d9f02022e72ad() { return logError(function (arg0) {
    const ret = getObject(arg0).offsetX;
    _assertNum(ret);
    return ret;
}, arguments) };

export function __wbg_offsetY_488f80a0a9666028() { return logError(function (arg0) {
    const ret = getObject(arg0).offsetY;
    _assertNum(ret);
    return ret;
}, arguments) };

export function __wbg_key_f0decac219aa904b() { return logError(function (arg0, arg1) {
    const ret = getObject(arg1).key;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_newnoargs_2b8b6bd7753c76ba() { return logError(function (arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_call_95d1ea488d03e4e8() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_call_9495de66fdbe016b() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_globalThis_87cbb8506fecf3a9() { return handleError(function () {
    const ret = globalThis.globalThis;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_self_e7c1f827057f6584() { return handleError(function () {
    const ret = self.self;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_window_a09ec664e14b1b81() { return handleError(function () {
    const ret = window.window;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_global_c85a9259e621f3db() { return handleError(function () {
    const ret = global.global;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_new_537b7341ce90bb31() { return logError(function (arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_newwithlength_b56c882b57805732() { return logError(function (arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return addHeapObject(ret);
}, arguments) };

export function __wbg_newwithbyteoffsetandlength_9fb2f11355ecadf5() { return logError(function (arg0, arg1, arg2) {
    const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
}, arguments) };

export function __wbg_subarray_7526649b91a252a6() { return logError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
}, arguments) };

export function __wbg_set_17499e8aa4003ebd() { return logError(function (arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2 >>> 0);
}, arguments) };

export function __wbindgen_is_function(arg0) {
    const ret = typeof(getObject(arg0)) === 'function';
    _assertBoolean(ret);
    return ret;
};

export function __wbindgen_is_undefined(arg0) {
    const ret = getObject(arg0) === undefined;
    _assertBoolean(ret);
    return ret;
};

export function __wbindgen_object_clone_ref(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

export function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
};

export function __wbg_buffer_cf65c07de34b9a08() { return logError(function (arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_error_f851667af71bcfc6() { return logError(function (arg0, arg1) {
    try {
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
}, arguments) };

export function __wbg_new_abda76e883ba8a5f() { return logError(function () {
    const ret = new Error();
    return addHeapObject(ret);
}, arguments) };

export function __wbg_stack_658279fe44541cf6() { return logError(function (arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbindgen_debug_string(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

export function __wbindgen_memory() {
    const ret = wasm.memory;
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper254() { return logError(function (arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 56, __wbg_adapter_26);
    return addHeapObject(ret);
}, arguments) };

export function __wbindgen_closure_wrapper256() { return logError(function (arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 58, __wbg_adapter_29);
    return addHeapObject(ret);
}, arguments) };

export function __wbindgen_closure_wrapper258() { return logError(function (arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 60, __wbg_adapter_32);
    return addHeapObject(ret);
}, arguments) };

