import { Component, type ReactNode } from "react";

// A crash in one page shows a calm message instead of a blank screen. The router
// keys this by page, so going to another page clears it.

type Props = { children: ReactNode; fallback?: (reset: () => void) => ReactNode };

export default class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Page crashed:", error);
  }

  reset = () => this.setState({ failed: false });

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
