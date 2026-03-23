import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import type { DailyOutput } from '../agents/script-writer-agent.js';
import type { AudienceProfile, Language, MarketId } from './client-store.js';
import { ensureDirSync, readJsonFileSync, writeJsonFileAtomicSync } from '../utils/file-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUTS_DIR = path.join(__dirname, '../../data/outputs');

export interface OutputSummary {
    key: string;
    date: string;
    language: Language;
    market: MarketId;
    audienceProfile: AudienceProfile;
    generatedAt: string;
    articleCount: number;
    moduleCount: number;
}

function ensureDir(): void {
    ensureDirSync(OUTPUTS_DIR);
}

export function buildOutputKey(date: string, language: Language, market: MarketId, audienceProfile: AudienceProfile): string {
    return `${date}__${language}__${market}__${audienceProfile}`;
}

function getOutputFilePath(key: string): string {
    return path.join(OUTPUTS_DIR, `${key}.json`);
}

function toSummary(output: DailyOutput): OutputSummary {
    return {
        key: output.key,
        date: output.date,
        language: output.language,
        market: output.market,
        audienceProfile: output.audienceProfile,
        generatedAt: output.generatedAt,
        articleCount: output.articleCount,
        moduleCount: output.modules?.length || 0,
    };
}

function migrateLegacyOutput(key: string, raw: any): DailyOutput {
    const language = raw.language === 'en' ? 'en' : 'zh';
    const market = raw.market || 'new-york';
    const audienceProfile = raw.audienceProfile === 'chinese-community' || raw.audienceProfile === 'general'
        ? raw.audienceProfile
        : (language === 'zh' ? 'chinese-community' : 'general');
    return {
        ...raw,
        key,
        language,
        market,
        audienceProfile,
    } as DailyOutput;
}

export function saveDailyOutput(output: DailyOutput): OutputSummary {
    ensureDir();
    const key = buildOutputKey(output.date, output.language, output.market, output.audienceProfile);
    const filePath = getOutputFilePath(key);
    const nextOutput: DailyOutput = { ...output, key };
    writeJsonFileAtomicSync(filePath, nextOutput);
    const summary = toSummary(nextOutput);
    logger.info(`💾 Saved daily output to ${key}.json`);
    return summary;
}

export function getDailyOutput(key: string): DailyOutput | null {
    ensureDir();
    const filePath = getOutputFilePath(key);
    if (!fs.existsSync(filePath)) {
        return null;
    }

    const raw = readJsonFileSync<any>(filePath, null);
    if (!raw) {
        return null;
    }
    return migrateLegacyOutput(key, raw);
}

export function listOutputs(): OutputSummary[] {
    ensureDir();

    return fs.readdirSync(OUTPUTS_DIR)
        .filter((fileName) => fileName.endsWith('.json'))
        .map((fileName) => fileName.replace('.json', ''))
        .map((key) => getDailyOutput(key))
        .filter((output): output is DailyOutput => Boolean(output))
        .map(toSummary)
        .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
}

export function getLatestOutputForPreferences(language: Language, market: MarketId, audienceProfile: AudienceProfile): OutputSummary | null {
    return listOutputs().find((output) => (
        output.language === language
        && output.market === market
        && output.audienceProfile === audienceProfile
    )) || null;
}
