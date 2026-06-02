/**
 * Render stream using recordRenderCalls in a tight async loop.
 * This matches the old 100%-accurate approach: every frame gets REAL TextureSnapshots
 * with capture() support, so sprite hashes match the cache and font characters are
 * identified immediately. No calibration needed.
 *
 * At 1080p: UI renders directly to framebuffer 0
 * At 4K: UI renders to a separate framebuffer that gets scaled and copied to screen
 */
import { getProgramMeta } from "../render/renderprogram";
import * as patchrs from "./patchrs_napi";

export interface RenderStreamOptions {
  /** Minimum ms between captures (default: none — runs at game render rate) */
  framecooldown?: number;
  /** Features to capture */
  features?: patchrs.RecordRenderFeatures[];
}

export interface RenderStreamObject {
  ended: Promise<void>;
  close: () => Promise<void>;
}

export function renderStream(
  glapi: patchrs.Alt1GlClient,
  cb: (state: patchrs.RenderInvocation[]) => void,
  options: RenderStreamOptions = {}
): RenderStreamObject {
  const features = options.features ?? ["vertexarray", "uniforms", "texturesnapshot"];

  let closed = false;
  let scalingtexture = 0;

  const opts: patchrs.RecordRenderOptions = {
    framebufferId: 0,
    maxframes: 1,
    features,
  };

  const res: RenderStreamObject = {
    ended: (async () => {
      while (!closed) {
        try {
          // Capture from main framebuffer
          const mainrenders = glapi.recordRenderCalls(opts);
          // If 4K UI scaler detected, also capture from UI framebuffer
          const uirenders = scalingtexture === 0
            ? Promise.resolve([])
            : glapi.recordRenderCalls({
                ...opts,
                framebufferId: undefined,
                framebufferTexture: scalingtexture,
              });

          const renders = (await Promise.all([mainrenders, uirenders])).flat();

          // Detect UI scaler for 4K mode
          for (const render of renders) {
            const prog = getProgramMeta(render.program);
            if (prog.isUiScaler) {
              const samplers = Object.values(render.samplers);
              if (samplers.length > 0) {
                scalingtexture = samplers[0].texid;
              }
            }
          }

          if (!closed) {
            cb(renders);
          }
        } catch {
          // recordRenderCalls can fail occasionally — skip frame, continue loop
          if (!closed) {
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }
    })(),
    close: async () => {
      closed = true;
    },
  };

  return res;
}
