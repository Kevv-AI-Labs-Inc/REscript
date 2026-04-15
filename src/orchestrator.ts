import { searchNews } from './agents/news-agent.js';
import { generateDailyScripts } from './agents/script-writer-agent.js';
import { generateAllModuleContent, generateSelectedModuleContent } from './agents/content-agent.js';
import { sendBatchEmails } from './agents/email-agent.js';
import { getSubscribers, getVipClients, type AudienceProfile, type Client, type Language, type MarketId } from './store/client-store.js';
import { getDailyOutput, getLatestOutputForPreferences, saveDailyOutput, type OutputSummary } from './store/output-store.js';
import {
    completePipelineGroup,
    failPipelineGroup,
    completePipelineRun,
    failPipelineRun,
    recordPipelineEmailResults,
    recordPipelineUsage,
    startPipelineGroup,
    startPipelineRunMetrics,
    updatePipelineGroupPlan,
    updatePipelineGroupStep,
    updatePipelineRunStep,
    type PipelineTrigger,
} from './store/pipeline-metrics-store.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { getActiveContentModules, getTodayTopics } from './config/topics.js';

interface ClientGroup {
    language: Language;
    market: MarketId;
    audienceProfile: AudienceProfile;
    clients: Client[];
}

let activeRun: Promise<void> | null = null;
const instantSampleRuns = new Map<string, Promise<OutputSummary>>();
const INSTANT_SAMPLE_MODULES: Record<AudienceProfile, string[]> = {
    general: ['market-playbooks', 'buyer-strategy'],
    'chinese-community': ['market-playbooks', 'bilingual-and-relocation'],
};

function groupByPreferences(clients: Client[]): ClientGroup[] {
    const map = new Map<string, ClientGroup>();
    for (const client of clients) {
        const key = `${client.language}|${client.market}|${client.audienceProfile}`;
        if (!map.has(key)) {
            map.set(key, {
                language: client.language,
                market: client.market,
                audienceProfile: client.audienceProfile,
                clients: [],
            });
        }
        map.get(key)!.clients.push(client);
    }
    return Array.from(map.values());
}

function getBaseUrl(): string {
    return config.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${process.env.PORT || 3000}`);
}

function buildPreferenceKey(language: Language, market: MarketId, audienceProfile: AudienceProfile): string {
    return `${language}|${market}|${audienceProfile}`;
}

function getTodayDateKey(): string {
    return new Date().toISOString().split('T')[0];
}

async function generateInstantSampleOutputInternal(
    language: Language,
    market: MarketId,
    audienceProfile: AudienceProfile,
): Promise<OutputSummary> {
    logger.info(`⚡ Generating instant sample for ${language}/${market}/${audienceProfile}...`);
    const articles = await searchNews(market);
    const dailyOutput = await generateDailyScripts(articles, 1, language, market, audienceProfile);
    const dateStr = getTodayDateKey();
    dailyOutput.modules = await generateSelectedModuleContent(
        dateStr,
        INSTANT_SAMPLE_MODULES[audienceProfile],
        language,
        market,
        audienceProfile,
    );
    return saveDailyOutput(dailyOutput);
}

export async function getOrGenerateInstantSampleOutput(
    language: Language,
    market: MarketId,
    audienceProfile: AudienceProfile,
) {
    const latestOutputSummary = getLatestOutputForPreferences(language, market, audienceProfile);
    const todayKey = getTodayDateKey();
    if (latestOutputSummary?.date === todayKey) {
        const latestOutput = getDailyOutput(latestOutputSummary.key);
        if (latestOutput) {
            return latestOutput;
        }
    }

    const preferenceKey = buildPreferenceKey(language, market, audienceProfile);
    const activeRunForPreference = instantSampleRuns.get(preferenceKey);
    if (activeRunForPreference) {
        const summary = await activeRunForPreference;
        const output = getDailyOutput(summary.key);
        if (output) {
            return output;
        }
    }

    const nextRun = generateInstantSampleOutputInternal(language, market, audienceProfile)
        .finally(() => {
            instantSampleRuns.delete(preferenceKey);
        });
    instantSampleRuns.set(preferenceKey, nextRun);

    const summary = await nextRun;
    const output = getDailyOutput(summary.key);
    if (!output) {
        throw new Error(`Instant sample output missing after generation: ${summary.key}`);
    }
    return output;
}

async function runPipelineInternal(dryRun = false, trigger: PipelineTrigger = 'scheduled'): Promise<void> {
    const startTime = Date.now();
    logger.info('🚀 ═══════════════════════════════════════════');
    logger.info('🚀 RE AI Agents Pipeline Starting...');
    logger.info(`🚀 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'} · Trigger: ${trigger}`);
    logger.info('🚀 ═══════════════════════════════════════════');

    try {
        const subscribers = getSubscribers();
        const vipClients = getVipClients();
        const allRecipients = [...subscribers, ...vipClients];

        if (allRecipients.length === 0) {
            logger.warn('⚠️  No recipients found (0 subscribers, 0 VIP).');
            return;
        }

        logger.info(`👥 Recipients: ${subscribers.length} subscribers + ${vipClients.length} VIP = ${allRecipients.length} total`);

        const groups = groupByPreferences(allRecipients);
        logger.info(`📊 Preference groups: ${groups.map((group) => `${group.language}/${group.market}/${group.audienceProfile}(${group.clients.length})`).join(', ')}`);
        const dateStr = new Date().toISOString().split('T')[0];
        startPipelineRunMetrics({
            trigger,
            dryRun,
            totalRecipients: allRecipients.length,
            subscriberCount: subscribers.length,
            vipCount: vipClients.length,
            groups: groups.map((group) => {
                const activeModules = getActiveContentModules(group.language, group.market, group.audienceProfile);
                const moduleCallsPlanned = activeModules.reduce((sum, module) => sum + getTodayTopics(module, dateStr).length, 0);
                return {
                    language: group.language,
                    market: group.market,
                    audienceProfile: group.audienceProfile,
                    recipientCount: group.clients.length,
                    subscriberCount: group.clients.filter((client) => client.plan === 'subscriber').length,
                    vipCount: group.clients.filter((client) => client.plan === 'vip').length,
                    plannedCalls: 3 + moduleCallsPlanned,
                };
            }),
        });
        updatePipelineRunStep(`Preparing ${groups.length} preference groups`);

        const baseUrl = getBaseUrl();
        let totalNewsScripts = 0;
        let totalModuleScripts = 0;
        const failedGroups: string[] = [];

        for (const group of groups) {
            const { language, market, audienceProfile, clients } = group;
            const payingClients = clients.filter((client) => client.plan === 'subscriber' || client.plan === 'vip');
            const groupKey = buildPreferenceKey(language, market, audienceProfile);

            logger.info(`\n🌐 ═══ Processing group: ${language}/${market}/${audienceProfile} (${payingClients.length} subs/VIP) ═══`);
            startPipelineGroup(groupKey, `Preparing ${language}/${market}/${audienceProfile}`);
            try {
                logger.info(`📰 Searching news for ${market}...`);
                updatePipelineGroupStep(groupKey, `Searching news for ${market}`);
                const articles = await searchNews(market);
                logger.info(`📰 Found ${articles.length} articles`);
                const activeModules = getActiveContentModules(language, market, audienceProfile);
                const moduleCallsPlanned = activeModules.reduce((sum, module) => sum + getTodayTopics(module, dateStr).length, 0);
                updatePipelineGroupPlan(groupKey, Math.min(3, articles.length) + moduleCallsPlanned);

                logger.info(`✍️  Generating news scripts (${language}/${audienceProfile})...`);
                updatePipelineGroupStep(groupKey, `Generating 3 news packs for ${market}`);
                const dailyOutput = await generateDailyScripts(articles, 3, language, market, audienceProfile, {
                    onStep: (step) => updatePipelineGroupStep(groupKey, step),
                    onUsage: (usage, meta) => recordPipelineUsage(groupKey, usage, { scriptsGenerated: meta?.scriptsGenerated }),
                });

                logger.info(`📚 Generating content module scripts (${language}/${market}/${audienceProfile})...`);
                updatePipelineGroupStep(groupKey, `Generating module playbooks for ${market}`);
                const modules = await generateAllModuleContent(dateStr, language, market, audienceProfile, {
                    onStep: (step) => updatePipelineGroupStep(groupKey, step),
                    onUsage: (usage, meta) => recordPipelineUsage(groupKey, usage, { scriptsGenerated: meta?.scriptsGenerated }),
                });
                dailyOutput.modules = modules;

                const savedOutput = saveDailyOutput(dailyOutput);
                dailyOutput.key = savedOutput.key;

                const newsScripts = dailyOutput.articles.reduce((sum, article) => sum + article.scripts.length, 0);
                const moduleScripts = modules.reduce((sum, module) => sum + module.articles.reduce((inner, article) => inner + article.scripts.length, 0), 0);
                totalNewsScripts += newsScripts;
                totalModuleScripts += moduleScripts;

                if (payingClients.length > 0) {
                    logger.info(`  💳 Sending to ${payingClients.length} subscribers/VIP...`);
                    updatePipelineGroupStep(groupKey, `Sending to ${payingClients.length} subscriber/VIP recipients`);
                    const subscriberResult = await sendBatchEmails(payingClients, dailyOutput, baseUrl, dryRun, false);
                    recordPipelineEmailResults(groupKey, subscriberResult.sent, subscriberResult.failed);
                    logger.info(`  💳 Subscribers/VIP: ${subscriberResult.sent} sent, ${subscriberResult.failed} failed`);
                }

                completePipelineGroup(groupKey);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                failedGroups.push(`${language}/${market}/${audienceProfile}: ${message}`);
                failPipelineGroup(groupKey, message);
                logger.error(`💥 Group failed, continuing to next group`, {
                    group: `${language}/${market}/${audienceProfile}`,
                    error: message,
                });
                continue;
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (failedGroups.length > 0) {
            failPipelineRun(`${failedGroups.length} group(s) failed. Latest: ${failedGroups[failedGroups.length - 1]}`);
        } else {
            completePipelineRun();
        }
        logger.info('\n🎉 ═══════════════════════════════════════════');
        logger.info(`🎉 Pipeline completed in ${elapsed}s`);
        logger.info(`🎉 Groups processed: ${groups.length}`);
        logger.info(`🎉 Total scripts: ${totalNewsScripts + totalModuleScripts} (news: ${totalNewsScripts}, modules: ${totalModuleScripts})`);
        logger.info(`🎉 Sent to: ${subscribers.length} subscribers + ${vipClients.length} VIP`);
        if (failedGroups.length > 0) {
            logger.warn(`🎉 Pipeline completed with ${failedGroups.length} failed group(s)`, { failedGroups });
        }
        logger.info('🎉 ═══════════════════════════════════════════');
    } catch (error) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        failPipelineRun(error instanceof Error ? error.message : String(error));
        logger.error(`💥 Pipeline failed after ${elapsed}s`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}

export function isPipelineRunning(): boolean {
    return activeRun !== null;
}

export function getBaseAppUrl(): string {
    return getBaseUrl();
}

export async function runPipeline(dryRun = false, trigger: PipelineTrigger = 'scheduled'): Promise<void> {
    if (activeRun) {
        throw new Error('Pipeline is already running');
    }

    activeRun = runPipelineInternal(dryRun, trigger).finally(() => {
        activeRun = null;
    });

    return activeRun;
}
