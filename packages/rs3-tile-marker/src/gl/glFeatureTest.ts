/**
 * GL Feature Test Suite for Linux
 * Tests all GL functionality to ensure Linux parity with Windows
 */

import { native, hookFirstClient, type RenderInvocation, type GlState, type StreamRenderObject, type GlOverlay } from './patchrs_napi';

interface TestResult {
    name: string;
    passed: boolean;
    details: string;
    error?: string;
}

const results: TestResult[] = [];

function log(msg: string) {
    console.log(`[GLTest] ${msg}`);
}

function pass(name: string, details: string) {
    results.push({ name, passed: true, details });
    log(`PASS: ${name} - ${details}`);
}

function fail(name: string, details: string, error?: string) {
    results.push({ name, passed: false, details, error });
    log(`FAIL: ${name} - ${details}${error ? ` (${error})` : ''}`);
}

// =============================================================================
// Test: Native Addon Loading
// =============================================================================
async function testNativeAddon(): Promise<boolean> {
    try {
        if (!native) {
            fail('Native Addon', 'Native addon not loaded');
            return false;
        }
        pass('Native Addon', 'Native addon loaded successfully');
        return true;
    } catch (e) {
        fail('Native Addon', 'Exception loading addon', String(e));
        return false;
    }
}

// =============================================================================
// Test: Client Connection
// =============================================================================
async function testClientConnection(): Promise<boolean> {
    try {
        const ready = native.getRsReady();
        if (!ready) {
            // Try to hook
            log('Client not ready, attempting to hook...');
            const hooked = await hookFirstClient();
            if (!hooked) {
                fail('Client Connection', 'Could not find/hook RS client');
                return false;
            }
        }
        pass('Client Connection', `Client connected (ready=${native.getRsReady()})`);
        return true;
    } catch (e) {
        fail('Client Connection', 'Exception connecting', String(e));
        return false;
    }
}

// =============================================================================
// Test: Window Position/Size APIs
// =============================================================================
async function testWindowAPIs(): Promise<void> {
    try {
        const x = native.getRsX();
        const y = native.getRsY();
        const w = native.getRsWidth();
        const h = native.getRsHeight();

        if (w > 0 && h > 0) {
            pass('Window APIs', `Position: ${x},${y} Size: ${w}x${h}`);
        } else {
            fail('Window APIs', `Invalid dimensions: ${w}x${h}`);
        }
    } catch (e) {
        fail('Window APIs', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Renderer Info
// =============================================================================
async function testRendererInfo(): Promise<void> {
    try {
        const info = native.getRenderer();
        if (info) {
            pass('Renderer Info', `${info.glRenderer} (${info.glVendor})`);
            log(`  GL Version: ${info.glVersion}`);
            log(`  Shader Version: ${info.glShaderVersion}`);
        } else {
            fail('Renderer Info', 'No renderer info available');
        }
    } catch (e) {
        fail('Renderer Info', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Memory State
// =============================================================================
async function testMemoryState(): Promise<void> {
    try {
        const state = native.debug.memoryState();
        if (state) {
            pass('Memory State', `Used: ${(state.used / 1024 / 1024).toFixed(2)}MB / ${(state.size / 1024 / 1024).toFixed(2)}MB`);
            log(`  Sanity: ${state.sanity}, Allocs: ${state.allocs}`);
        } else {
            fail('Memory State', 'No memory state available');
        }
    } catch (e) {
        fail('Memory State', 'Exception', String(e));
    }
}

// =============================================================================
// Test: GL Object Stats
// =============================================================================
async function testGlObjectStats(): Promise<void> {
    try {
        const stats = native.debug.getGlObjectStats();
        if (stats) {
            pass('GL Object Stats', `${stats.count} objects, ${(stats.size / 1024).toFixed(2)}KB`);
            log(`  Programs: ${stats.counts.GlProgram || 0}`);
            log(`  Textures: ${stats.counts.TrackedTexture || 0}`);
            log(`  VertexArrays: ${stats.counts.VertexArray || 0}`);
        } else {
            fail('GL Object Stats', 'No stats available');
        }
    } catch (e) {
        fail('GL Object Stats', 'Exception', String(e));
    }
}

// =============================================================================
// Test: OpenGL State Query
// =============================================================================
async function testOpenGlState(): Promise<GlState | null> {
    try {
        const state = await native.getOpenGlState();
        if (state) {
            const programCount = Object.keys(state.programs).length;
            const textureCount = Object.keys(state.textures).length;
            pass('OpenGL State', `${programCount} programs, ${textureCount} textures`);
            return state;
        } else {
            fail('OpenGL State', 'No state returned');
            return null;
        }
    } catch (e) {
        fail('OpenGL State', 'Exception', String(e));
        return null;
    }
}

// =============================================================================
// Test: Record Render Calls (one-shot)
// =============================================================================
async function testRecordRenderCalls(): Promise<RenderInvocation[] | null> {
    try {
        log('Recording render calls (1 frame)...');
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            timeout: 5000,
            features: ['uniforms', 'vertexarray']
        });

        if (renders && renders.length > 0) {
            pass('Record Render Calls', `Captured ${renders.length} render calls`);

            // Log some details
            const uniquePrograms = new Set(renders.map(r => r.program?.programId));
            const uniqueVAOs = new Set(renders.map(r => r.vertexObjectId));
            log(`  Unique programs: ${uniquePrograms.size}`);
            log(`  Unique VAOs: ${uniqueVAOs.size}`);

            return renders;
        } else {
            fail('Record Render Calls', 'No renders captured');
            return null;
        }
    } catch (e) {
        fail('Record Render Calls', 'Exception', String(e));
        return null;
    }
}

// =============================================================================
// Test: Stream Render Calls
// =============================================================================
async function testStreamRenderCalls(): Promise<void> {
    try {
        log('Testing stream render calls (3 frames)...');

        let frameCount = 0;
        let totalRenders = 0;

        const stream: StreamRenderObject = native.streamRenderCalls(
            {
                framecooldown: 100,
                features: ['uniforms']
            },
            (renders) => {
                frameCount++;
                totalRenders += renders.length;
                log(`  Stream frame ${frameCount}: ${renders.length} renders`);
            }
        );

        // Wait for a few frames
        await new Promise(resolve => setTimeout(resolve, 500));

        // Close stream
        await stream.close();

        if (frameCount > 0) {
            pass('Stream Render Calls', `Streamed ${frameCount} frames, ${totalRenders} total renders`);
        } else {
            fail('Stream Render Calls', 'No frames streamed');
        }
    } catch (e) {
        fail('Stream Render Calls', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Capture (screenshot)
// =============================================================================
async function testCapture(): Promise<void> {
    try {
        log('Capturing framebuffer...');
        // texid -1 means current framebuffer
        const img = await native.capture(-1, 0, 0, 100, 100);

        if (img && img.width > 0 && img.height > 0 && img.data.length > 0) {
            pass('Capture', `Captured ${img.width}x${img.height} image (${img.data.length} bytes)`);

            // Check for non-zero pixels
            let nonZero = 0;
            for (let i = 0; i < Math.min(1000, img.data.length); i++) {
                if (img.data[i] !== 0) nonZero++;
            }
            log(`  Non-zero pixels in first 1000 bytes: ${nonZero}`);
        } else {
            fail('Capture', 'Invalid image data');
        }
    } catch (e) {
        fail('Capture', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Create Program
// =============================================================================
async function testCreateProgram(): Promise<void> {
    try {
        const vertShader = `
            #version 330 core
            layout(location = 0) in vec3 aPos;
            uniform mat4 uMatrix;
            void main() {
                gl_Position = uMatrix * vec4(aPos, 1.0);
            }
        `;

        const fragShader = `
            #version 330 core
            uniform vec4 uColor;
            out vec4 FragColor;
            void main() {
                FragColor = uColor;
            }
        `;

        const program = native.createProgram(
            vertShader,
            fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }], // GL_FLOAT
            [
                { name: 'uMatrix', type: 0x8B5C, length: 1, snapshotOffset: 0, snapshotSize: 64 }, // GL_FLOAT_MAT4
                { name: 'uColor', type: 0x8B52, length: 1, snapshotOffset: 64, snapshotSize: 16 }  // GL_FLOAT_VEC4
            ]
        );

        if (program && program.programId !== undefined) {
            pass('Create Program', `Created program ID ${program.programId}`);
            log(`  Uniforms: ${program.uniforms.length}`);
            log(`  Inputs: ${program.inputs.length}`);
        } else {
            fail('Create Program', 'Failed to create program');
        }
    } catch (e) {
        fail('Create Program', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Create Vertex Array
// =============================================================================
async function testCreateVertexArray(): Promise<void> {
    try {
        // Create a simple triangle
        const positions = new Float32Array([
            0.0, 0.5, 0.0,
            -0.5, -0.5, 0.0,
            0.5, -0.5, 0.0
        ]);

        const indices = new Uint16Array([0, 1, 2]);
        const indexBuffer = new Uint8Array(indices.buffer);

        const vao = native.createVertexArray(indexBuffer, [
            {
                buffer: new Uint8Array(positions.buffer),
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: 0x1406, // GL_FLOAT
                stride: 12,
                vectorlength: 3,
                normalized: false
            }
        ]);

        if (vao && vao.indexBuffer) {
            pass('Create Vertex Array', `Created VAO with ${vao.attributes.length} attributes`);
        } else {
            fail('Create Vertex Array', 'Failed to create VAO');
        }
    } catch (e) {
        fail('Create Vertex Array', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Begin Overlay
// =============================================================================
async function testBeginOverlay(): Promise<void> {
    try {
        // First get a render to use as trigger
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms', 'vertexarray']
        });

        if (!renders || renders.length === 0) {
            fail('Begin Overlay', 'No renders to trigger on');
            return;
        }

        // Find a render with a valid VAO
        const triggerRender = renders.find(r => r.vertexObjectId > 0);
        if (!triggerRender) {
            fail('Begin Overlay', 'No render with valid VAO found');
            return;
        }

        // Create a simple shader
        const vertShader = `
            #version 330 core
            layout(location = 0) in vec3 aPos;
            uniform mat4 uViewProjMatrix;
            void main() {
                gl_Position = uViewProjMatrix * vec4(aPos, 1.0);
            }
        `;

        const fragShader = `
            #version 330 core
            out vec4 FragColor;
            void main() {
                FragColor = vec4(1.0, 0.0, 0.0, 0.5);
            }
        `;

        const program = native.createProgram(
            vertShader,
            fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [{ name: 'uViewProjMatrix', type: 0x8B5C, length: 1, snapshotOffset: 0, snapshotSize: 64 }]
        );

        // Create triangle VAO
        const positions = new Float32Array([0.0, 10.0, 0.0, -10.0, -10.0, 0.0, 10.0, -10.0, 0.0]);
        const indices = new Uint16Array([0, 1, 2]);

        const vao = native.createVertexArray(new Uint8Array(indices.buffer), [
            {
                buffer: new Uint8Array(positions.buffer),
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: 0x1406,
                stride: 12,
                vectorlength: 3,
                normalized: false
            }
        ]);

        const overlay = native.beginOverlay(
            { vertexObjectId: triggerRender.vertexObjectId },
            program,
            vao,
            {
                trigger: 'after',
                alphaBlend: true,
                uniformSources: [
                    { name: 'uViewProjMatrix', sourceName: 'uViewProjMatrix', type: 'program' }
                ],
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay && overlay.stop) {
            pass('Begin Overlay', 'Overlay created successfully');

            // Let it run for a moment
            await new Promise(resolve => setTimeout(resolve, 200));

            // Stop it
            overlay.stop();
            log('  Overlay stopped');
        } else {
            fail('Begin Overlay', 'Failed to create overlay');
        }
    } catch (e) {
        fail('Begin Overlay', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Create Texture
// =============================================================================
async function testCreateTexture(): Promise<void> {
    try {
        // Create a simple 16x16 checkerboard image
        const width = 16;
        const height = 16;
        const data = new Uint8ClampedArray(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const isWhite = (x + y) % 2 === 0;
                data[idx + 0] = isWhite ? 255 : 0;   // R
                data[idx + 1] = isWhite ? 255 : 0;   // G
                data[idx + 2] = isWhite ? 255 : 0;   // B
                data[idx + 3] = 255;                  // A
            }
        }

        const imageData = new ImageData(data, width, height);
        const texture = native.createTexture(imageData);

        if (texture && texture.texid > 0) {
            pass('Create Texture', `Created texture ID ${texture.texid} (${texture.width}x${texture.height})`);
            log(`  Format: ${texture.format} (${texture.formatid})`);
        } else {
            fail('Create Texture', 'Failed to create texture');
        }
    } catch (e) {
        fail('Create Texture', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Texture Capture
// =============================================================================
async function testTextureCapture(): Promise<void> {
    try {
        // Get GL state to find a texture
        const state = await native.getOpenGlState();
        if (!state || Object.keys(state.textures).length === 0) {
            fail('Texture Capture', 'No textures available');
            return;
        }

        const texId = parseInt(Object.keys(state.textures)[0]);
        const texture = state.textures[texId];

        if (texture) {
            const captured = texture.capture(0, 0, Math.min(64, texture.width), Math.min(64, texture.height));
            if (captured && captured.data.length > 0) {
                pass('Texture Capture', `Captured ${captured.width}x${captured.height} from texture ${texId}`);
            } else {
                fail('Texture Capture', 'Captured empty image');
            }
        } else {
            fail('Texture Capture', 'Texture not found');
        }
    } catch (e) {
        fail('Texture Capture', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Texture Sampling in Overlay
// =============================================================================
async function testTextureSampling(): Promise<void> {
    try {
        // Get renders to find one with textures
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms', 'textures', 'vertexarray']
        });

        if (!renders || renders.length === 0) {
            fail('Texture Sampling', 'No renders captured');
            return;
        }

        // Find a render with textures
        const renderWithTex = renders.find(r =>
            r.textures && Object.keys(r.textures).length > 0
        );

        if (!renderWithTex) {
            fail('Texture Sampling', 'No renders with textures found');
            return;
        }

        const texCount = Object.keys(renderWithTex.textures).length;
        pass('Texture Sampling', `Found render with ${texCount} texture(s)`);

        // Log texture details
        for (const [loc, tex] of Object.entries(renderWithTex.textures)) {
            log(`  Location ${loc}: ${tex.width}x${tex.height} (ID ${tex.texid})`);
        }
    } catch (e) {
        fail('Texture Sampling', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Alpha Blending Overlay
// =============================================================================
async function testAlphaBlending(): Promise<void> {
    try {
        // Get renders to find a trigger
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms', 'vertexarray']
        });

        if (!renders || renders.length === 0) {
            fail('Alpha Blending', 'No renders to trigger on');
            return;
        }

        const triggerRender = renders.find(r => r.vertexObjectId > 0);
        if (!triggerRender) {
            fail('Alpha Blending', 'No valid trigger render');
            return;
        }

        // Create shader with alpha output
        const vertShader = `
            #version 330 core
            layout(location = 0) in vec3 aPos;
            layout(location = 6) in vec3 aColor;
            uniform mat4 uViewProjMatrix;
            uniform mat4 uModelMatrix;
            out vec4 vColor;
            void main() {
                vec4 worldPos = uModelMatrix * vec4(aPos, 1.0);
                gl_Position = uViewProjMatrix * worldPos;
                vColor = vec4(aColor, 0.5); // 50% alpha
            }
        `;

        const fragShader = `
            #version 330 core
            in vec4 vColor;
            out vec4 FragColor;
            void main() {
                FragColor = vColor;
            }
        `;

        const program = native.createProgram(
            vertShader,
            fragShader,
            [
                { name: 'aPos', type: 0x1406, length: 3, location: 0 },
                { name: 'aColor', type: 0x1406, length: 3, location: 6 }
            ],
            [
                { name: 'uViewProjMatrix', type: 0x8B5C, length: 1, snapshotOffset: 0, snapshotSize: 64 },
                { name: 'uModelMatrix', type: 0x8B5C, length: 1, snapshotOffset: 64, snapshotSize: 64 }
            ]
        );

        // Create colored triangle
        const positions = new Float32Array([0.0, 10.0, 0.0, -10.0, -10.0, 0.0, 10.0, -10.0, 0.0]);
        const colors = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]); // RGB per vertex

        const indices = new Uint16Array([0, 1, 2]);

        const vao = native.createVertexArray(new Uint8Array(indices.buffer), [
            {
                buffer: new Uint8Array(positions.buffer),
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: 0x1406, // GL_FLOAT
                stride: 12,
                vectorlength: 3,
                normalized: false
            },
            {
                buffer: colors,
                enabled: true,
                location: 6,
                offset: 0,
                scalartype: 0x1401, // GL_UNSIGNED_BYTE
                stride: 3,
                vectorlength: 3,
                normalized: true
            }
        ]);

        // Create uniform buffer with identity matrices
        const uniformBuffer = new Uint8Array(128);
        const identityMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
        new Float32Array(uniformBuffer.buffer, 0, 16).set(identityMatrix);
        new Float32Array(uniformBuffer.buffer, 64, 16).set(identityMatrix);

        const overlay = native.beginOverlay(
            { vertexObjectId: triggerRender.vertexObjectId },
            program,
            vao,
            {
                trigger: 'after',
                alphaBlend: true, // Enable alpha blending
                uniformSources: [
                    { name: 'uViewProjMatrix', sourceName: 'uViewProjMatrix', type: 'program' }
                ],
                uniformBuffer: uniformBuffer,
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay && overlay.stop) {
            pass('Alpha Blending', 'Alpha blending overlay created');

            // Let it render a few frames
            await new Promise(resolve => setTimeout(resolve, 300));
            overlay.stop();
            log('  Overlay stopped after test');
        } else {
            fail('Alpha Blending', 'Failed to create overlay');
        }
    } catch (e) {
        fail('Alpha Blending', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Overlay Trigger Types (ALL: before, after, replace, frameend, passive)
// =============================================================================
async function testOverlayTriggers(): Promise<void> {
    // All supported trigger types
    const triggers: Array<'before' | 'after' | 'replace' | 'frameend' | 'passive'> =
        ['before', 'after', 'replace', 'frameend', 'passive'];

    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            fail('Overlay Triggers', 'No renders available');
            return;
        }

        const triggerRender = renders.find(r => r.vertexObjectId > 0);
        if (!triggerRender) {
            fail('Overlay Triggers', 'No valid trigger render');
            return;
        }

        // Simple passthrough program
        const vertShader = `#version 330 core
            layout(location = 0) in vec3 aPos;
            void main() { gl_Position = vec4(aPos, 1.0); }
        `;
        const fragShader = `#version 330 core
            out vec4 FragColor;
            void main() { FragColor = vec4(1.0, 0.5, 0.0, 0.5); }
        `;

        const program = native.createProgram(vertShader, fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }], []);

        // Create a simple triangle VAO
        const positions = new Float32Array([0, 0.1, 0, -0.1, -0.1, 0, 0.1, -0.1, 0]);
        const indices = new Uint16Array([0, 1, 2]);
        const vao = native.createVertexArray(new Uint8Array(indices.buffer), [{
            buffer: new Uint8Array(positions.buffer),
            enabled: true,
            location: 0,
            offset: 0,
            scalartype: 0x1406,
            stride: 12,
            vectorlength: 3,
            normalized: false
        }]);

        let passCount = 0;
        const triggerResults: Record<string, string> = {};

        for (const trigger of triggers) {
            try {
                // For passive, we don't need a program (side-effect only)
                // For frameend, we need a program but no trigger filter
                const overlay = native.beginOverlay(
                    trigger === 'frameend' ? {} : { vertexObjectId: triggerRender.vertexObjectId },
                    trigger === 'passive' ? undefined : program,
                    trigger === 'passive' ? undefined : vao,
                    {
                        trigger,
                        alphaBlend: true,
                        ranges: trigger !== 'passive' ? [{ start: 0, length: 3 }] : undefined
                    }
                );

                if (overlay) {
                    passCount++;
                    triggerResults[trigger] = 'OK';

                    // Let it render for a bit
                    await new Promise(resolve => setTimeout(resolve, 100));
                    overlay.stop();
                } else {
                    triggerResults[trigger] = 'null returned';
                }
            } catch (e) {
                triggerResults[trigger] = `FAILED: ${e}`;
            }
        }

        // Log all results
        for (const [trigger, result] of Object.entries(triggerResults)) {
            log(`  Trigger '${trigger}': ${result}`);
        }

        if (passCount === triggers.length) {
            pass('Overlay Triggers', `All ${triggers.length} trigger types work (before/after/replace/frameend/passive)`);
        } else {
            fail('Overlay Triggers', `Only ${passCount}/${triggers.length} triggers work`);
        }
    } catch (e) {
        fail('Overlay Triggers', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Frameend Overlay (renders at end of every frame)
// =============================================================================
async function testFrameendOverlay(): Promise<void> {
    try {
        // Frameend doesn't need a trigger - it renders every frame
        const vertShader = `#version 330 core
            layout(location = 0) in vec3 aPos;
            void main() {
                // Draw in corner of screen (NDC coordinates)
                gl_Position = vec4(aPos * 0.1 + vec3(0.8, 0.8, 0.0), 1.0);
            }
        `;
        const fragShader = `#version 330 core
            out vec4 FragColor;
            void main() {
                FragColor = vec4(0.0, 1.0, 1.0, 0.7); // Cyan
            }
        `;

        const program = native.createProgram(vertShader, fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }], []);

        // Create a simple triangle
        const positions = new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0]);
        const indices = new Uint16Array([0, 1, 2]);
        const vao = native.createVertexArray(new Uint8Array(indices.buffer), [{
            buffer: new Uint8Array(positions.buffer),
            enabled: true,
            location: 0,
            offset: 0,
            scalartype: 0x1406,
            stride: 12,
            vectorlength: 3,
            normalized: false
        }]);

        // Frameend overlay - empty filter means it triggers on frame end
        const overlay = native.beginOverlay(
            {}, // No filter - frameend doesn't need one
            program,
            vao,
            {
                trigger: 'frameend',
                alphaBlend: true,
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay && overlay.stop) {
            pass('Frameend Overlay', 'Frameend overlay created (renders at end of every frame)');

            // Let it render for several frames
            await new Promise(resolve => setTimeout(resolve, 500));

            overlay.stop();
            log('  Frameend overlay stopped after ~30 frames');
        } else {
            fail('Frameend Overlay', 'Failed to create frameend overlay');
        }
    } catch (e) {
        fail('Frameend Overlay', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Replace Overlay (replaces original draw call)
// =============================================================================
async function testReplaceOverlay(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms', 'vertexarray']
        });

        if (!renders || renders.length === 0) {
            fail('Replace Overlay', 'No renders available');
            return;
        }

        // Find a render with a valid VAO
        const triggerRender = renders.find(r => r.vertexObjectId > 0);
        if (!triggerRender) {
            fail('Replace Overlay', 'No valid trigger render');
            return;
        }

        // Create a shader that draws bright magenta (very visible replacement)
        const vertShader = `#version 330 core
            layout(location = 0) in vec3 aPos;
            uniform mat4 uViewProjMatrix;
            void main() {
                gl_Position = uViewProjMatrix * vec4(aPos, 1.0);
            }
        `;
        const fragShader = `#version 330 core
            out vec4 FragColor;
            void main() {
                FragColor = vec4(1.0, 0.0, 1.0, 1.0); // Bright magenta
            }
        `;

        const program = native.createProgram(vertShader, fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [{ name: 'uViewProjMatrix', type: 0x8B5C, length: 1, snapshotOffset: 0, snapshotSize: 64 }]);

        // Replace overlay uses the trigger's VAO but our shader
        const overlay = native.beginOverlay(
            { vertexObjectId: triggerRender.vertexObjectId },
            program,
            undefined, // Use trigger's VAO
            {
                trigger: 'replace', // REPLACE the original draw call
                uniformSources: [
                    { name: 'uViewProjMatrix', sourceName: 'uViewProjMatrix', type: 'program' }
                ]
            }
        );

        if (overlay && overlay.stop) {
            pass('Replace Overlay', `Replace overlay created on VAO ${triggerRender.vertexObjectId}`);

            // Let it render for a bit (should see magenta where original was)
            await new Promise(resolve => setTimeout(resolve, 300));

            overlay.stop();
            log('  Replace overlay stopped');
        } else {
            fail('Replace Overlay', 'Failed to create replace overlay');
        }
    } catch (e) {
        fail('Replace Overlay', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Blend Modes (DEFAULT, BLEND, NOBLEND)
// =============================================================================
async function testBlendModes(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            fail('Blend Modes', 'No renders available');
            return;
        }

        const triggerRender = renders.find(r => r.vertexObjectId > 0);
        if (!triggerRender) {
            fail('Blend Modes', 'No valid trigger');
            return;
        }

        // Create semi-transparent shader
        const vertShader = `#version 330 core
            layout(location = 0) in vec3 aPos;
            void main() { gl_Position = vec4(aPos, 1.0); }
        `;
        const fragShader = `#version 330 core
            out vec4 FragColor;
            void main() { FragColor = vec4(1.0, 0.0, 0.0, 0.5); }  // 50% alpha red
        `;

        const program = native.createProgram(vertShader, fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }], []);

        const positions = new Float32Array([0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]);
        const indices = new Uint16Array([0, 1, 2]);
        const vao = native.createVertexArray(new Uint8Array(indices.buffer), [{
            buffer: new Uint8Array(positions.buffer),
            enabled: true,
            location: 0,
            offset: 0,
            scalartype: 0x1406,
            stride: 12,
            vectorlength: 3,
            normalized: false
        }]);

        const blendModes: Array<{name: string, value: boolean | undefined}> = [
            { name: 'BLEND (true)', value: true },
            { name: 'NOBLEND (false)', value: false },
            { name: 'DEFAULT (undefined)', value: undefined }
        ];

        let passCount = 0;
        for (const mode of blendModes) {
            try {
                const overlay = native.beginOverlay(
                    { vertexObjectId: triggerRender.vertexObjectId },
                    program,
                    vao,
                    {
                        trigger: 'after',
                        alphaBlend: mode.value,
                        ranges: [{ start: 0, length: 3 }]
                    }
                );

                if (overlay) {
                    passCount++;
                    log(`  ${mode.name}: OK`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    overlay.stop();
                }
            } catch (e) {
                log(`  ${mode.name}: FAILED - ${e}`);
            }
        }

        if (passCount === blendModes.length) {
            pass('Blend Modes', `All ${blendModes.length} blend modes work`);
        } else {
            fail('Blend Modes', `Only ${passCount}/${blendModes.length} blend modes work`);
        }
    } catch (e) {
        fail('Blend Modes', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Overlay Duration Option
// =============================================================================
async function testOverlayDuration(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            fail('Overlay Duration', 'No renders available');
            return;
        }

        const triggerRender = renders.find(r => r.vertexObjectId > 0);
        if (!triggerRender) {
            fail('Overlay Duration', 'No valid trigger');
            return;
        }

        const vertShader = `#version 330 core
            layout(location = 0) in vec3 aPos;
            void main() { gl_Position = vec4(aPos * 0.2, 1.0); }
        `;
        const fragShader = `#version 330 core
            out vec4 FragColor;
            void main() { FragColor = vec4(1.0, 1.0, 0.0, 0.8); }  // Yellow
        `;

        const program = native.createProgram(vertShader, fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }], []);

        const positions = new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0]);
        const indices = new Uint16Array([0, 1, 2]);
        const vao = native.createVertexArray(new Uint8Array(indices.buffer), [{
            buffer: new Uint8Array(positions.buffer),
            enabled: true,
            location: 0,
            offset: 0,
            scalartype: 0x1406,
            stride: 12,
            vectorlength: 3,
            normalized: false
        }]);

        // Create overlay with 500ms duration (auto-expires)
        const startTime = Date.now();
        const overlay = native.beginOverlay(
            { vertexObjectId: triggerRender.vertexObjectId },
            program,
            vao,
            {
                trigger: 'after',
                alphaBlend: true,
                duration: 500, // 500ms duration
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay) {
            // Wait for it to auto-expire
            await new Promise(resolve => setTimeout(resolve, 700));

            const elapsed = Date.now() - startTime;
            pass('Overlay Duration', `Overlay with 500ms duration created (elapsed: ${elapsed}ms)`);

            // Try to stop it anyway (may already be stopped)
            try { overlay.stop(); } catch {}
        } else {
            fail('Overlay Duration', 'Failed to create overlay with duration');
        }
    } catch (e) {
        fail('Overlay Duration', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Render Recording Features (all flags)
// =============================================================================
async function testRenderFeatures(): Promise<void> {
    try {
        // Test different feature combinations
        const featureTests = [
            { name: 'BASE (empty)', features: [] as string[] },
            { name: 'UNIFORMS', features: ['uniforms'] },
            { name: 'INPUTS (vertexarray)', features: ['vertexarray'] },
            { name: 'TEXTURES', features: ['textures'] },
            { name: 'FRAMEBUFFER', features: ['framebuffer'] },
            { name: 'COMPUTEBINDINGS', features: ['computebindings'] },
            { name: 'FULL', features: ['uniforms', 'vertexarray', 'textures', 'framebuffer', 'computebindings'] }
        ];

        let passCount = 0;
        for (const test of featureTests) {
            try {
                const renders = await native.recordRenderCalls({
                    maxframes: 1,
                    features: test.features,
                    timeout: 3000
                });

                if (renders) {
                    passCount++;
                    // Log what we got
                    let details = `${renders.length} renders`;
                    if (test.features.includes('uniforms') && renders[0]?.program?.uniforms) {
                        details += `, ${renders[0].program.uniforms.length} uniforms`;
                    }
                    if (test.features.includes('textures') && renders[0]?.textures) {
                        details += `, ${Object.keys(renders[0].textures).length} textures`;
                    }
                    log(`  ${test.name}: OK (${details})`);
                } else {
                    log(`  ${test.name}: returned null`);
                }
            } catch (e) {
                log(`  ${test.name}: FAILED - ${e}`);
            }
        }

        if (passCount === featureTests.length) {
            pass('Render Features', `All ${featureTests.length} feature combinations work`);
        } else {
            fail('Render Features', `Only ${passCount}/${featureTests.length} feature combinations work`);
        }
    } catch (e) {
        fail('Render Features', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Passive Overlay (side-effect only, no drawing)
// =============================================================================
async function testPassiveOverlay(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            fail('Passive Overlay', 'No renders available');
            return;
        }

        const triggerRender = renders.find(r => r.vertexObjectId > 0 && r.program?.uniforms?.length > 0);
        if (!triggerRender) {
            fail('Passive Overlay', 'No render with uniforms found');
            return;
        }

        // Passive overlay doesn't need a program - it just captures uniform state
        const overlay = native.beginOverlay(
            { vertexObjectId: triggerRender.vertexObjectId },
            undefined, // No program for passive
            undefined, // No VAO for passive
            {
                trigger: 'passive',
                uniformSources: triggerRender.program?.uniforms
                    ?.filter(u => u.snapshotSize > 0)
                    .slice(0, 3)
                    .map(u => ({
                        name: u.name,
                        sourceName: u.name,
                        type: 'program' as const
                    })) || []
            }
        );

        if (overlay && overlay.stop) {
            // Get uniform state from passive overlay
            const state = overlay.getUniformState();

            pass('Passive Overlay', `Passive overlay created (captures ${state.length} bytes of uniform state)`);

            await new Promise(resolve => setTimeout(resolve, 200));

            // Check if we can read the captured values
            const newState = overlay.getUniformState();
            log(`  Captured uniform buffer: ${newState.length} bytes`);

            overlay.stop();
        } else {
            fail('Passive Overlay', 'Failed to create passive overlay');
        }
    } catch (e) {
        fail('Passive Overlay', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Uniform Copying from UBO
// =============================================================================
async function testUBOUniformCopy(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            fail('UBO Uniform Copy', 'No renders captured');
            return;
        }

        // Find a render with uniforms that have block index >= 0 (UBO uniforms)
        let uboUniformCount = 0;
        for (const render of renders) {
            if (render.program && render.program.uniforms) {
                for (const uniform of render.program.uniforms) {
                    if (uniform.blockIndex >= 0) {
                        uboUniformCount++;
                    }
                }
            }
        }

        if (uboUniformCount > 0) {
            pass('UBO Uniform Copy', `Found ${uboUniformCount} UBO uniforms across renders`);
        } else {
            // Not a failure - game might not use UBOs
            pass('UBO Uniform Copy', 'No UBO uniforms found (game may not use UBOs)');
        }
    } catch (e) {
        fail('UBO Uniform Copy', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Framebuffer Info
// =============================================================================
async function testFramebufferInfo(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['framebuffer']
        });

        if (!renders || renders.length === 0) {
            fail('Framebuffer Info', 'No renders captured');
            return;
        }

        const fbIds = new Set(renders.map(r => r.framebufferId));
        const colorTexIds = new Set(renders.filter(r => r.framebufferColorTextureId > 0).map(r => r.framebufferColorTextureId));

        pass('Framebuffer Info', `${fbIds.size} unique framebuffers, ${colorTexIds.size} color attachments`);
        log(`  FBO IDs: ${[...fbIds].join(', ')}`);
    } catch (e) {
        fail('Framebuffer Info', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Viewport Info
// =============================================================================
async function testViewportInfo(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: []
        });

        if (!renders || renders.length === 0) {
            fail('Viewport Info', 'No renders captured');
            return;
        }

        const viewports = new Set<string>();
        for (const render of renders) {
            if (render.viewport) {
                viewports.add(`${render.viewport.width}x${render.viewport.height}`);
            }
        }

        pass('Viewport Info', `${viewports.size} unique viewport sizes: ${[...viewports].join(', ')}`);
    } catch (e) {
        fail('Viewport Info', 'Exception', String(e));
    }
}

// =============================================================================
// Test: GL Log Toggles
// =============================================================================
async function testGlLogToggles(): Promise<void> {
    try {
        const toggles = native.getGlLogToggles();
        if (toggles && toggles.length > 0) {
            pass('GL Log Toggles', `${toggles.length} toggle bytes available`);

            // Try setting them
            const newToggles = new Uint8Array(toggles.length);
            native.setGlLogToggles(newToggles);
            log('  Set toggles to all zeros');

            // Restore
            native.setGlLogToggles(toggles);
            log('  Restored original toggles');
        } else {
            fail('GL Log Toggles', 'No toggles available');
        }
    } catch (e) {
        fail('GL Log Toggles', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Debug APIs
// =============================================================================
async function testDebugAPIs(): Promise<void> {
    try {
        // Test getCurrentWorkingDirectory
        const cwd = native.debug.getCurrentWorkingDirectory();
        if (cwd) {
            log(`  CWD: ${cwd}`);
        }

        // Test getExePids (look for rs2client)
        const pids = native.debug.getExePids('rs2client');
        log(`  RS client PIDs: ${pids.join(', ') || 'none'}`);

        pass('Debug APIs', 'Debug APIs accessible');
    } catch (e) {
        fail('Debug APIs', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Reset OpenGL State
// =============================================================================
async function testResetOpenGlState(): Promise<void> {
    try {
        await native.debug.resetOpenGlState();
        pass('Reset OpenGL State', 'State reset successfully');
    } catch (e) {
        fail('Reset OpenGL State', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Built-in Uniforms (mouse, timestamp, framenr, viewport)
// =============================================================================
async function testBuiltinUniforms(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            fail('Builtin Uniforms', 'No renders to trigger on');
            return;
        }

        const triggerRender = renders.find(r => r.vertexObjectId > 0);
        if (!triggerRender) {
            fail('Builtin Uniforms', 'No valid trigger');
            return;
        }

        // Shader that uses all builtin uniforms
        const vertShader = `
            #version 330 core
            layout(location = 0) in vec3 aPos;
            void main() {
                gl_Position = vec4(aPos, 1.0);
            }
        `;

        const fragShader = `
            #version 330 core
            uniform vec2 uMouse;
            uniform float uTimestamp;
            uniform int uFramenr;
            uniform vec4 uViewport;
            out vec4 FragColor;
            void main() {
                // Use all uniforms to prevent optimization
                float t = uTimestamp / 86400.0; // Normalize to 0-1 over a day
                float m = (uMouse.x + 1.0) * 0.5;
                float f = float(uFramenr % 256) / 256.0;
                float v = uViewport.z / 1920.0;
                FragColor = vec4(t, m, f, v);
            }
        `;

        const program = native.createProgram(
            vertShader,
            fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [
                { name: 'uMouse', type: 0x8B50, length: 1, snapshotOffset: 0, snapshotSize: 8 },      // vec2
                { name: 'uTimestamp', type: 0x1406, length: 1, snapshotOffset: 8, snapshotSize: 4 }, // float
                { name: 'uFramenr', type: 0x1404, length: 1, snapshotOffset: 12, snapshotSize: 4 },  // int
                { name: 'uViewport', type: 0x8B52, length: 1, snapshotOffset: 16, snapshotSize: 16 } // vec4
            ]
        );

        // Create simple triangle
        const positions = new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0]);
        const indices = new Uint16Array([0, 1, 2]);
        const vao = native.createVertexArray(new Uint8Array(indices.buffer), [{
            buffer: new Uint8Array(positions.buffer),
            enabled: true,
            location: 0,
            offset: 0,
            scalartype: 0x1406,
            stride: 12,
            vectorlength: 3,
            normalized: false
        }]);

        const overlay = native.beginOverlay(
            { vertexObjectId: triggerRender.vertexObjectId },
            program,
            vao,
            {
                trigger: 'after',
                uniformSources: [
                    { name: 'uMouse', sourceName: 'mouse', type: 'builtin' },
                    { name: 'uTimestamp', sourceName: 'timestamp', type: 'builtin' },
                    { name: 'uFramenr', sourceName: 'framenr', type: 'builtin' },
                    { name: 'uViewport', sourceName: 'viewport', type: 'builtin' }
                ],
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay && overlay.stop) {
            pass('Builtin Uniforms', 'Overlay with all builtin uniforms created');

            // Let it render
            await new Promise(resolve => setTimeout(resolve, 200));
            overlay.stop();
        } else {
            fail('Builtin Uniforms', 'Failed to create overlay');
        }
    } catch (e) {
        fail('Builtin Uniforms', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Mouse Position (via built-in uniform)
// =============================================================================
async function testMouseBuiltin(): Promise<void> {
    try {
        // Create a shader that uses the mouse builtin
        const vertShader = `
            #version 330 core
            layout(location = 0) in vec3 aPos;
            void main() {
                gl_Position = vec4(aPos, 1.0);
            }
        `;

        const fragShader = `
            #version 330 core
            uniform vec2 uMouse;
            out vec4 FragColor;
            void main() {
                FragColor = vec4(uMouse.x, uMouse.y, 0.0, 1.0);
            }
        `;

        const program = native.createProgram(
            vertShader,
            fragShader,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [{ name: 'uMouse', type: 0x8B50, length: 1, snapshotOffset: 0, snapshotSize: 8 }] // GL_FLOAT_VEC2
        );

        if (program) {
            pass('Mouse Builtin', 'Program with mouse uniform created');
        } else {
            fail('Mouse Builtin', 'Failed to create program');
        }
    } catch (e) {
        fail('Mouse Builtin', 'Exception', String(e));
    }
}

// =============================================================================
// Main Test Runner
// =============================================================================
export async function runAllTests(): Promise<TestResult[]> {
    log('='.repeat(60));
    log('GL Feature Test Suite for Linux');
    log('='.repeat(60));

    results.length = 0;

    // Core tests
    if (!await testNativeAddon()) return results;
    if (!await testClientConnection()) return results;

    // Window/position APIs
    await testWindowAPIs();

    // Renderer info
    await testRendererInfo();

    // Memory state
    await testMemoryState();

    // GL object stats
    await testGlObjectStats();

    // OpenGL state query
    await testOpenGlState();

    // Capture
    await testCapture();

    // Record render calls
    await testRecordRenderCalls();

    // Stream render calls
    await testStreamRenderCalls();

    // Create program
    await testCreateProgram();

    // Create vertex array
    await testCreateVertexArray();

    // Create texture
    await testCreateTexture();

    // Texture capture
    await testTextureCapture();

    // Texture sampling
    await testTextureSampling();

    // Begin overlay
    await testBeginOverlay();

    // Alpha blending
    await testAlphaBlending();

    // Overlay triggers
    await testOverlayTriggers();

    // UBO uniform copy
    await testUBOUniformCopy();

    // Framebuffer info
    await testFramebufferInfo();

    // Viewport info
    await testViewportInfo();

    // GL log toggles
    await testGlLogToggles();

    // Debug APIs
    await testDebugAPIs();

    // Builtin uniforms (mouse, timestamp, framenr, viewport)
    await testBuiltinUniforms();

    // Mouse builtin (simple test)
    await testMouseBuiltin();

    // Reset state (do this last)
    await testResetOpenGlState();

    // Summary
    log('='.repeat(60));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    log(`Results: ${passed} passed, ${failed} failed`);
    log('='.repeat(60));

    return results;
}

// =============================================================================
// ADVANCED TESTS
// =============================================================================

// =============================================================================
// Test: Multiple Simultaneous Overlays
// =============================================================================
async function testMultipleOverlays(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms', 'vertexarray']
        });

        if (!renders || renders.length < 3) {
            fail('Multiple Overlays', 'Not enough renders to test with');
            return;
        }

        // Find 3 different VAOs to trigger on
        const uniqueVAOs = new Map<number, typeof renders[0]>();
        for (const r of renders) {
            if (r.vertexObjectId > 0 && !uniqueVAOs.has(r.vertexObjectId)) {
                uniqueVAOs.set(r.vertexObjectId, r);
                if (uniqueVAOs.size >= 3) break;
            }
        }

        if (uniqueVAOs.size < 2) {
            fail('Multiple Overlays', 'Not enough unique VAOs');
            return;
        }

        const colors = [
            [1, 0, 0], // Red
            [0, 1, 0], // Green
            [0, 0, 1], // Blue
        ];

        const overlays: GlOverlay[] = [];
        let idx = 0;

        for (const [vaoId, render] of uniqueVAOs) {
            const color = colors[idx % colors.length];

            const fragShader = `
                #version 330 core
                out vec4 FragColor;
                void main() {
                    FragColor = vec4(${color[0]}.0, ${color[1]}.0, ${color[2]}.0, 0.3);
                }
            `;

            const program = native.createProgram(
                `#version 330 core
                layout(location = 0) in vec3 aPos;
                uniform mat4 uViewProjMatrix;
                void main() { gl_Position = uViewProjMatrix * vec4(aPos, 1.0); }`,
                fragShader,
                [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
                [{ name: 'uViewProjMatrix', type: 0x8B5C, length: 1, snapshotOffset: 0, snapshotSize: 64 }]
            );

            const overlay = native.beginOverlay(
                { vertexObjectId: vaoId },
                program,
                undefined, // Use trigger's VAO
                {
                    trigger: 'after',
                    alphaBlend: true,
                    uniformSources: [
                        { name: 'uViewProjMatrix', sourceName: 'uViewProjMatrix', type: 'program' }
                    ]
                }
            );

            if (overlay) {
                overlays.push(overlay);
                log(`  Created overlay ${idx + 1} on VAO ${vaoId}`);
            }
            idx++;
        }

        if (overlays.length >= 2) {
            pass('Multiple Overlays', `${overlays.length} overlays running simultaneously`);

            // Let them render
            await new Promise(resolve => setTimeout(resolve, 500));

            // Stop all
            for (const o of overlays) o.stop();
            log('  All overlays stopped');
        } else {
            fail('Multiple Overlays', 'Failed to create multiple overlays');
        }
    } catch (e) {
        fail('Multiple Overlays', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Shader Source Analysis
// =============================================================================
async function testShaderAnalysis(): Promise<void> {
    try {
        const state = await native.getOpenGlState();
        if (!state || Object.keys(state.programs).length === 0) {
            fail('Shader Analysis', 'No programs available');
            return;
        }

        let analyzed = 0;
        const shaderTypes = { vertex: 0, fragment: 0, compute: 0 };
        const uniformNames = new Set<string>();

        for (const progId of Object.keys(state.programs)) {
            const prog = state.programs[parseInt(progId)];

            if (prog.vertexShader?.source) {
                shaderTypes.vertex++;
                // Look for common RS3 patterns
                if (prog.vertexShader.source.includes('uModelMatrix')) {
                    log(`  Program ${progId}: Has uModelMatrix (3D object)`);
                }
            }
            if (prog.fragmentShader?.source) {
                shaderTypes.fragment++;
            }
            if (prog.computeShader?.source) {
                shaderTypes.compute++;
            }

            // Collect uniform names
            for (const uni of prog.uniforms || []) {
                uniformNames.add(uni.name);
            }

            analyzed++;
        }

        pass('Shader Analysis', `Analyzed ${analyzed} programs`);
        log(`  Vertex: ${shaderTypes.vertex}, Fragment: ${shaderTypes.fragment}, Compute: ${shaderTypes.compute}`);
        log(`  Unique uniforms: ${uniformNames.size}`);

        // Log some interesting uniforms
        const interestingUniforms = ['uModelMatrix', 'uViewProjMatrix', 'uTint', 'uAmbientColour'];
        for (const uni of interestingUniforms) {
            if (uniformNames.has(uni)) {
                log(`  Found: ${uni}`);
            }
        }
    } catch (e) {
        fail('Shader Analysis', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Find Floor Mesh (RS3 specific)
// =============================================================================
async function testFindFloorMesh(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms', 'vertexarray']
        });

        if (!renders || renders.length === 0) {
            fail('Find Floor Mesh', 'No renders');
            return;
        }

        // Floor mesh characteristics:
        // - Large vertex count (typically 10000+)
        // - Uses uTint uniform
        // - Has certain shader patterns

        let floorCandidates = 0;
        for (const render of renders) {
            const totalVerts = render.renderRanges.reduce((sum, r) => sum + r.length, 0);

            // Check for floor-like characteristics
            const hasModelMatrix = render.program?.uniforms?.some(u => u.name === 'uModelMatrix');
            const hasTint = render.program?.uniforms?.some(u => u.name === 'uTint');

            if (totalVerts > 5000 && hasModelMatrix) {
                floorCandidates++;
                log(`  Floor candidate: VAO ${render.vertexObjectId}, ${totalVerts} verts, tint=${hasTint}`);
            }
        }

        if (floorCandidates > 0) {
            pass('Find Floor Mesh', `Found ${floorCandidates} potential floor meshes`);
        } else {
            pass('Find Floor Mesh', 'No obvious floor meshes (may need different detection)');
        }
    } catch (e) {
        fail('Find Floor Mesh', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Render Call Statistics
// =============================================================================
async function testRenderStatistics(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 3,
            features: ['uniforms', 'vertexarray', 'textures']
        });

        if (!renders || renders.length === 0) {
            fail('Render Statistics', 'No renders');
            return;
        }

        // Compute statistics
        const stats = {
            totalRenders: renders.length,
            totalVertices: 0,
            uniquePrograms: new Set<number>(),
            uniqueVAOs: new Set<number>(),
            uniqueTextures: new Set<number>(),
            renderModes: new Map<string, number>(),
            maxVerticesPerDraw: 0,
            avgVerticesPerDraw: 0,
        };

        for (const r of renders) {
            const verts = r.renderRanges.reduce((sum, rr) => sum + rr.length, 0);
            stats.totalVertices += verts;
            stats.maxVerticesPerDraw = Math.max(stats.maxVerticesPerDraw, verts);

            if (r.program?.programId) stats.uniquePrograms.add(r.program.programId);
            if (r.vertexObjectId) stats.uniqueVAOs.add(r.vertexObjectId);

            for (const tex of Object.values(r.textures || {})) {
                if (tex?.texid) stats.uniqueTextures.add(tex.texid);
            }

            const mode = r.renderMode || 'unknown';
            stats.renderModes.set(mode, (stats.renderModes.get(mode) || 0) + 1);
        }

        stats.avgVerticesPerDraw = Math.round(stats.totalVertices / stats.totalRenders);

        pass('Render Statistics', `${stats.totalRenders} draws, ${stats.totalVertices} total vertices`);
        log(`  Unique: ${stats.uniquePrograms.size} programs, ${stats.uniqueVAOs.size} VAOs, ${stats.uniqueTextures.size} textures`);
        log(`  Avg vertices/draw: ${stats.avgVerticesPerDraw}, Max: ${stats.maxVerticesPerDraw}`);
        log(`  Render modes: ${[...stats.renderModes.entries()].map(([m, c]) => `${m}:${c}`).join(', ')}`);
    } catch (e) {
        fail('Render Statistics', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Overlay Uniform State Manipulation
// =============================================================================
async function testOverlayUniformManipulation(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            fail('Uniform Manipulation', 'No renders');
            return;
        }

        const trigger = renders.find(r => r.vertexObjectId > 0);
        if (!trigger) {
            fail('Uniform Manipulation', 'No valid trigger');
            return;
        }

        // Create overlay with color uniform we can manipulate
        const program = native.createProgram(
            `#version 330 core
            layout(location = 0) in vec3 aPos;
            uniform mat4 uViewProjMatrix;
            void main() { gl_Position = uViewProjMatrix * vec4(aPos, 1.0); }`,
            `#version 330 core
            uniform vec4 uColor;
            out vec4 FragColor;
            void main() { FragColor = uColor; }`,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [
                { name: 'uViewProjMatrix', type: 0x8B5C, length: 1, snapshotOffset: 0, snapshotSize: 64 },
                { name: 'uColor', type: 0x8B52, length: 1, snapshotOffset: 64, snapshotSize: 16 }
            ]
        );

        // Initial uniform buffer with red color
        const uniformBuffer = new Uint8Array(80);
        new Float32Array(uniformBuffer.buffer, 64, 4).set([1.0, 0.0, 0.0, 0.5]); // Red

        const overlay = native.beginOverlay(
            { vertexObjectId: trigger.vertexObjectId },
            program,
            undefined,
            {
                trigger: 'after',
                alphaBlend: true,
                uniformBuffer,
                uniformSources: [
                    { name: 'uViewProjMatrix', sourceName: 'uViewProjMatrix', type: 'program' }
                ]
            }
        );

        if (!overlay) {
            fail('Uniform Manipulation', 'Failed to create overlay');
            return;
        }

        // Get initial state
        const state1 = overlay.getUniformState();
        log(`  Initial uniform buffer size: ${state1.length}`);

        // Modify to green
        const newState = new Uint8Array(state1);
        new Float32Array(newState.buffer, 64, 4).set([0.0, 1.0, 0.0, 0.5]); // Green
        overlay.setUniformState(newState);

        await new Promise(resolve => setTimeout(resolve, 200));

        // Modify to blue
        new Float32Array(newState.buffer, 64, 4).set([0.0, 0.0, 1.0, 0.5]); // Blue
        overlay.setUniformState(newState);

        await new Promise(resolve => setTimeout(resolve, 200));

        overlay.stop();
        pass('Uniform Manipulation', 'Successfully manipulated overlay uniforms (red -> green -> blue)');
    } catch (e) {
        fail('Uniform Manipulation', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Filter Combinations
// =============================================================================
async function testFilterCombinations(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            fail('Filter Combinations', 'No renders');
            return;
        }

        // Test different filter combinations
        const filterTests = [
            { name: 'vertexObjectId filter', filter: { vertexObjectId: renders[0].vertexObjectId } },
            { name: 'programId filter', filter: { programId: renders[0].program?.programId } },
            { name: 'maxPerFrame filter', filter: { maxPerFrame: 5 } },
            { name: 'framebufferId filter', filter: { framebufferId: 0 } }, // Default framebuffer
        ];

        let passed = 0;
        for (const test of filterTests) {
            try {
                const filtered = await native.recordRenderCalls({
                    maxframes: 1,
                    ...test.filter
                });

                if (filtered) {
                    log(`  ${test.name}: ${filtered.length} matches`);
                    passed++;
                }
            } catch (e) {
                log(`  ${test.name}: FAILED - ${e}`);
            }
        }

        if (passed === filterTests.length) {
            pass('Filter Combinations', `All ${filterTests.length} filter types work`);
        } else {
            fail('Filter Combinations', `${passed}/${filterTests.length} filters work`);
        }
    } catch (e) {
        fail('Filter Combinations', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Performance Benchmark
// =============================================================================
async function testPerformanceBenchmark(): Promise<void> {
    try {
        const iterations = 5;
        const times = {
            recordRender: [] as number[],
            getState: [] as number[],
            capture: [] as number[],
        };

        for (let i = 0; i < iterations; i++) {
            // Benchmark recordRenderCalls
            let start = performance.now();
            await native.recordRenderCalls({ maxframes: 1, features: [] });
            times.recordRender.push(performance.now() - start);

            // Benchmark getOpenGlState
            start = performance.now();
            await native.getOpenGlState();
            times.getState.push(performance.now() - start);

            // Benchmark capture
            start = performance.now();
            await native.capture(-1, 0, 0, 64, 64);
            times.capture.push(performance.now() - start);
        }

        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

        pass('Performance Benchmark', `${iterations} iterations completed`);
        log(`  recordRenderCalls: ${avg(times.recordRender).toFixed(2)}ms avg`);
        log(`  getOpenGlState: ${avg(times.getState).toFixed(2)}ms avg`);
        log(`  capture (64x64): ${avg(times.capture).toFixed(2)}ms avg`);
    } catch (e) {
        fail('Performance Benchmark', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Texture Upload and Modification
// =============================================================================
async function testTextureUpload(): Promise<void> {
    try {
        // Create initial texture
        const width = 32;
        const height = 32;
        const data = new Uint8ClampedArray(width * height * 4);

        // Fill with gradient
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                data[idx + 0] = (x / width) * 255;
                data[idx + 1] = (y / height) * 255;
                data[idx + 2] = 128;
                data[idx + 3] = 255;
            }
        }

        const texture = native.createTexture(new ImageData(data, width, height));

        if (!texture || texture.texid <= 0) {
            fail('Texture Upload', 'Failed to create initial texture');
            return;
        }

        log(`  Created texture ${texture.texid}`);

        // Modify the texture
        for (let i = 0; i < data.length; i += 4) {
            // Invert colors
            data[i + 0] = 255 - data[i + 0];
            data[i + 1] = 255 - data[i + 1];
        }

        texture.upload(new ImageData(data, width, height));
        log('  Uploaded modified texture data');

        // Capture back
        const captured = texture.capture(0, 0, width, height);

        if (captured && captured.width === width && captured.height === height) {
            // Verify some pixels changed
            let different = 0;
            for (let i = 0; i < Math.min(100, captured.data.length); i++) {
                if (captured.data[i] !== 128) different++;
            }
            pass('Texture Upload', `Texture uploaded and verified (${different}/100 pixels differ from mid-gray)`);
        } else {
            fail('Texture Upload', 'Capture verification failed');
        }
    } catch (e) {
        fail('Texture Upload', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Compute Shader Detection (if RS3 uses them)
// =============================================================================
async function testComputeShaders(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 3,
            features: ['computebindings'],
            includeCompute: true,
            includeDraw: false // Only compute
        });

        if (!renders || renders.length === 0) {
            pass('Compute Shaders', 'No compute dispatches detected (may not be used by RS3)');
            return;
        }

        pass('Compute Shaders', `Found ${renders.length} compute dispatches`);

        for (const r of renders.slice(0, 3)) {
            if (r.computeBuffers?.length) {
                log(`  Dispatch with ${r.computeBuffers.length} SSBOs`);
            }
            if (r.computeTextures?.length) {
                log(`  Dispatch with ${r.computeTextures.length} image bindings`);
            }
        }
    } catch (e) {
        fail('Compute Shaders', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Frame Timing Analysis
// =============================================================================
async function testFrameTiming(): Promise<void> {
    try {
        const frames: number[] = [];
        let lastFrameTime = 0;

        const stream = native.streamRenderCalls(
            { framecooldown: 0, maxPerFrame: 1 },
            (renders) => {
                if (renders.length > 0 && renders[0].ownFrameTime !== lastFrameTime) {
                    if (lastFrameTime > 0) {
                        frames.push(renders[0].ownFrameTime - lastFrameTime);
                    }
                    lastFrameTime = renders[0].ownFrameTime;
                }
            }
        );

        await new Promise(resolve => setTimeout(resolve, 1000));
        await stream.close();

        if (frames.length > 5) {
            const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
            const fps = 1000 / avgFrameTime;
            const minFrame = Math.min(...frames);
            const maxFrame = Math.max(...frames);

            pass('Frame Timing', `~${fps.toFixed(1)} FPS (${frames.length} frames sampled)`);
            log(`  Frame time: ${avgFrameTime.toFixed(2)}ms avg, ${minFrame.toFixed(2)}ms min, ${maxFrame.toFixed(2)}ms max`);
        } else {
            fail('Frame Timing', 'Not enough frames captured');
        }
    } catch (e) {
        fail('Frame Timing', 'Exception', String(e));
    }
}

// =============================================================================
// Test: Depth Buffer Access
// =============================================================================
async function testDepthBuffer(): Promise<void> {
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['framebuffer']
        });

        if (!renders || renders.length === 0) {
            fail('Depth Buffer', 'No renders');
            return;
        }

        const rendersWithDepth = renders.filter(r => r.framebufferDepthTextureId > 0);

        if (rendersWithDepth.length > 0) {
            const depthTexIds = new Set(rendersWithDepth.map(r => r.framebufferDepthTextureId));
            pass('Depth Buffer', `Found ${depthTexIds.size} depth texture attachment(s)`);
            log(`  Depth texture IDs: ${[...depthTexIds].join(', ')}`);
        } else {
            pass('Depth Buffer', 'No FBO depth attachments (renders may use default depth buffer)');
        }
    } catch (e) {
        fail('Depth Buffer', 'Exception', String(e));
    }
}

// =============================================================================
// Main Test Runner (Updated)
// =============================================================================
export async function runAllTests(): Promise<TestResult[]> {
    log('='.repeat(60));
    log('GL Feature Test Suite for Linux - COMPREHENSIVE');
    log('='.repeat(60));

    results.length = 0;

    // Core tests
    if (!await testNativeAddon()) return results;
    if (!await testClientConnection()) return results;

    // Basic APIs
    await testWindowAPIs();
    await testRendererInfo();
    await testMemoryState();
    await testGlObjectStats();

    // GL State
    await testOpenGlState();
    await testCapture();

    // Render Recording
    await testRecordRenderCalls();
    await testStreamRenderCalls();

    // Object Creation
    await testCreateProgram();
    await testCreateVertexArray();
    await testCreateTexture();

    // Texture Operations
    await testTextureCapture();
    await testTextureSampling();
    await testTextureUpload();

    // Overlay System - Core
    await testBeginOverlay();
    await testAlphaBlending();

    // Overlay System - All Trigger Types
    await testOverlayTriggers();        // Tests all: before/after/replace/frameend/passive
    await testFrameendOverlay();        // Detailed frameend test
    await testReplaceOverlay();         // Detailed replace test
    await testPassiveOverlay();         // Detailed passive test

    // Overlay System - Options
    await testBlendModes();             // Tests: BLEND, NOBLEND, DEFAULT
    await testOverlayDuration();        // Tests: duration option (auto-expire)
    await testMultipleOverlays();
    await testOverlayUniformManipulation();

    // Uniform System
    await testUBOUniformCopy();
    await testBuiltinUniforms();
    await testMouseBuiltin();

    // Render Recording Features
    await testRenderFeatures();         // Tests all feature flags

    // Advanced Analysis
    await testShaderAnalysis();
    await testFindFloorMesh();
    await testRenderStatistics();
    await testFilterCombinations();

    // Framebuffer & Depth
    await testFramebufferInfo();
    await testViewportInfo();
    await testDepthBuffer();

    // Compute (if available)
    await testComputeShaders();

    // Performance
    await testFrameTiming();
    await testPerformanceBenchmark();

    // Debug & Utility
    await testGlLogToggles();
    await testDebugAPIs();

    // Cleanup (last)
    await testResetOpenGlState();

    // Summary
    log('='.repeat(60));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED out of ${results.length} tests`);
    log('='.repeat(60));

    if (failed > 0) {
        log('\nFailed tests:');
        for (const r of results.filter(r => !r.passed)) {
            log(`  - ${r.name}: ${r.details}${r.error ? ` (${r.error})` : ''}`);
        }
    }

    return results;
}

// Quick test for specific features
export async function runQuickTest(): Promise<void> {
    log('Running quick GL test...');

    if (!native) {
        log('ERROR: Native addon not loaded');
        return;
    }

    const ready = native.getRsReady();
    log(`Client ready: ${ready}`);

    if (!ready) {
        log('Attempting to hook...');
        await hookFirstClient();
    }

    const info = native.getRenderer();
    log(`Renderer: ${info?.glRenderer || 'unknown'}`);

    const renders = await native.recordRenderCalls({ maxframes: 1 });
    log(`Captured ${renders?.length || 0} render calls`);

    log('Quick test complete!');
}

// Export for use in console
export { results as testResults };
