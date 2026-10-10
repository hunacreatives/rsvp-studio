import { Component, type ReactNode } from "react";

// A crash in one page shows a calm message instead of a blank screen. Going to
// another page (a new resetKey) clears it — without rebuilding the pages that
// didn't crash, so layouts and their loaded data stay put.

type Props = { children: ReactNode; fallback?: (reset: () => void) => ReactNode; resetKey?: string };

export default class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Page crashed:", error);
    // After a new deploy, an open tab can ask for a page file that no longer exists.
    // Reload once to pick up the new version instead of showing an error.
    const msg = error instanceof Error ? error.message : String(error);
    if (/dynamically imported module|Importing a module script failed|Loading chunk/i.test(msg)) {
      try {
        if (!sessionStorage.getItem("rs-reloaded")) {
          sessionStorage.setItem("rs-reloaded", "1");
          window.location.reload();
        }
      } catch {
        /* storage blocked: show the normal message */
      }
    }
  }

  reset = () => this.setState({ failed: false });

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.reset();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 py-20 text-center" style={{ background: "var(--warm-white)" }}>
        <div className="max-w-md">
          <p className="eyebrow">Something went wrong</p>
          <h1 className="mt-3 font-display text-[2rem] font-semibold leading-tight text-[var(--ink)]">This page didn’t load properly</h1>
          <p className="mt-3 text-[15px] text-[var(--slate)]">
            Please refresh the page. If it keeps happening, email us at{" "}
            <a href="mailto:hello@thersvpstudio.com" className="underline underline-offset-4">
              hello@thersvpstudio.com
            </a>{" "}
            and tell us what you were doing.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Refresh the page
            </button>
            <a className="btn btn-ghost" href="/">
              Go to homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
}
