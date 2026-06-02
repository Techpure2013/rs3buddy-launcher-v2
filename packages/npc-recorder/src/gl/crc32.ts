// CRC-32 implementation - ported from RS3QuestBuddyBeta
// Based on https://blog.stalkr.net/2011/03/crc-32-forging.html

// Poly in "reversed" notation -- http://en.wikipedia.org/wiki/Cyclic_redundancy_check
const POLY = 0xedb88320; // CRC-32-IEEE 802.3

const crc32_table = new Uint32Array(256);

function build_crc_tables() {
	for (let i = 0; i < 256; i++) {
		let fwd = i;
		for (let j = 8; j > 0; j--) {
			if ((fwd & 1) == 1) {
				fwd = (fwd >>> 1) ^ POLY;
			} else {
				fwd >>>= 1;
			}
		}
		crc32_table[i] = fwd & 0xffffffff;
	}
}
build_crc_tables();

export function crc32(buf: Uint8Array | Uint8ClampedArray, crc = 0, rangeStart = 0, rangeEnd = buf.length) {
	crc = crc ^ 0xffffffff;
	for (let i = rangeStart; i < rangeEnd; i++) {
		crc = (crc >>> 8) ^ crc32_table[(crc ^ buf[i]) & 0xff];
	}
	return (crc ^ 0xffffffff) >>> 0;
}

export class CrcBuilder {
	crc: number;
	constructor(initcrc = 0) {
		this.crc = initcrc ^ 0xffffffff;
	}
	addbyte(byte: number) {
		this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ (byte & 0xff)) & 0xff];
	}
	addUint16(u16: number) {
		this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ (u16 & 0xff)) & 0xff];
		this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 16) & 0xff)) & 0xff];
	}
	addUint32(u16: number) {
		this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 0) & 0xff)) & 0xff];
		this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 16) & 0xff)) & 0xff];
		this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 24) & 0xff)) & 0xff];
		this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 32) & 0xff)) & 0xff];
	}
	get() {
		return (this.crc ^ 0xffffffff) >>> 0;
	}
	fork() {
		return new CrcBuilder(this.get());
	}
}
