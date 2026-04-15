import axios from 'axios';
import { z } from 'zod';
import { config } from '../config/index.js';
import { getAudienceContext, getMarketContext, getPlatformOptions, getPromptGuardrails } from '../config/content-strategy.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';
import type { NewsArticle } from './news-agent.js';
import type { AudienceProfile, Language, MarketId } from '../store/client-store.js';
import { emptyUsage, normalizeUsage, type GenerationObserver, type TokenUsage } from '../telemetry/usage.js';

// ── Types ────────────────────────────────────────────────────
export interface ScriptItem {
    style: string;
    styleName: string;
    platform: string;
    duration: string;
    hook: string;
    content: string;
    cta: string;
    tags: string[];
}

export interface ArticleScripts {
    title: string;
    source: string;
    url: string;
    scripts: ScriptItem[];
}

export interface DailyOutput {
    key: string;
    date: string;
    generatedAt: string;
    language: Language;
    market: MarketId;
    audienceProfile: AudienceProfile;
    articleCount: number;
    articles: ArticleScripts[];
    modules?: import('./content-agent.js').ModuleOutput[];
}

export const scriptSchema = z.object({
    style: z.enum(['professional', 'casual', 'investor', 'mythbuster']),
    styleName: z.string().min(1).max(80),
    platform: z.string().min(1).max(40),
    duration: z.string().min(1).max(40),
    hook: z.string().min(1).max(800),
    content: z.string().min(1).max(6000),
    cta: z.string().min(1).max(800),
    tags: z.array(z.string().min(1).max(40)).min(3).max(8),
});

export const scriptsSchema = z.array(scriptSchema).length(4);

// ── Market display names ────────────────────────────────────
const MARKET_DISPLAY: Record<string, { zh: string; en: string }> = {
    'new-york': { zh: '纽约', en: 'New York' },
    'long-island': { zh: '纽约州长岛', en: 'Long Island' },
    'los-angeles': { zh: '洛杉矶', en: 'Los Angeles' },
    'san-francisco': { zh: '旧金山/湾区', en: 'San Francisco Bay Area' },
    'chicago': { zh: '芝加哥', en: 'Chicago' },
    'miami': { zh: '迈阿密/南佛罗里达', en: 'Miami / South Florida' },
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
function buildPrompt(article: NewsArticle, date: string, language: Language, market: MarketId, audienceProfile: AudienceProfile): string {
    const mkt = getMarketName(market, language);
    const marketContext = getMarketContext(market, language);
    const audience = getAudienceContext(audienceProfile, language);
    const platformOptions = getPlatformOptions(audienceProfile, language);
    const [platformOne, platformTwo, platformThree, platformFour] = platformOptions;
    const guardrails = formatGuardrails(language);

    if (language === 'en') {
        return `Today is ${date}.

You are a senior real estate content strategist creating daily filming-ready scripts for North American residential real estate agents.

Agent audience: ${audience.agentProfile}
Client audience they serve: ${audience.clientProfile}
Voice guidance: ${audience.voiceGuide}

Market context:
- Market: ${marketContext.marketName} (${marketContext.metroLabel})
- Neighborhood anchors: ${marketContext.neighborhoods.join(', ')}
- Housing mix: ${marketContext.housingMix}
- Demand drivers: ${marketContext.demandDrivers}
- Strong agent angles: ${marketContext.agentAngles}

News Title: ${article.title}
News Source: ${article.source}
News Summary: ${article.description || '(no summary)'}
News Link: ${article.url}
Recommended platform mix: ${audience.platformMix.join(', ')}

Guardrails:
${guardrails}

Generate 4 styles, each representing a different positioning:

1. **Professional Analysis (professional)** — formal, data-driven, suitable for market analysis
2. **Casual Chat (casual)** — relaxed conversational style, for social media
3. **Investor Advisor (investor)** — investor perspective, focusing on returns and risk
4. **Myth Buster (mythbuster)** — bold, direct, exposing hidden risks and pitfalls

Each script must include:
- **hook**: Opening hook (1-2 sentences, attention-grabbing)
- **content**: Main body (280-420 words, practical and easy to film, localized to ${mkt})
- **cta**: Call to action (1-2 sentences, drive engagement)
- **platform**: Best platform (${platformOptions.map((item) => `"${item}"`).join(', ')}, cover at least 3 platforms)
- **duration**: Fixed "100 seconds" (about 1.5 minutes)
- **tags**: 5-7 relevant hashtags

Output requirements:
- Base factual claims on the article. If the source does not provide hard data, use agent interpretation instead of fabricated numbers.
- Tie the story back to ${marketContext.marketName} using the provided market context, but do not invent local laws or exact neighborhood facts.
- If the topic touches tax, legal process, fair housing, or compliance, keep the explanation high-level and practical.

Return ONLY this JSON array (no markdown code blocks):
[
  {"style":"professional","styleName":"Professional Analysis","platform":"${platformFour}","duration":"100 seconds","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"casual","styleName":"Casual Chat","platform":"${platformOne}","duration":"100 seconds","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"investor","styleName":"Investor Advisor","platform":"${platformThree}","duration":"100 seconds","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"mythbuster","styleName":"Myth Buster","platform":"${platformTwo}","duration":"100 seconds","hook":"...","content":"...","cta":"...","tags":[...]}
]`;
    }

    return `今天是 ${date}。

你是一个为北美地产经纪人打造日常内容系统的资深策划师，擅长根据不同受众画像交付可直接拍摄的中文内容。

经纪人画像：${audience.agentProfile}
他们服务的客户：${audience.clientProfile}
语气要求：${audience.voiceGuide}

市场画像：
- 市场：${marketContext.marketName}（${marketContext.metroLabel}）
- 可提及的社区锚点：${marketContext.neighborhoods.join('、')}
- 房源结构：${marketContext.housingMix}
- 当前需求驱动：${marketContext.demandDrivers}
- 值得经纪人讲的角度：${marketContext.agentAngles}

新闻标题：${article.title}
新闻来源：${article.source}
新闻摘要：${article.description || '(无摘要)'}
新闻链接：${article.url}
推荐平台组合：${audience.platformMix.join('、')}

Guardrails：
${guardrails}

请生成 4 种风格的文案，每种风格代表不同的定位：

1. **专业分析型 (professional)** — 正式、数据驱动，适合专业市场分析
2. **轻松聊天型 (casual)** — 轻松对话风格，适合社交媒体传播
3. **投资顾问型 (investor)** — 投资者视角，关注收益和风险
4. **犀利避坑/揭秘型 (mythbuster)** — 犀利直接，揭示隐藏风险和避坑指南

每种风格的文案必须包含：
- **hook**: 开场钩子（1-2句话，吸引眼球）
- **content**: 主要内容（450-650字，实操、易拍摄，并适配${mkt}）
- **cta**: 行动号召（1-2句话，引导互动）
- **platform**: 适合的平台（${platformOptions.map((item) => `"${item}"`).join('、')}，4条文案至少覆盖3个不同平台）
- **duration**: 固定为 "100秒"（约1分40秒）
- **tags**: 5-7个相关话题标签

额外要求：
- 所有内容应以新闻原始输入为事实基础；没有提供的数字和法规，不要自行编造。
- 可以用${marketContext.marketName}的本地语境来解释影响，但不要臆造具体社区事实。
- 涉及税务、法律、公平住房或合规时，只能做高层次提醒和决策框架。

请严格按照以下 JSON 格式返回（不要添加 markdown 代码块标记）：
[
  {"style":"professional","styleName":"专业分析型","platform":"${platformFour}","duration":"100秒","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"casual","styleName":"轻松聊天型","platform":"${platformOne}","duration":"100秒","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"investor","styleName":"投资顾问型","platform":"${platformThree}","duration":"100秒","hook":"...","content":"...","cta":"...","tags":[...]},
  {"style":"mythbuster","styleName":"犀利避坑/揭秘型","platform":"${platformTwo}","duration":"100秒","hook":"...","content":"...","cta":"...","tags":[...]}
]`;
}

// ── Call Azure OpenAI ────────────────────────────────────────
async function callAzureOpenAI(
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

    const systemPrompt = language === 'en'
        ? `You are a senior real estate content strategist specializing in ${mkt}. You create filming-ready scripts for ${audience.agentProfile} and must keep every claim commercially useful, local, and grounded in provided facts. Return ONLY valid JSON.`
        : `你是一个${mkt}地产领域的资深内容策划师，专门为${audience.agentProfile}创作短视频口播文案。你必须保持内容真实、在地、可拍摄，并严格基于提供的信息。请务必只返回 JSON 格式。`;

    if (isResponsesAPI) {
        try {
            const response = await axios.post(url, {
                model: config.AZURE_OPENAI_DEPLOYMENT,
                input: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                ],
            }, {
                headers: { 'api-key': config.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json' },
                timeout: 120000,
            });

            const output = response.data?.output;
            if (!output || !Array.isArray(output)) throw new Error('Empty output from API');
            const messageOutput = output.find((o: any) => o.type === 'message');
            const content = messageOutput?.content?.[0]?.text;
            if (!content) throw new Error('No text in response');
            return {
                content,
                usage: normalizeUsage(response.data),
            };
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.message || String(err);
            throw new Error(`Azure OpenAI API error: ${msg}`);
        }
    } else {
        try {
            const response = await axios.post(url, {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                ],
            }, {
                headers: { 'api-key': config.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json' },
                timeout: 120000,
            });
            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) throw new Error('Empty response from API');
            return {
                content,
                usage: normalizeUsage(response.data),
            };
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.message || String(err);
            throw new Error(`Azure OpenAI API error: ${msg}`);
        }
    }
}

// ── Parse JSON from AI response ─────────────────────────────
function parseScripts(raw: string): ScriptItem[] {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
        cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }

    const tryParse = (value: string) => scriptsSchema.parse(JSON.parse(value)) as ScriptItem[];

    try {
        return tryParse(cleaned);
    } catch (error) {
        const normalized = cleaned
            .replace(/[\u2018\u2019]/g, '\'')
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/,\s*([\]}])/g, '$1');

        if (normalized !== cleaned) {
            return tryParse(normalized);
        }

        throw error;
    }
}

// ── Generate scripts for one article ────────────────────────
async function generateForArticle(
    article: NewsArticle,
    date: string,
    index: number,
    total: number,
    language: Language = 'zh',
    market: MarketId = 'new-york',
    audienceProfile: AudienceProfile = defaultAudienceProfile(language),
    observer?: GenerationObserver,
): Promise<{ article: ArticleScripts; usage: TokenUsage }> {
    logger.info(`✍️  [${index + 1}/${total}] Generating 4 scripts for: ${article.title.substring(0, 50)}... (${language}/${market}/${audienceProfile})`);
    observer?.onStep?.(`新闻 ${index + 1}/${total} · ${article.title}`);

    const prompt = buildPrompt(article, date, language, market, audienceProfile);

    const result = await retry(
        async () => {
            const response = await callAzureOpenAI(prompt, language, market, audienceProfile);
            const scripts = parseScripts(response.content);
            return {
                usage: response.usage || emptyUsage(),
                scripts,
            };
        },
        { retries: 3, delayMs: 3000, label: `Scripts for article ${index + 1}` }
    );

    const scripts = result.scripts;
    logger.info(`   ✅ Got ${scripts.length} style scripts`);
    observer?.onUsage?.(result.usage, {
        itemLabel: article.title,
        step: `新闻 ${index + 1}/${total}`,
        scriptsGenerated: scripts.length,
    });

    return {
        article: {
            title: article.title,
            source: article.source,
            url: article.url,
            scripts,
        },
        usage: result.usage || emptyUsage(),
    };
}

// ── Generate all scripts for all articles ───────────────────
export async function generateDailyScripts(
    articles: NewsArticle[],
    maxArticles: number = 7,
    language: Language = 'zh',
    market: MarketId = 'new-york',
    audienceProfile: AudienceProfile = defaultAudienceProfile(language),
    observer?: GenerationObserver,
): Promise<DailyOutput> {
    const today = language === 'en'
        ? new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            timeZone: 'America/New_York',
        })
        : new Date().toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            timeZone: 'America/New_York',
        });

    // Pick top N articles
    const selected = articles.slice(0, maxArticles);

    logger.info(`📝 Generating scripts for ${selected.length} articles × 4 styles (${language}/${market}/${audienceProfile})...`);

    const results: ArticleScripts[] = [];

    for (let i = 0; i < selected.length; i++) {
        try {
            const result = await generateForArticle(selected[i], today, i, selected.length, language, market, audienceProfile, observer);
            results.push(result.article);
        } catch (error) {
            logger.error(`❌ Skipping article ${i + 1}/${selected.length} after repeated parse/generation failure`, {
                title: selected[i].title,
                error: error instanceof Error ? error.message : String(error),
            });
            observer?.onStep?.(`新闻 ${i + 1}/${selected.length} 失败，已跳过`);
        }

        // Delay between calls to avoid rate limiting
        if (i < selected.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    const output: DailyOutput = {
        key: '',
        date: new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        language,
        market,
        audienceProfile,
        articleCount: results.length,
        articles: results,
    };

    const totalScripts = results.reduce((sum, a) => sum + a.scripts.length, 0);
    logger.info(`🎉 Generated ${totalScripts} total scripts (${results.length} articles × 4 styles) [${language}/${market}/${audienceProfile}]`);

    return output;
}
