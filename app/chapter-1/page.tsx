"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect /chapter-1 to /chapter/1 for consistency
export default function Chapter1Page() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/chapter/1');
  }, [router]);

  // Return null while redirecting
  return null;
}
