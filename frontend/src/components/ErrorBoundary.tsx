import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#1f1812",
          background: "#f7f1ea",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "2.5rem" }}>🪵</div>
          <h1 style={{ fontSize: "1.3rem", margin: 0 }}>Prišlo je do napake</h1>
          <p style={{ color: "#544237", margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
            Stran je naletela na nepričakovano napako. Poskusite znova.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: "#2f2117",
              color: "#f7f0e7",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 700,
            }}
          >
            Naloži znova
          </button>
          {import.meta.env.DEV && (
            <pre style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "#fff0f0",
              border: "1px solid #f0a0a0",
              borderRadius: 8,
              fontSize: "0.72rem",
              color: "#8b2020",
              textAlign: "left",
              maxWidth: 600,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
