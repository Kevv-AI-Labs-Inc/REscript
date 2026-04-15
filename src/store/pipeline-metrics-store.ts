import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import type { AudienceProfile, Language, MarketId } from './client-store.js';
import { ensureDirSync, readJsonFileSync, writeJsonFileAtomicSync } from '../utils/file-store.js';
import { addUsage, emptyUsage, estimateCostUsd, type TokenUsage } from '../telemetry/usage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METRICS_DIR = path.join(__dirname, '../../data/runtime');
const METRICS_FILE = path.join(METRICS_DIR, 'pipeline-metrics.json');
const HISTORY_DAYS_TO_KEEP = 21;

export type PipelineTrigger = 'scheduled' | 'manual' | 'cli';
export type PipelineRunStatus = 'running' | 'completed' | 'failed';
export type PipelineGroupStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface UsageSnapshot extends TokenUsage {
    calls: number;
    estimatedCostUsd: number;
}

export interface PipelineGroupMetrics extends UsageSnapshot {
    key: string;
    language: Language;
    market: MarketId;
    audienceProfile: AudienceProfile;
    recipientCount: number;
    subscriberCount: number;
    vipCount: number;
    plannedCalls: number;
    completedCalls: number;
    scriptsGenerated: number;
    emailSent: number;
    emailFailed: number;
    status: PipelineGroupStatus;
    currentStep: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
}

export interface PipelineRunMetrics extends UsageSnapshot {
    id: string;
    dateKey: string;
    trigger: PipelineTrigger;
    dryRun: boolean;
    status: PipelineRunStatus;
    startedAt: string;
    updatedAt: string;
    completedAt?: string;
    durationSeconds?: number;
    totalGroups: number;
    completedGroups: number;
    totalRecipients: number;
    subscriberCount: number;
    vipCount: number;
    emailSent: number;
    emailFailed: number;
    currentStep: string;
    currentGroupKey?: string;
    error?: string;
    groups: PipelineGroupMetrics[];
}

export interface DailyGroupUsage extends UsageSnapshot {
    key: string;
    language: Language;
    market: MarketId;
    audienceProfile: AudienceProfile;
    recipientCount: number;
    subscriberCount: number;
    vipCount: number;
    scriptsGenerated: number;
    emailSent: number;
    emailFailed: number;
    runs: number;
    lastRunAt?: string;
    currentStep?: string;
    status?: PipelineGroupStatus;
    completedAt?: string;
    error?: string;
}

export interface DailyPipelineUsage extends UsageSnapshot {
    dateKey: string;
    runCount: number;
    emailSent: number;
    emailFailed: number;
    lastCompletedAt?: string;
    groups: DailyGroupUsage[];
}

interface PipelineMetricsState {
    currentRun: PipelineRunMetrics | null;
    latestRun: PipelineRunMetrics | null;
    history: Record<string, DailyPipelineUsage>;
}

export interface PipelineMetricsSnapshot {
    currentRun: PipelineRunMetrics | null;
    latestRun: PipelineRunMetrics | null;
    today: DailyPipelineUsage;
    pricing: {
        inputCostPer1M: number;
        outputCostPer1M: number;
        costConfigured: boolean;
    };
}

interface PipelineGroupSeed {
    language: Language;
    market: MarketId;
    audienceProfile: AudienceProfile;
    recipientCount: number;
    subscriberCount: number;
    vipCount: number;
    plannedCalls: number;
}

function nowIso(): string {
    return new Date().toISOString();
}

function getOperationalDateKey(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: config.CRON_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function createUsageSnapshot(): UsageSnapshot {
    return {
        ...emptyUsage(),
        calls: 0,
        estimatedCostUsd: 0,
    };
}

function createDailyUsage(dateKey: string): DailyPipelineUsage {
    return {
        dateKey,
        runCount: 0,
        emailSent: 0,
        emailFailed: 0,
        lastCompletedAt: undefined,
        groups: [],
        ...createUsageSnapshot(),
    };
}

function readState(): PipelineMetricsState {
    ensureDirSync(METRICS_DIR);
    const state = readJsonFileSync<PipelineMetricsState>(METRICS_FILE, {
        currentRun: null,
        latestRun: null,
        history: {},
    });

    if (state.currentRun?.status === 'running') {
        const staleRun: PipelineRunMetrics = {
            ...state.currentRun,
            status: 'failed',
            updatedAt: nowIso(),
            completedAt: nowIso(),
            error: state.currentRun.error || 'Process restarted while pipeline was running.',
            currentStep: 'Process restarted while pipeline was running.',
            groups: state.currentRun.groups.map((group) => (
                group.status === 'running'
                    ? { ...group, status: 'failed', error: 'Process restarted mid-run.' }
                    : group
            )),
        };
        state.latestRun = staleRun;
        state.currentRun = null;
        writeJsonFileAtomicSync(METRICS_FILE, state);
    }

    return state;
}

let state = readState();

function persist(): void {
    const historyKeys = Object.keys(state.history).sort().slice(-HISTORY_DAYS_TO_KEEP);
    state.history = historyKeys.reduce<Record<string, DailyPipelineUsage>>((acc, key) => {
        acc[key] = state.history[key];
        return acc;
    }, {});
    writeJsonFileAtomicSync(METRICS_FILE, state);
}

function createGroupKey(language: Language, market: MarketId, audienceProfile: AudienceProfile): string {
    return `${language}|${market}|${audienceProfile}`;
}

function getDailyGroupEntry(day: DailyPipelineUsage, group: PipelineGroupSeed): DailyGroupUsage {
    const key = createGroupKey(group.language, group.market, group.audienceProfile);
    let entry = day.groups.find((item) => item.key === key);
    if (!entry) {
        entry = {
            key,
            language: group.language,
            market: group.market,
            audienceProfile: group.audienceProfile,
            recipientCount: group.recipientCount,
            subscriberCount: group.subscriberCount,
            vipCount: group.vipCount,
            scriptsGenerated: 0,
            emailSent: 0,
            emailFailed: 0,
            runs: 0,
            lastRunAt: undefined,
            currentStep: 'Queued',
            status: 'queued',
            ...createUsageSnapshot(),
        };
        day.groups.push(entry);
    } else {
        entry.recipientCount = Math.max(entry.recipientCount, group.recipientCount);
        entry.subscriberCount = Math.max(entry.subscriberCount, group.subscriberCount);
        entry.vipCount = Math.max(entry.vipCount, group.vipCount);
    }
    return entry;
}

function addUsageToSnapshot(snapshot: UsageSnapshot, usage: TokenUsage): void {
    const next = addUsage(snapshot, usage);
    snapshot.promptTokens = next.promptTokens;
    snapshot.completionTokens = next.completionTokens;
    snapshot.totalTokens = next.totalTokens;
    snapshot.calls += 1;
    snapshot.estimatedCostUsd = Number((
        snapshot.estimatedCostUsd
        + estimateCostUsd(usage, config.AZURE_INPUT_COST_PER_1M, config.AZURE_OUTPUT_COST_PER_1M)
    ).toFixed(6));
}

function ensureTodayUsage(dateKey: string): DailyPipelineUsage {
    if (!state.history[dateKey]) {
        state.history[dateKey] = createDailyUsage(dateKey);
    }
    return state.history[dateKey];
}

export function startPipelineRunMetrics(meta: {
    trigger: PipelineTrigger;
    dryRun: boolean;
    totalRecipients: number;
    subscriberCount: number;
    vipCount: number;
    groups: PipelineGroupSeed[];
}): PipelineRunMetrics {
    const startedAt = nowIso();
    const run: PipelineRunMetrics = {
        id: `run_${Date.now()}`,
        dateKey: getOperationalDateKey(),
        trigger: meta.trigger,
        dryRun: meta.dryRun,
        status: 'running',
        startedAt,
        updatedAt: startedAt,
        totalGroups: meta.groups.length,
        completedGroups: 0,
        totalRecipients: meta.totalRecipients,
        subscriberCount: meta.subscriberCount,
        vipCount: meta.vipCount,
        emailSent: 0,
        emailFailed: 0,
        currentStep: 'Preparing preference groups',
        currentGroupKey: undefined,
        groups: meta.groups.map((group) => ({
            key: createGroupKey(group.language, group.market, group.audienceProfile),
            language: group.language,
            market: group.market,
            audienceProfile: group.audienceProfile,
            recipientCount: group.recipientCount,
            subscriberCount: group.subscriberCount,
            vipCount: group.vipCount,
            plannedCalls: group.plannedCalls,
            completedCalls: 0,
            scriptsGenerated: 0,
            emailSent: 0,
            emailFailed: 0,
            status: 'queued',
            currentStep: 'Queued',
            ...createUsageSnapshot(),
        })),
        ...createUsageSnapshot(),
    };

    state.currentRun = run;
    const today = ensureTodayUsage(run.dateKey);
    today.runCount += 1;
    persist();
    return run;
}

export function updatePipelineRunStep(step: string): void {
    if (!state.currentRun) {
        return;
    }
    state.currentRun.currentStep = step;
    state.currentRun.updatedAt = nowIso();
    persist();
}

export function updatePipelineGroupPlan(groupKey: string, plannedCalls: number): void {
    if (!state.currentRun) {
        return;
    }
    const group = state.currentRun.groups.find((item) => item.key === groupKey);
    if (!group) {
        return;
    }
    group.plannedCalls = plannedCalls;
    state.currentRun.updatedAt = nowIso();
    persist();
}

export function startPipelineGroup(groupKey: string, step: string): void {
    if (!state.currentRun) {
        return;
    }
    const group = state.currentRun.groups.find((item) => item.key === groupKey);
    if (!group) {
        return;
    }
    group.status = 'running';
    group.startedAt = group.startedAt || nowIso();
    group.currentStep = step;
    state.currentRun.currentGroupKey = groupKey;
    state.currentRun.currentStep = step;
    state.currentRun.updatedAt = nowIso();

    const today = ensureTodayUsage(state.currentRun.dateKey);
    const dailyGroup = getDailyGroupEntry(today, group);
    dailyGroup.status = 'running';
    dailyGroup.currentStep = step;
    dailyGroup.lastRunAt = nowIso();
    persist();
}

export function updatePipelineGroupStep(groupKey: string, step: string): void {
    if (!state.currentRun) {
        return;
    }
    const group = state.currentRun.groups.find((item) => item.key === groupKey);
    if (!group) {
        return;
    }
    group.currentStep = step;
    state.currentRun.currentGroupKey = groupKey;
    state.currentRun.currentStep = step;
    state.currentRun.updatedAt = nowIso();

    const today = ensureTodayUsage(state.currentRun.dateKey);
    const dailyGroup = getDailyGroupEntry(today, group);
    dailyGroup.currentStep = step;
    dailyGroup.status = group.status;
    dailyGroup.lastRunAt = nowIso();
    persist();
}

export function recordPipelineUsage(
    groupKey: string,
    usage: TokenUsage,
    options?: {
        scriptsGenerated?: number;
    },
): void {
    if (!state.currentRun) {
        return;
    }
    const group = state.currentRun.groups.find((item) => item.key === groupKey);
    if (!group) {
        return;
    }

    addUsageToSnapshot(group, usage);
    addUsageToSnapshot(state.currentRun, usage);
    group.completedCalls += 1;
    group.scriptsGenerated += Number(options?.scriptsGenerated || 0);

    const today = ensureTodayUsage(state.currentRun.dateKey);
    addUsageToSnapshot(today, usage);
    const dailyGroup = getDailyGroupEntry(today, group);
    addUsageToSnapshot(dailyGroup, usage);
    dailyGroup.scriptsGenerated += Number(options?.scriptsGenerated || 0);
    dailyGroup.lastRunAt = nowIso();

    state.currentRun.updatedAt = nowIso();
    persist();
}

export function recordPipelineEmailResults(groupKey: string, sent: number, failed: number): void {
    if (!state.currentRun) {
        return;
    }
    const group = state.currentRun.groups.find((item) => item.key === groupKey);
    if (!group) {
        return;
    }
    group.emailSent += sent;
    group.emailFailed += failed;
    state.currentRun.emailSent += sent;
    state.currentRun.emailFailed += failed;

    const today = ensureTodayUsage(state.currentRun.dateKey);
    today.emailSent += sent;
    today.emailFailed += failed;
    const dailyGroup = getDailyGroupEntry(today, group);
    dailyGroup.emailSent += sent;
    dailyGroup.emailFailed += failed;
    dailyGroup.lastRunAt = nowIso();

    state.currentRun.updatedAt = nowIso();
    persist();
}

export function completePipelineGroup(groupKey: string): void {
    if (!state.currentRun) {
        return;
    }
    const group = state.currentRun.groups.find((item) => item.key === groupKey);
    if (!group) {
        return;
    }

    group.status = 'completed';
    group.currentStep = 'Completed';
    group.completedAt = nowIso();
    state.currentRun.completedGroups = state.currentRun.groups.filter((item) => item.status === 'completed').length;
    state.currentRun.updatedAt = nowIso();

    const today = ensureTodayUsage(state.currentRun.dateKey);
    const dailyGroup = getDailyGroupEntry(today, group);
    dailyGroup.runs += 1;
    dailyGroup.lastRunAt = nowIso();
    dailyGroup.status = 'completed';
    dailyGroup.currentStep = 'Completed';
    dailyGroup.completedAt = group.completedAt;
    dailyGroup.error = undefined;

    persist();
}

export function failPipelineRun(error: string): void {
    if (!state.currentRun) {
        return;
    }

    const finishedAt = nowIso();
    const currentGroup = state.currentRun.currentGroupKey
        ? state.currentRun.groups.find((item) => item.key === state.currentRun!.currentGroupKey)
        : null;

    if (currentGroup && currentGroup.status === 'running') {
        currentGroup.status = 'failed';
        currentGroup.error = error;
        currentGroup.currentStep = 'Failed';
        currentGroup.completedAt = finishedAt;

        const today = ensureTodayUsage(state.currentRun.dateKey);
        const dailyGroup = getDailyGroupEntry(today, currentGroup);
        dailyGroup.status = 'failed';
        dailyGroup.error = error;
        dailyGroup.currentStep = 'Failed';
        dailyGroup.completedAt = finishedAt;
        dailyGroup.lastRunAt = finishedAt;
    }

    const latestRun: PipelineRunMetrics = {
        ...state.currentRun,
        status: 'failed',
        currentStep: 'Failed',
        updatedAt: finishedAt,
        completedAt: finishedAt,
        durationSeconds: Number(((new Date(finishedAt).getTime() - new Date(state.currentRun.startedAt).getTime()) / 1000).toFixed(1)),
        error,
    };

    state.latestRun = latestRun;
    state.currentRun = null;
    persist();
}

export function completePipelineRun(): void {
    if (!state.currentRun) {
        return;
    }

    const finishedAt = nowIso();
    const latestRun: PipelineRunMetrics = {
        ...state.currentRun,
        status: 'completed',
        currentStep: 'Completed',
        completedGroups: state.currentRun.groups.filter((item) => item.status === 'completed').length,
        updatedAt: finishedAt,
        completedAt: finishedAt,
        durationSeconds: Number(((new Date(finishedAt).getTime() - new Date(state.currentRun.startedAt).getTime()) / 1000).toFixed(1)),
    };

    state.latestRun = latestRun;
    state.currentRun = null;

    const today = ensureTodayUsage(latestRun.dateKey);
    today.lastCompletedAt = finishedAt;

    persist();
}

export function failPipelineGroup(groupKey: string, error: string): void {
    if (!state.currentRun) {
        return;
    }

    const finishedAt = nowIso();
    const group = state.currentRun.groups.find((item) => item.key === groupKey);
    if (!group) {
        return;
    }

    group.status = 'failed';
    group.error = error;
    group.currentStep = 'Failed';
    group.completedAt = finishedAt;
    state.currentRun.updatedAt = finishedAt;

    const today = ensureTodayUsage(state.currentRun.dateKey);
    const dailyGroup = getDailyGroupEntry(today, group);
    dailyGroup.status = 'failed';
    dailyGroup.error = error;
    dailyGroup.currentStep = 'Failed';
    dailyGroup.completedAt = finishedAt;
    dailyGroup.lastRunAt = finishedAt;

    persist();
}

export function getPipelineMetricsSnapshot(): PipelineMetricsSnapshot {
    const dateKey = getOperationalDateKey();
    const today = state.history[dateKey] || createDailyUsage(dateKey);

    return {
        currentRun: state.currentRun,
        latestRun: state.latestRun,
        today,
        pricing: {
            inputCostPer1M: config.AZURE_INPUT_COST_PER_1M,
            outputCostPer1M: config.AZURE_OUTPUT_COST_PER_1M,
            costConfigured: config.AZURE_INPUT_COST_PER_1M > 0 || config.AZURE_OUTPUT_COST_PER_1M > 0,
        },
    };
}
