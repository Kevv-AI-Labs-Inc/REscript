import axios from 'axios';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';
import { SUPPORTED_MARKETS, type MarketId } from '../store/client-store.js';

export interface NewsArticle {
    title: string;
    description: string;
    source: string;
    url: string;
    publishedAt: string;
}

// ── Google News RSS (Primary) ───────────────────────────────
async function searchGoogleNewsRSS(query: string): Promise<NewsArticle[]> {
    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}+when:1d&hl=en-US&gl=US&ceid=US:en`;

    try {
        const response = await axios.get(rssUrl, { timeout: 15000 });
        const xml = response.data as string;

        const items: NewsArticle[] = [];
        const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const itemXml of itemMatches.slice(0, 15)) {
            const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]
                ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
            const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
            const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
            const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]
                ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || 'Google News';
            const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]
                ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
                ?.replace(/<[^>]*>/g, '') || '';

            if (title && link) {
                items.push({
                    title: title.trim(),
                    description: description.trim(),
                    source: source.trim(),
                    url: link.trim(),
                    publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                });
            }
        }

        return items;
    } catch (error) {
        logger.warn(`Google News RSS failed for query "${query}"`, {
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
}

// ── Deduplication ───────────────────────────────────────────
function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];

    for (const article of articles) {
        const key = article.title.toLowerCase().replace(/\s+/g, ' ').trim();
        const shortKey = key.substring(0, 50);
        if (!seen.has(shortKey)) {
            seen.add(shortKey);
            unique.push(article);
        }
    }

    return unique;
}

// ── Main Search Function ────────────────────────────────────
export async function searchNews(market: MarketId = 'new-york'): Promise<NewsArticle[]> {
    const marketConfig = SUPPORTED_MARKETS.find(m => m.id === market);
    const queries = marketConfig?.queries || ['real estate market', 'housing market news', 'property market'];

    logger.info(`🔍 Searching news for market: ${market} (${queries.length} queries)...`);

    const allArticles: NewsArticle[] = [];

    for (const query of queries) {
        const articles = await retry(() => searchGoogleNewsRSS(query), {
            retries: 2,
            delayMs: 2000,
            label: `Google News RSS (${query})`,
        }).catch(() => [] as NewsArticle[]);

        allArticles.push(...articles);
    }

    // Deduplicate and limit
    const uniqueArticles = deduplicateArticles(allArticles).slice(0, 10);

    logger.info(`📰 Found ${uniqueArticles.length} unique articles for ${market}`, {
        sources: [...new Set(uniqueArticles.map(a => a.source))],
    });

    if (uniqueArticles.length === 0) {
        logger.warn(`⚠️  No articles found for market: ${market}`);
    }

    return uniqueArticles;
}
