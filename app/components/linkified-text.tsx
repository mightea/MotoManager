import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+\.[^\s]{2,})/g;

/**
 * Renders plain text with any contained URLs as clickable links that open in
 * a new tab. Bare `www.` hosts get an `https://` prefix for the href.
 */
export function LinkifiedText({ text }: { text: string }) {
    const parts = text.split(URL_PATTERN);
    if (parts.length === 1) return <>{text}</>;

    const nodes: ReactNode[] = [];
    // Keyed by character offset — unique even when the same URL appears twice.
    let offset = 0;
    let isUrl = false;
    for (const part of parts) {
        const key = `${offset}:${part}`;
        if (isUrl) {
            nodes.push(
                <a
                    key={key}
                    href={part.startsWith("www.") ? `https://${part}` : part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary dark:text-primary-light"
                >
                    {part}
                </a>,
            );
        } else {
            nodes.push(<span key={key}>{part}</span>);
        }
        offset += part.length;
        isUrl = !isUrl;
    }

    return <>{nodes}</>;
}
