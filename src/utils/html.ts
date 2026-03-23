export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function escapeHtmlWithBreaks(value: string): string {
    return escapeHtml(value).replace(/\n/g, '<br>');
}

export function safeHttpUrl(value: string): string | null {
    try {
        const url = new URL(value);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            return url.toString();
        }
        return null;
    } catch {
        return null;
    }
}
