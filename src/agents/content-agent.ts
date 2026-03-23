import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';
import { getAudienceContext, getMarketContext, getPlatformOptions, getPromptGuardrails } from '../config/content-strategy.js';
import { getActiveContentModules, getTodayTopics, type ContentModule, type TopicItem } from '../config/topics.js';
import { scriptsSchema, type ScriptItem, type ArticleScripts } from './script-writer-agent.js';
import type { AudienceProfile, Language, MarketId } from '../store/client-store.js';
import { emptyUsage, normalizeUsage, type GenerationObserver, type TokenUsage } from '../telemetry/usage.js';

// ── Types ────────────────────────────────────────────────────
export interface ModuleOutput {
    moduleId: string;
    moduleName: string;
    moduleEmoji: string;
    articles: ArticleScripts[];
}

// ── Market display names ────────────────────────────────────
const MARKET_DISPLAY: Record<string, { zh: string; en: string }> = {
    'new-york': { zh: '纽约', en: 'New York' },
    'long-island': { zh: '纽约州长岛', en: 'Long Island' },
    'los-angeles': { zh: '洛杉矶', en: 'Los Angeles' },
    'san-francisco': { zh: '旧金山/湾区', en: 'San Francisco Bay Area' },
    'chicago': { zh: '芝加哥', en: 'Chicago' },
    'miami': { zh: '迈阿密', en: 'Miami' },
    'seattle': { zh: '西雅图', en: 'Seattle' },
    'boston': { zh: '波士顿', en: 'Boston' },
    'houston': { zh: '休斯顿', en: 'Houston' },
};

function getMarketName(market: MarketId, lang: Language): string {
    return MARKET_DISPLAY[market]?.[lang] || market;
}

function formatGuardrails(language: Language): string {
    return getPromptGuardrails(language)
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n');
}

function defaultAudienceProfile(language: Language): AudienceProfile {
    return language === 'zh' ? 'chinese-community' : 'general';
}

// ── Prompt ───────────────────────────────────────────────────
function buildTopicPrompt(
    topic: TopicItem,
    module: ContentModule,
    date: string,
    language: Language,
    market: MarketId,
    audienceProfile: AudienceProfile,
): string {
    const marketContext = getMarketContext(market, language);
    const audience = getAudienceContext(audienceProfile, language);
    const platformOptions = getPlatformOptions(audienceProfile, language);
    const [platformOne, platformTwo, platformThree, platformFour] = platformOptions;
    const mkt = getMarketName(market, language);
    const guardrails = formatGuardrails(language);

    if (language === 'en') {
        return `Today is ${date}.

You are a senior real estate content strategist building production-ready content for North American residential real estate agents.

Agent audience: ${audience.agentProfile}
Client audience they serve: ${audience.clientProfile}
Voice guidance: ${audience.voiceGuide}

Market context:
- Market: ${marketContext.marketName} (${marketContext.metroLabel})
- Neighborhood anchors: ${marketContext.neighborhoods.join(', ')}
- Housing mix: ${marketContext.housingMix}
- Demand drivers: ${marketContext.demandDrivers}
- Strong agent angles: ${marketContext.agentAngles}

Content module: ${module.emoji} ${module.name}
Module role: ${module.description}
Topic: ${topic.title}
Angle: ${topic.angle}
Keywords: ${topic.keywords.join(', ')}
Recommended platform mix: ${audience.platformMix.join(', ')}

Guardrails:
${guardrails}

Generate 4 styles:
1. **Professional Analysis (professional)** — formal, evidence-aware, and strategically useful for client education
2. **Casual Chat (casual)** — relaxed, friendly, like talking to a friend, for social media
3. **Investor Advisor (investor)** — investor perspective, focusing on returns, risk, and asset allocation
4. **Myth Buster (mythbuster)** — bold, direct, exposing industry insider tips and common misconceptions

Each script must include:
- **hook**: Opening hook (1-2 sentences, create suspense or curiosity)
- **content**: Main body (430-620 words, practical and easy to film, localized to ${mkt})
- **cta**: Call to action (1-2 sentences, drive follow/DM/comment)
- **platform**: Best platform (${platformOptions.map((item) => `"${item}"`).join(', ')}, cover at least 3 platforms)
- **duration**: Fixed "150 seconds" (about 2.5 minutes)
- **tags**: 5-7 hashtags

Output requirements:
- Make the scripts useful for a working real estate agent, not a generic finance influencer.
- Use local context from ${marketContext.marketName}, but never invent unsupported numbers, laws, or neighborhood facts.
- If the topic touches tax, legal, fair housing, or compliance issues, keep it high-level and practical.

Return ONLY JSON array (no markdown code blocks):
[
  {"style":"professional","styleName":"Professional Analysis","platform":"${platformFour}","duration":"150 seconds","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"casual","styleName":"Casual Chat","platform":"${platformOne}","duration":"150 seconds","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"investor","styleName":"Investor Advisor","platform":"${platformThree}","duration":"150 seconds","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"mythbuster","styleName":"Myth Buster","platform":"${platformTwo}","duration":"150 seconds","hook":"...","content":"...","cta":"...","tags":[...]}
]`;
    }

    return `今天是 ${date}。

你是一个为北美地产经纪人打造内容系统的资深策划师，擅长根据不同受众画像交付可直接拍摄的中文内容。

经纪人画像：${audience.agentProfile}
他们服务的客户：${audience.clientProfile}
语气要求：${audience.voiceGuide}

市场画像：
- 市场：${marketContext.marketName}（${marketContext.metroLabel}）
- 可提及的社区锚点：${marketContext.neighborhoods.join('、')}
- 房源结构：${marketContext.housingMix}
- 当前需求驱动：${marketContext.demandDrivers}
- 值得经纪人讲的角度：${marketContext.agentAngles}

内容模块：${module.emoji} ${module.name}
模块作用：${module.description}
话题：${topic.title}
创作角度：${topic.angle}
参考关键词：${topic.keywords.join(', ')}
推荐平台组合：${audience.platformMix.join('、')}

Guardrails：
${guardrails}

请生成 4 种风格的文案：
1. **专业分析型 (professional)** — 正式、信息密度高，适合做专业型客户教育
2. **轻松聊天型 (casual)** — 轻松亲切，像朋友聊天，适合社交媒体
3. **投资顾问型 (investor)** — 投资者视角，关注收益、风险和资产配置
4. **犀利避坑/揭秘型 (mythbuster)** — 犀利直接，揭示行业内幕和常见误区

每种文案必须包含：
- **hook**: 开场钩子（1-2句，制造悬念或好奇心）
- **content**: 主要内容（650-950字，实操、易拍摄，并适配${mkt}）
- **cta**: 行动号召（1-2句，引导关注/私信/评论）
- **platform**: 适合的平台（${platformOptions.map((item) => `"${item}"`).join('、')}，4条至少覆盖3个平台）
- **duration**: 固定为 "150秒"（约2分30秒）
- **tags**: 5-7个话题标签

额外要求：
- 内容要像真正北美在地经纪人会发的内容，不要写成泛财经号。
- 可以使用${marketContext.marketName}的本地语境，但不要编造没有依据的数字、法规和社区事实。
- 一旦涉及税务、法律、公平住房或合规，只能做高层次提醒和决策框架。

请严格返回 JSON 数组格式（不要 markdown 代码块）：
[
  {"style":"professional","styleName":"专业分析型","platform":"${platformFour}","duration":"150秒","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"casual","styleName":"轻松聊天型","platform":"${platformOne}","duration":"150秒","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"investor","styleName":"投资顾问型","platform":"${platformThree}","duration":"150秒","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"mythbuster","styleName":"犀利避坑/揭秘型","platform":"${platformTwo}","duration":"150秒","hook":"...","content":"...","cta":"...","tags":[...]}
]`;
}

// ── Call Azure OpenAI ────────────────────────────────────────
async function callAI(
    prompt: string,
    language: Language,
    market: MarketId,
    audienceProfile: AudienceProfile,
): Promise<{ content: string; usage: TokenUsage }> {
    let url = config.AZURE_OPENAI_ENDPOINT;
    if (!url.includes('/openai/')) {
        url = `${url.replace(/\/$/, '')}/openai/deployments/${config.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${config.AZURE_OPENAI_API_VERSION}`;
    }
    const isResponsesAPI = url.includes('/openai/responses');
    const mkt = getMarketName(market, language);
    const audience = getAudienceContext(audienceProfile, language);
    const system = language === 'en'
        ? `You are a senior real estate content strategist specializing in ${mkt}. You create filming-ready scripts for ${audience.agentProfile} and must keep every claim useful, local, and grounded. Return ONLY valid JSON.`
        : `你是${mkt}地产领域的资深内容策划师，专门为${audience.agentProfile}创作内容。你必须保持内容真实、在地、可拍摄，并只返回 JSON 格式。`;

    if (isResponsesAPI) {
        try {
            const res = await axios.post(url, {
                model: config.AZURE_OPENAI_DEPLOYMENT,
                input: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
            }, { headers: { 'api-key': config.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json' }, timeout: 120000 });
            const output = res.data?.output;
            if (!output || !Array.isArray(output)) throw new Error('Empty output');
            const msg = output.find((o: any) => o.type === 'message');
            const text = msg?.content?.[0]?.text;
            if (!text) throw new Error('No text in response');
            return {
                content: text,
                usage: normalizeUsage(res.data),
            };
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.message || String(err);
            throw new Error(`Azure OpenAI API error: ${msg}`);
        }
    } else {
        try {
            const res = await axios.post(url, {
                messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
            }, { headers: { 'api-key': config.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json' }, timeout: 120000 });
            const text = res.data?.choices?.[0]?.message?.content;
            if (!text) throw new Error('Empty response');
            return {
                content: text,
                usage: normalizeUsage(res.data),
            };
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.message || String(err);
            throw new Error(`Azure OpenAI API error: ${msg}`);
        }
    }
}

function parseScripts(raw: string): ScriptItem[] {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return scriptsSchema.parse(JSON.parse(cleaned)) as ScriptItem[];
}

// ── Generate content for all modules ────────────────────────
async function generateModuleContent(
    dateStr: string,
    activeModules: ContentModule[],
    language: Language = 'zh',
    market: MarketId = 'new-york',
    audienceProfile: AudienceProfile = defaultAudienceProfile(language),
    observer?: GenerationObserver,
): Promise<ModuleOutput[]> {
    const today = language === 'en'
        ? new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            timeZone: 'America/New_York',
        })
        : new Date().toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            timeZone: 'America/New_York',
        });

    const results: ModuleOutput[] = [];

    for (const module of activeModules) {
        const topics = getTodayTopics(module, dateStr);
        logger.info(`\n${module.emoji} Module: ${module.name} — ${topics.length} topic(s) today [${language}/${market}/${audienceProfile}]`);

        const articles: ArticleScripts[] = [];

        for (const topic of topics) {
            logger.info(`   ✍️  Generating: ${topic.title}...`);
            observer?.onStep?.(`${module.name} · ${topic.title}`);

            try {
                const prompt = buildTopicPrompt(topic, module, today, language, market, audienceProfile);
                const result = await retry(
                    async () => callAI(prompt, language, market, audienceProfile),
                    { retries: 2, delayMs: 3000, label: topic.title }
                );
                const scripts = parseScripts(result.content);
                logger.info(`   ✅ Got ${scripts.length} scripts`);
                observer?.onUsage?.(result.usage || emptyUsage(), {
                    itemLabel: topic.title,
                    step: `${module.name} · ${topic.title}`,
                    scriptsGenerated: scripts.length,
                });
                articles.push({
                    title: topic.title,
                    source: `${module.emoji} ${module.name}`,
                    url: '',
                    scripts,
                });
            } catch (err: any) {
                logger.error(`   ❌ Failed: ${topic.title}`, { error: err.message });
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 2000));
        }

        results.push({
            moduleId: module.id,
            moduleName: module.name,
            moduleEmoji: module.emoji,
            articles,
        });
    }

    const totalScripts = results.reduce((s, m) => s + m.articles.reduce((s2, a) => s2 + a.scripts.length, 0), 0);
    logger.info(`\n🎉 Content modules: ${totalScripts} scripts generated across ${results.length} modules [${language}/${market}/${audienceProfile}]`);

    return results;
}

export async function generateAllModuleContent(
    dateStr: string,
    language: Language = 'zh',
    market: MarketId = 'new-york',
    audienceProfile: AudienceProfile = defaultAudienceProfile(language),
    observer?: GenerationObserver,
): Promise<ModuleOutput[]> {
    const activeModules = getActiveContentModules(language, market, audienceProfile);
    return generateModuleContent(dateStr, activeModules, language, market, audienceProfile, observer);
}

export async function generateSelectedModuleContent(
    dateStr: string,
    moduleIds: string[],
    language: Language = 'zh',
    market: MarketId = 'new-york',
    audienceProfile: AudienceProfile = defaultAudienceProfile(language),
    observer?: GenerationObserver,
): Promise<ModuleOutput[]> {
    const moduleIdSet = new Set(moduleIds);
    const activeModules = getActiveContentModules(language, market, audienceProfile);
    const selectedModules = activeModules.filter((module) => moduleIdSet.has(module.id));
    const fallbackModules = selectedModules.length > 0 ? selectedModules : activeModules.slice(0, 2);
    return generateModuleContent(dateStr, fallbackModules, language, market, audienceProfile, observer);
}
