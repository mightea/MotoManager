import { useEffect, useState } from "react";
import { fetchAuthenticatedAsset } from "~/utils/backend";

type AssetState = { path: string; url: string | null; failed: boolean };

/**
 * Object URL for an auth-gated file (e.g. a document preview), for use in
 * `<img src>`. `<img>` can't send an Authorization header, so the file is
 * fetched with the token and shown from a `blob:` URL, revoked on unmount.
 */
export function useAuthenticatedAssetUrl(path: string | null | undefined): {
  url: string | null;
  failed: boolean;
} {
  const [state, setState] = useState<AssetState | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    fetchAuthenticatedAsset(path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ path, url: objectUrl, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ path, url: null, failed: true });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  // Ignore results that belong to a previous path.
  if (!path || state?.path !== path) return { url: null, failed: false };
  return { url: state.url, failed: state.failed };
}
