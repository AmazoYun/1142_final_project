"use client";

import { Suspense } from "react";
import StartPage from "@/components/home/StartPage";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <StartPage />
    </Suspense>
  );
}
