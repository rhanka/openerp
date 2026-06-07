/**
 * Chat local-tools seam — integration 3-A canvas bridge.
 *
 * @sentropic/chat-ui 0.19 exposes `setLocalToolsAdapter` from
 * `@sentropic/chat-ui/stores/localTools` to inject a custom `LocalToolsAdapter`
 * into the package's local-tool runtime. The adapter shape is:
 *
 *   interface LocalToolsAdapter {
 *     id?: string;
 *     sendMessage?: (message: unknown) => Promise<{
 *       ok?: boolean; result?: unknown; error?: string;
 *       permissionRequest?: unknown; items?: unknown; item?: unknown;
 *     }>;
 *   }
 *
 * However, the local-tool *name* enum is hardcoded in the package as
 * `LocalToolName` and does NOT include `read_canvas_context`. The adapter
 * protocol routes messages by tool name through `sendMessage`, but the
 * package's `isLocalToolName` guard would reject an unknown name before
 * dispatching to the adapter.
 *
 * DEFERRED: wire this once the platform publishes an open-name extension point
 * for host-registered tools (post-0.19 contract, tracked as D1/D5 platform lane).
 *
 * INTENDED REGISTRATION (do not activate until the name guard is relaxed):
 *
 *   import { setLocalToolsAdapter } from '@sentropic/chat-ui/stores/localTools';
 *   import { canvasContext } from '$lib/canvas-context';
 *   import { get } from 'svelte/store';
 *
 *   setLocalToolsAdapter({
 *     id: 'openerp.canvas',
 *     async sendMessage(message) {
 *       const msg = message as { name?: string };
 *       if (msg.name === 'read_canvas_context') {
 *         return { ok: true, result: get(canvasContext) };
 *       }
 *       return { ok: false, error: 'unknown tool' };
 *     }
 *   });
 */

// No runtime exports — this module is documentation-only until the platform
// extension point is published.
export {};
