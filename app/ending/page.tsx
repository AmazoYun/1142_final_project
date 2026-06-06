import { Suspense } from "react";
import EndingPage from "./EndingPageClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center hub-shell">
          <p className="text-sm opacity-70">載入結局中…</p>
        </div>
      }
    >
      <EndingPage />
    </Suspense>
  );
}
