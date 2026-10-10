"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="alert alert-error alert-vertical sm:alert-horizontal">
      <span>Não foi possível carregar esta página.</span>
      <button type="button" className="btn" onClick={() => retry()}>
        Tentar de novo
      </button>
    </div>
  );
}
