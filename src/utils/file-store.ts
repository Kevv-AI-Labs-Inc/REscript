import fs from 'fs';
import path from 'path';

export function ensureDirSync(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export function readJsonFileSync<T>(filePath: string, fallback: T): T {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
}

export function writeJsonFileAtomicSync(filePath: string, value: unknown): void {
    ensureDirSync(path.dirname(filePath));

    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
}
