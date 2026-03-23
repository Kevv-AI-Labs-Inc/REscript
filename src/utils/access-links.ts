import { config } from '../config/index.js';
import type { Client } from '../store/client-store.js';
import { createSignedToken, verifySignedToken } from './signed-token.js';

interface ViewerTokenPayload {
    purpose: 'viewer';
    clientId: string;
    outputKey: string;
    exp: number;
}

interface ManageTokenPayload {
    purpose: 'manage';
    clientId: string;
    exp: number;
}

const VIEWER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 45;
const MANAGE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 180;

export function createViewerToken(client: Client, outputKey: string): string {
    return createSignedToken<ViewerTokenPayload>({
        purpose: 'viewer',
        clientId: client.id,
        outputKey,
        exp: Date.now() + VIEWER_TOKEN_TTL_MS,
    }, config.VIEWER_TOKEN_SECRET);
}

export function verifyViewerToken(token: string): ViewerTokenPayload | null {
    return verifySignedToken<ViewerTokenPayload>(token, config.VIEWER_TOKEN_SECRET, 'viewer');
}

export function createManageToken(client: Client): string {
    return createSignedToken<ManageTokenPayload>({
        purpose: 'manage',
        clientId: client.id,
        exp: Date.now() + MANAGE_TOKEN_TTL_MS,
    }, config.VIEWER_TOKEN_SECRET);
}

export function verifyManageToken(token: string): ManageTokenPayload | null {
    return verifySignedToken<ManageTokenPayload>(token, config.VIEWER_TOKEN_SECRET, 'manage');
}
