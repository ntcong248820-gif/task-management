import { getApiUrl } from './config';

export const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API error');
    return json.data;
};

export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(getApiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    return json.data;
};