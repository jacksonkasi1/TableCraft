import { TABLECRAFT_URL_STATE_EVENT } from "./url-events";

let patched = false;

function canUseDOM(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.history !== "undefined" &&
    typeof window.dispatchEvent !== "undefined"
  );
}

function dispatchUrlStateEvent(): void {
  if (!canUseDOM()) return;

  const dispatch = () => window.dispatchEvent(new Event(TABLECRAFT_URL_STATE_EVENT));

  if (typeof queueMicrotask === "function") {
    queueMicrotask(dispatch);
    return;
  }

  Promise.resolve().then(dispatch);
}

/**
 * Patch history APIs to emit a shared event when the URL changes.
 *
 * Notes:
 * - `popstate` does NOT fire for `history.pushState`/`replaceState`.
 * - Framework routers commonly use these APIs.
 * - We patch once globally and keep it installed for the app lifetime.
 */
export function ensureUrlStateHistoryPatched(): void {
  if (patched || !canUseDOM()) return;

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
    originalPushState(...args);
    dispatchUrlStateEvent();
  }) as History["pushState"];

  window.history.replaceState = ((
    ...args: Parameters<History["replaceState"]>
  ) => {
    originalReplaceState(...args);
    dispatchUrlStateEvent();
  }) as History["replaceState"];

  window.addEventListener("hashchange", dispatchUrlStateEvent);

  patched = true;
}

export function isUrlStateHistoryPatched(): boolean {
  return patched;
}