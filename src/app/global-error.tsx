"use client";

/**
 * Global error boundary — catches errors in the root layout itself.
 * Must include its own <html> and <body> since the root layout may have crashed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          fontFamily: "Cairo, system-ui, sans-serif",
          margin: 0,
          padding: 0,
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "360px" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 24px",
                borderRadius: "50%",
                backgroundColor: "#FEE2E2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
              }}
            >
              ⚠️
            </div>

            <h1
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#1A1A2E",
                marginBottom: "8px",
              }}
            >
              حصل مشكلة كبيرة
            </h1>

            <p
              style={{
                color: "#6B7280",
                marginBottom: "32px",
                lineHeight: "1.6",
              }}
            >
              التطبيق واجه مشكلة غير متوقعة. جرب تحمّل الصفحة من الأول.
            </p>

            <button
              onClick={reset}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#1B7A3D",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                fontFamily: "Cairo, system-ui, sans-serif",
              }}
            >
              حمّل الصفحة تاني
            </button>

            {error.digest && (
              <p
                style={{
                  marginTop: "24px",
                  fontSize: "12px",
                  color: "#9CA3AF",
                }}
                dir="ltr"
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
