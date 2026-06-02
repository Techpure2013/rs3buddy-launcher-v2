/**
 * Vertex attribute type utilities
 * Based on RS3QuestBuddyGL implementation
 */

export type vartypeNames = "f32" | "i8" | "i16" | "u8" | "u16" | "i32" | "u32" | "f64" | "f16";
export type vartypeEnum = 0x1400 | 0x1401 | 0x1402 | 0x1403 | 0x1404 | 0x1405 | 0x1406 | 0x140a | 0x140b;

export type vartypeMeta = {
    id: vartypeEnum,
    readfn: keyof DataView,
    writefn: string,
    size: number,
    typeid: vartypeNames,
    constr: { new(buf: ArrayBufferLike, byteoffset?: number, length?: number): ArrayBufferView } | null,
    webgl: boolean
};

export const vartypes: { [type in vartypeEnum]: vartypeMeta } = {
    0x1400: { id: 0x1400, readfn: "getInt8", writefn: "setInt8", typeid: "i8", size: 1, constr: Int8Array, webgl: true },
    0x1401: { id: 0x1401, readfn: "getUint8", writefn: "setUint8", typeid: "u8", size: 1, constr: Uint8Array, webgl: true },
    0x1402: { id: 0x1402, readfn: "getInt16", writefn: "setInt16", typeid: "i16", size: 2, constr: Int16Array, webgl: true },
    0x1403: { id: 0x1403, readfn: "getUint16", writefn: "setUint16", typeid: "u16", size: 2, constr: Uint16Array, webgl: true },
    0x1404: { id: 0x1404, readfn: "getInt32", writefn: "setInt32", typeid: "i32", size: 4, constr: Int32Array, webgl: false },
    0x1405: { id: 0x1405, readfn: "getUint32", writefn: "setUint32", typeid: "u32", size: 4, constr: Uint32Array, webgl: false },
    0x1406: { id: 0x1406, readfn: "getFloat32", writefn: "setFloat32", typeid: "f32", size: 4, constr: Float32Array, webgl: true },
    0x140a: { id: 0x140a, readfn: "getFloat64", writefn: "setFloat64", typeid: "f64", size: 8, constr: Float64Array, webgl: false },
    0x140b: { id: 0x140b, readfn: "getFloat16" as keyof DataView, writefn: "setFloat16", typeid: "f16", size: 2, constr: null, webgl: false },
};
