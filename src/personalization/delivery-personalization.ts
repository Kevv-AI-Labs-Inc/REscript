import type { ModuleOutput } from '../agents/content-agent.js';
import type { ArticleScripts, DailyOutput } from '../agents/script-writer-agent.js';
import { normalizePersonalizationKeywords, type Client, type Language } from '../store/client-store.js';

type CtaFocus = 'buyer' | 'seller' | 'investor' | 'general';

export interface DeliveryPersonalization {
    output: DailyOutput;
    personalizationKeywords: string[];
    subjectKeywords: string[];
    focusSummary: string | null;
    ctaHint: string | null;
    ctaFocus: CtaFocus;
}

const BUYER_TERMS = ['buyer', 'school', 'schools', 'relocation', 'move-up', 'first-time', 'commute', '学区', '搬迁', '通勤', '买家', '首次置业'];
const SELLER_TERMS = ['seller', 'listing', 'downsizing', 'staging', 'pricing', 'inventory', '卖家', '挂牌', '定价', '置换', '库存'];
const INVESTOR_TERMS = ['investor', 'rent', 'cash flow', 'cap rate', 'yield', 'landlord', '投资', '租金', '现金流', '回报', '出租'];

function normalizeText(value: unknown): string {
    return String(value || '').toLowerCase();
}

function cloneArticle(article: ArticleScripts): ArticleScripts {
    return {
        ...article,
        scripts: article.scripts.map((script) => ({
            ...script,
            tags: Array.isArray(script.tags) ? [...script.tags] : [],
        })),
    };
}

function cloneModule(module: ModuleOutput): ModuleOutput {
    return {
        ...module,
        articles: module.articles.map(cloneArticle),
    };
}

function includesKeyword(text: string, keyword: string): boolean {
    return text.includes(keyword);
}

function scoreArticle(article: ArticleScripts, keywords: string[], moduleName = ''): number {
    if (!keywords.length) {
        return 0;
    }

    const titleText = `${normalizeText(article.title)} ${normalizeText(moduleName)}`;
    const sourceText = normalizeText(article.source);
    const tagsText = normalizeText(article.scripts.flatMap((script) => script.tags || []).join(' '));
    const hookText = normalizeText(article.scripts.map((script) => script.hook).join(' '));
    const ctaText = normalizeText(article.scripts.map((script) => script.cta).join(' '));
    const contentText = normalizeText(article.scripts.map((script) => script.content).join(' '));

    let score = 0;
    for (const keyword of keywords) {
        if (includesKeyword(titleText, keyword)) {
            score += 4;
        }
        if (includesKeyword(tagsText, keyword)) {
            score += 3;
        }
        if (includesKeyword(hookText, keyword)) {
            score += 2;
        }
        if (includesKeyword(ctaText, keyword)) {
            score += 2;
        }
        if (includesKeyword(sourceText, keyword)) {
            score += 1;
        }
        if (includesKeyword(contentText, keyword)) {
            score += 1;
        }
    }

    return score;
}

function sortArticles(articles: ArticleScripts[], keywords: string[], moduleName?: string): ArticleScripts[] {
    return articles
        .map((article, index) => ({
            article: cloneArticle(article),
            index,
            score: scoreArticle(article, keywords, moduleName),
        }))
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            return left.index - right.index;
        })
        .map((item) => item.article);
}

function sortModules(modules: ModuleOutput[], keywords: string[]): ModuleOutput[] {
    return modules
        .map((module, index) => {
            const sortedArticles = sortArticles(module.articles, keywords, module.moduleName);
            const maxScore = sortedArticles.reduce((highest, article) => (
                Math.max(highest, scoreArticle(article, keywords, module.moduleName))
            ), 0);

            return {
                module: {
                    ...module,
                    articles: sortedArticles,
                },
                index,
                score: maxScore,
            };
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            return left.index - right.index;
        })
        .map((item) => item.module);
}

function detectCtaFocus(keywords: string[]): CtaFocus {
    const counts = {
        buyer: 0,
        seller: 0,
        investor: 0,
    };

    for (const keyword of keywords) {
        if (BUYER_TERMS.some((term) => keyword.includes(term))) {
            counts.buyer += 1;
        }
        if (SELLER_TERMS.some((term) => keyword.includes(term))) {
            counts.seller += 1;
        }
        if (INVESTOR_TERMS.some((term) => keyword.includes(term))) {
            counts.investor += 1;
        }
    }

    const ordered = (Object.entries(counts) as [Exclude<CtaFocus, 'general'>, number][])
        .sort((left, right) => right[1] - left[1]);

    if (!ordered[0] || ordered[0][1] === 0) {
        return 'general';
    }
    return ordered[0][0];
}

function formatFocusSummary(language: Language, keywords: string[]): string | null {
    if (!keywords.length) {
        return null;
    }

    return keywords.slice(0, 3).join(', ');
}

function formatCtaHint(language: Language, focus: CtaFocus): string | null {
    if (focus === 'buyer') {
        return language === 'en'
            ? 'CTA angle today: lean into buyer education, school-district questions, and relocation clarity.'
            : '今日 CTA 角度：更偏买家教育、学区问题与搬迁决策解释。';
    }
    if (focus === 'seller') {
        return language === 'en'
            ? 'CTA angle today: lean into seller timing, listing prep, and pricing conversations.'
            : '今日 CTA 角度：更偏卖家时机、挂牌准备与定价沟通。';
    }
    if (focus === 'investor') {
        return language === 'en'
            ? 'CTA angle today: lean into investor returns, rent math, and risk framing.'
            : '今日 CTA 角度：更偏投资回报、租金测算与风险框架。';
    }
    return language === 'en'
        ? 'CTA angle today: keep the close practical and local to your current audience mix.'
        : '今日 CTA 角度：优先保持在地、实操、贴近你当前受众。';
}

export function personalizeOutputForClient(
    client: Client,
    output: DailyOutput,
    options: { includeFree?: boolean } = {},
): DeliveryPersonalization {
    const personalizationKeywords = normalizePersonalizationKeywords(client.personalizationKeywords);
    const shouldPersonalize = personalizationKeywords.length > 0 && (options.includeFree || client.plan !== 'free');

    if (!shouldPersonalize) {
        return {
            output,
            personalizationKeywords: [],
            subjectKeywords: [],
            focusSummary: null,
            ctaHint: null,
            ctaFocus: 'general',
        };
    }

    const subjectKeywords = personalizationKeywords.slice(0, 2);
    const articles = sortArticles(output.articles, personalizationKeywords);
    const modules = output.modules ? sortModules(output.modules, personalizationKeywords) : undefined;
    const ctaFocus = detectCtaFocus(personalizationKeywords);

    return {
        output: {
            ...output,
            articles,
            modules,
        },
        personalizationKeywords,
        subjectKeywords,
        focusSummary: formatFocusSummary(client.language, personalizationKeywords),
        ctaHint: formatCtaHint(client.language, ctaFocus),
        ctaFocus,
    };
}
