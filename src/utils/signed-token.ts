import crypto from 'crypto';

interface BaseTokenPayload {
    purpose: string;
    exp: number;
}

function toBase64Url(value: string): string {
    return Buffer.from(value, 'utf-8').toString('base64url');
}

function fromBase64Url(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf-8');
}

function sign(payloadSegment: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payloadSegment).digest('base64url');
}

export function createSignedToken<T extends BaseTokenPayload>(payload: T, secret: string): string {
    const payloadSegment = toBase64Url(JSON.stringify(payload));
    const signature = sign(payloadSegment, secret);
    return `${payloadSegment}.${signature}`;
}

export function verifySignedToken<T extends BaseTokenPayload>(
    token: string,
    secret: string,
    expectedPurpose: T['purpose'],
): T | null {
    const [payloadSegment, signatureSegment] = token.split('.');
    if (!payloadSegment || !signatureSegment) {
        return null;
    }

    const expectedSignature = sign(payloadSegment, secret);
    const signatureBuffer = Buffer.from(signatureSegment, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

    if (
        signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
        return null;
    }

    try {
        const payload = JSON.parse(fromBase64Url(payloadSegment)) as T;
        if (payload.purpose !== expectedPurpose) {
            return null;
        }
        if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}
