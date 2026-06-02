import * as patchrs from "../util/patchrs_napi";
import { safeCapture } from "./reflect2d";

export class UIRenderTextureCache {
	cache = new Map<patchrs.TextureSnapshot, HTMLCanvasElement>();

	getTexture(snap: patchrs.TextureSnapshot) {
		let cnv = this.cache.get(snap);
		if (!cnv) {
			// try to find a parent snapshot to update from
			for (let [oldsnap, oldcnv] of this.cache) {
				if (snap.isChild(oldsnap)) {
					cnv = oldcnv;
					let ctx = cnv.getContext("2d")!;
					let changesize = 0;
					for (let edit of snap.changesSince(oldsnap)) {
						let imgdata = safeCapture(snap, edit.x, edit.y, edit.width, edit.height);
						if (!imgdata) continue;
						ctx.putImageData(imgdata, edit.x, edit.y);
						changesize += edit.width * edit.height;
					}
					this.cache.delete(oldsnap);
					this.cache.set(snap, cnv);
					break;
				}
			}
		}
		if (!cnv) {
			// original capture
			cnv = document.createElement("canvas");
			cnv.width = snap.width;
			cnv.height = snap.height;
			let ctx = cnv.getContext("2d")!;
			let img = safeCapture(snap, 0, 0, snap.width, snap.height);
			if (!img) { img = new ImageData(snap.width, snap.height); }
			ctx.putImageData(img, 0, 0);
			this.cache.set(snap, cnv);
		}
		return cnv;
	}
}