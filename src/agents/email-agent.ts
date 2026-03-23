import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { createManageToken, createViewerToken } from '../utils/access-links.js';
import { escapeHtml, escapeHtmlWithBreaks, safeHttpUrl } from '../utils/html.js';
import type { AudienceProfile, Client, Language, MarketId } from '../store/client-store.js';
import type { DailyOutput } from './script-writer-agent.js';

const MARKET_LABELS: Record<MarketId, Record<Language, string>> = {
    'new-york': { zh: '纽约', en: 'New York' },
    'long-island': { zh: '纽约州长岛', en: 'Long Island' },
    'los-angeles': { zh: '洛杉矶', en: 'Los Angeles' },
    'san-francisco': { zh: '旧金山湾区', en: 'San Francisco Bay Area' },
    'chicago': { zh: '芝加哥', en: 'Chicago' },
    'miami': { zh: '迈阿密', en: 'Miami' },
    'seattle': { zh: '西雅图', en: 'Seattle' },
    'boston': { zh: '波士顿', en: 'Boston' },
    'houston': { zh: '休斯顿', en: 'Houston' },
};

const AUDIENCE_LABELS: Record<AudienceProfile, Record<Language, string>> = {
    general: {
        en: 'General North American audience',
        zh: '主流北美客户受众',
    },
    'chinese-community': {
        en: 'Chinese-speaking and relocation audience',
        zh: '华语与搬迁家庭受众',
    },
};

const LANGUAGE_LABELS: Record<Language, Record<Language, string>> = {
    en: { en: 'English delivery', zh: '英文交付' },
    zh: { en: 'Chinese delivery', zh: '中文交付' },
};

interface AudienceEmailTheme {
    pageBg: string;
    shellBg: string;
    shellBorder: string;
    headerGradient: string;
    heroGlow: string;
    accent: string;
    accentSoft: string;
    panelBg: string;
    panelBorder: string;
    newsCardBg: string;
    newsCardBorder: string;
    newsCardAccent: string;
    moduleCardBg: string;
    moduleCardBorder: string;
    moduleCardAccent: string;
    buttonGradient: string;
    footerBg: string;
    footerLink: string;
}

interface EmailMessage {
    from: string;
    toEmail: string;
    toName: string;
    replyTo?: string;
    subject: string;
    html: string;
    headers: Record<string, string>;
}

let resendClient: Resend | null = null;

function createTransport() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: config.GMAIL_USER, pass: config.GMAIL_APP_PASSWORD },
    });
}

function getResendClient(): Resend {
    if (!resendClient) {
        if (!config.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured');
        }
        resendClient = new Resend(config.RESEND_API_KEY);
    }
    return resendClient;
}

async function sendWithGmail(message: EmailMessage): Promise<void> {
    const transporter = createTransport();
    await transporter.sendMail({
        from: message.from,
        to: `"${message.toName}" <${message.toEmail}>`,
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        headers: message.headers,
    });
}

async function sendWithResend(message: EmailMessage): Promise<void> {
    const client = getResendClient();
    const response = await client.emails.send({
        from: message.from,
        to: [message.toEmail],
        replyTo: message.replyTo ? [message.replyTo] : undefined,
        subject: message.subject,
        html: message.html,
        headers: message.headers,
    });

    if (response.error) {
        throw new Error(response.error.message);
    }
}

async function deliverEmail(message: EmailMessage): Promise<void> {
    if (config.EMAIL_PROVIDER === 'resend') {
        await sendWithResend(message);
        return;
    }

    await sendWithGmail(message);
}

function t(language: Language, zh: string, en: string): string {
    return language === 'en' ? en : zh;
}

function getMarketLabel(market: MarketId, language: Language): string {
    return MARKET_LABELS[market]?.[language] || market;
}

function getAudienceLabel(audienceProfile: AudienceProfile, language: Language): string {
    return AUDIENCE_LABELS[audienceProfile]?.[language] || audienceProfile;
}

function getLanguageLabel(deliveryLanguage: Language, uiLanguage: Language): string {
    return LANGUAGE_LABELS[deliveryLanguage]?.[uiLanguage] || deliveryLanguage;
}

function getSubjectPrefix(language: Language): string {
    if (language === 'en') {
        return config.EMAIL_SUBJECT_PREFIX_EN || '[REscript Daily]';
    }

    return config.EMAIL_SUBJECT_PREFIX_ZH || config.EMAIL_SUBJECT_PREFIX;
}

function getAudienceTheme(audienceProfile: AudienceProfile): AudienceEmailTheme {
    if (audienceProfile === 'chinese-community') {
        return {
            pageBg: '#efe8dc',
            shellBg: '#fffaf0',
            shellBorder: 'rgba(120, 53, 15, 0.12)',
            headerGradient: 'linear-gradient(135deg, #17342f 0%, #255f55 52%, #d97706 100%)',
            heroGlow: 'radial-gradient(circle at top right, rgba(217, 119, 6, 0.24), transparent 34%)',
            accent: '#d97706',
            accentSoft: 'rgba(217, 119, 6, 0.12)',
            panelBg: 'rgba(255, 248, 235, 0.9)',
            panelBorder: 'rgba(120, 53, 15, 0.12)',
            newsCardBg: '#fff7ed',
            newsCardBorder: 'rgba(217, 119, 6, 0.14)',
            newsCardAccent: '#d97706',
            moduleCardBg: '#ecfdf5',
            moduleCardBorder: 'rgba(22, 101, 52, 0.14)',
            moduleCardAccent: '#15803d',
            buttonGradient: 'linear-gradient(135deg, #255f55, #d97706)',
            footerBg: '#17342f',
            footerLink: '#fdba74',
        };
    }

    return {
        pageBg: '#ece8e1',
        shellBg: '#fffdf8',
        shellBorder: 'rgba(32, 43, 54, 0.10)',
        headerGradient: 'linear-gradient(135deg, #192631 0%, #284255 52%, #9b4a32 100%)',
        heroGlow: 'radial-gradient(circle at top right, rgba(155, 74, 50, 0.24), transparent 34%)',
        accent: '#9b4a32',
        accentSoft: 'rgba(155, 74, 50, 0.12)',
        panelBg: 'rgba(248, 242, 234, 0.92)',
        panelBorder: 'rgba(32, 43, 54, 0.12)',
        newsCardBg: '#f8fafc',
        newsCardBorder: 'rgba(37, 99, 235, 0.14)',
        newsCardAccent: '#2563eb',
        moduleCardBg: '#f8fafc',
        moduleCardBorder: 'rgba(155, 74, 50, 0.12)',
        moduleCardAccent: '#9b4a32',
        buttonGradient: 'linear-gradient(135deg, #203443, #9b4a32)',
        footerBg: '#192631',
        footerLink: '#f3b18d',
    };
}

function renderArticleCards(output: DailyOutput, theme: AudienceEmailTheme): string {
    return output.articles.map((article, index) => {
        const preview = article.scripts[0]?.hook || '';
        return `
      <div style="background: ${theme.newsCardBg}; border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid ${theme.newsCardBorder}; border-left: 4px solid ${theme.newsCardAccent};">
        <div style="font-size: 14px; font-weight: 700; color: #17212b;">${index + 1}. ${escapeHtml(article.title)}</div>
        <div style="font-size: 12px; color: #4a5568; margin-top: 4px;">${escapeHtml(preview.substring(0, 90))}${preview.length > 90 ? '...' : ''}</div>
      </div>`;
    }).join('\n');
}

function renderModuleCards(output: DailyOutput, theme: AudienceEmailTheme): string {
    return (output.modules || []).map((module) => {
        const count = module.articles.reduce((sum, article) => sum + article.scripts.length, 0);
        const titles = module.articles.map((article) => escapeHtml(article.title)).join(' · ');
        return `
      <div style="background: ${theme.moduleCardBg}; border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid ${theme.moduleCardBorder}; border-left: 4px solid ${theme.moduleCardAccent};">
        <div style="font-size: 14px; font-weight: 700; color: #17212b;">${escapeHtml(module.moduleEmoji)} ${escapeHtml(module.moduleName)} <span style="color:#64748b;font-weight:400;font-size:12px;">(${count})</span></div>
        <div style="font-size: 12px; color: #4a5568; margin-top: 4px;">${titles}</div>
      </div>`;
    }).join('\n');
}

function buildEmailHTML(
    client: Client,
    output: DailyOutput,
    viewerUrl: string,
    manageUrl: string,
    dateLabel: string,
    isTrial = false,
    subscribeUrl?: string,
): string {
    const language = client.language;
    const marketLabel = getMarketLabel(output.market, language);
    const audienceLabel = getAudienceLabel(client.audienceProfile, language);
    const deliveryLabel = getLanguageLabel(client.language, language);
    const theme = getAudienceTheme(client.audienceProfile);
    const articleCards = renderArticleCards(output, theme);
    const moduleCards = renderModuleCards(output, theme);
    const moduleScripts = output.modules
        ? output.modules.reduce((sum, module) => sum + module.articles.reduce((inner, article) => inner + article.scripts.length, 0), 0)
        : 0;
    const totalScripts = output.articleCount * 4 + moduleScripts;
    const companyAddress = config.COMPANY_ADDRESS
        ? `<p style="margin: 6px 0 0; color: #64748b;">${escapeHtml(config.COMPANY_ADDRESS)}</p>`
        : '';
    const safeSubscribeUrl = subscribeUrl ? safeHttpUrl(subscribeUrl) : null;
    const packageTitle = client.audienceProfile === 'chinese-community'
        ? t(language, '今天的双语社群内容包已就绪', 'Your bilingual community content package is ready')
        : t(language, 'Today’s market desk is ready', 'Your market desk is ready');
    const packageSubtitle = client.audienceProfile === 'chinese-community'
        ? t(
            language,
            `这份内容更偏向华语客户沟通、搬迁教育和社区信任建立，适合做更有人情味的北美地产内容。`,
            `This package leans into Chinese-speaking client education, relocation decisions, and trust-building content for community-driven pipelines.`,
        )
        : t(
            language,
            `这份内容更偏向主流北美买卖家、市场解读和经纪人品牌经营，适合个人经纪人、团队负责人和 brokerage marketer。`,
            `This package leans toward mainstream North American buyers and sellers, market commentary, and working-agent pipeline content.`,
        );
    const workflowTitle = client.audienceProfile === 'chinese-community'
        ? t(language, '最适合的使用方式', 'Best use case')
        : t(language, 'Best use case', 'Best use case');
    const workflowBody = client.audienceProfile === 'chinese-community'
        ? t(
            language,
            '用来拍双语口播、做社区型短视频，或给搬迁家庭、华语买家和卖家做流程教育。',
            'Use it for bilingual talking-head videos, relocation explainers, and community-facing trust content.',
        )
        : t(
            language,
            '用来拍日更市场点评、weekly market update、买卖家教育视频，或者做 brokerage 的内容素材池。',
            'Use it for daily market commentary, weekly updates, buyer-seller education, or brokerage content operations.',
        );
    const reviewNote = client.audienceProfile === 'chinese-community'
        ? t(
            language,
            '涉及税务、法律、公平住房或 brokerage 政策时，仍然需要你自己或团队做最后审核。',
            'Review all regulated claims with your team before publishing, especially where tax, legal, fair housing, or brokerage policy is involved.',
        )
        : t(
            language,
            '这些脚本是高质量初稿，不是自动发布内容。涉及市场敏感或合规敏感表述时，发布前必须复核。',
            'These scripts are production drafts, not auto-published content. Review anything market-sensitive or compliance-sensitive before it goes live.',
        );

    const trialNotice = isTrial ? `
      <div style="padding: 0 24px 12px;">
        <div style="background: ${theme.accentSoft}; border: 1px solid ${theme.accent}; border-radius: 16px; padding: 14px 16px; font-size: 13px; color: #6b3410;">
          ${t(language,
        `🎁 这是您的免费 sample。如需继续按 ${escapeHtml(marketLabel)} / ${escapeHtml(audienceLabel)} 接收内容，请 ${safeSubscribeUrl ? `<a href="${safeSubscribeUrl}" style="color: ${theme.accent}; font-weight: 700;">升级订阅</a>` : '升级订阅'}。`,
        `🎁 This is your free sample. ${safeSubscribeUrl ? `<a href="${safeSubscribeUrl}" style="color: ${theme.accent}; font-weight: 700;">Upgrade</a>` : 'Upgrade'} to keep receiving ${escapeHtml(marketLabel)} delivery for the ${escapeHtml(audienceLabel.toLowerCase())} lens.`)}
        </div>
      </div>` : '';

    const trialBanner = isTrial && safeSubscribeUrl ? `
      <div style="margin: 0; padding: 24px; background: ${theme.buttonGradient}; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: white;">${t(language, '喜欢今天这套内容吗？', 'Want this package every day?')}</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: rgba(255,255,255,0.88);">${t(language, `订阅后每天自动收到 ${totalScripts}+ 条新文案。`, `Subscribe to receive ${totalScripts}+ fresh scripts every day.`)}</p>
        <a href="${safeSubscribeUrl}" style="display: inline-block; background: white; color: ${theme.accent}; padding: 14px 36px; border-radius: 999px; text-decoration: none; font-size: 16px; font-weight: 700;">${t(language, '立即订阅', 'Subscribe now')}</a>
      </div>` : '';

    return `
<!DOCTYPE html>
<html lang="${language === 'en' ? 'en' : 'zh-CN'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 28px 12px; background-color: ${theme.pageBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; background: ${theme.shellBg}; border-radius: 30px; overflow: hidden; box-shadow: 0 24px 80px rgba(15,23,42,0.12); border: 1px solid ${theme.shellBorder};">
    <div style="background: ${theme.heroGlow}, ${theme.headerGradient}; padding: 32px 28px; color: white;">
      <div style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">REscript private delivery</div>
      <h1 style="margin: 18px 0 10px; font-size: 30px; line-height: 1.05; font-weight: 800;">${packageTitle}</h1>
      <p style="margin: 0; max-width: 520px; color: rgba(255,255,255,0.86); font-size: 14px; line-height: 1.7;">${escapeHtml(packageSubtitle)}</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px;">
        <span style="display:inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); font-size: 12px;">${escapeHtml(marketLabel)}</span>
        <span style="display:inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); font-size: 12px;">${escapeHtml(deliveryLabel)}</span>
        <span style="display:inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); font-size: 12px;">${escapeHtml(audienceLabel)}</span>
      </div>
      <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:22px;">
        <div style="min-width:120px; padding:14px 16px; border-radius:18px; background: rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.16);">
          <div style="font-size: 26px; font-weight: 800;">${totalScripts}</div>
          <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.72);">${t(language, '总文案数', 'Total scripts')}</div>
        </div>
        <div style="min-width:120px; padding:14px 16px; border-radius:18px; background: rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.16);">
          <div style="font-size: 26px; font-weight: 800;">${output.articleCount}</div>
          <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.72);">${t(language, '新闻主题', 'News topics')}</div>
        </div>
        <div style="min-width:120px; padding:14px 16px; border-radius:18px; background: rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.16);">
          <div style="font-size: 26px; font-weight: 800;">${output.modules?.length || 0}</div>
          <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.72);">${t(language, '常青模块', 'Evergreen modules')}</div>
        </div>
      </div>
    </div>

    <div style="padding: 24px 28px 10px;">
      <p style="color: #334155; font-size: 15px; margin: 0 0 6px;">${escapeHtml(client.name)}，${t(language, '你好', 'hello')}.</p>
      <p style="color: #5b6775; font-size: 14px; line-height: 1.8; margin: 0;">${t(language, `今天已经为你整理好 ${totalScripts} 条可直接拍摄的脚本，覆盖新闻热点和常青模块。`, `Today's delivery includes ${totalScripts} ready-to-film scripts across news and evergreen modules.`)}</p>
    </div>

    ${trialNotice}

    <div style="padding: 14px 28px 8px;">
      <div style="padding: 18px 18px 16px; border-radius: 22px; background: ${theme.panelBg}; border: 1px solid ${theme.panelBorder};">
        <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: ${theme.accent}; font-weight: 700;">${workflowTitle}</div>
        <div style="margin-top: 8px; color: #17212b; font-size: 15px; line-height: 1.7;">${escapeHtml(workflowBody)}</div>
        <div style="margin-top: 14px; color: #5b6775; font-size: 13px; line-height: 1.7;">${escapeHtmlWithBreaks(reviewNote)}</div>
      </div>
    </div>

    <div style="padding: 18px 28px 22px; text-align: center;">
      <a href="${viewerUrl}" style="display: inline-block; background: ${theme.buttonGradient}; color: white; padding: 15px 38px; border-radius: 999px; text-decoration: none; font-size: 16px; font-weight: 700; box-shadow: 0 10px 30px rgba(15,23,42,0.18);">${t(language, '打开私有查看页并一键复制', 'Open private viewer and copy scripts')}</a>
      <p style="margin: 12px 0 0; color: #6b7280; font-size: 12px;">${escapeHtml(dateLabel)} · ${escapeHtml(marketLabel)} · ${escapeHtml(audienceLabel)}</p>
    </div>

    <div style="padding: 0 28px 12px;">
      <h3 style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin: 0 0 10px;">${t(language, '新闻热点', 'News highlights')}</h3>
      ${articleCards}
    </div>

    ${moduleCards ? `<div style="padding: 0 28px 24px;">
      <h3 style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin: 0 0 10px;">${t(language, '内容模块', 'Content modules')}</h3>
      ${moduleCards}
    </div>` : ''}

    ${trialBanner}

    <div style="padding: 18px 28px; background: ${theme.footerBg}; color: #94a3b8; font-size: 12px; text-align: center;">
      <p style="margin: 0 0 6px;">REscript · AI-powered real estate content operations</p>
      <p style="margin: 0;">
        <a href="${manageUrl}" style="color: ${theme.footerLink}; text-decoration: none;">${t(language, '管理订阅 / 退订', 'Manage subscription / unsubscribe')}</a>
        ·
        <a href="${config.BASE_URL}/privacy.html" style="color: ${theme.footerLink}; text-decoration: none;">${t(language, '隐私政策', 'Privacy')}</a>
        ·
        <a href="${config.BASE_URL}/terms.html" style="color: ${theme.footerLink}; text-decoration: none;">${t(language, '服务条款', 'Terms')}</a>
      </p>
      <p style="margin: 6px 0 0; color: #64748b;">${escapeHtml(config.SUPPORT_EMAIL)}</p>
      ${companyAddress}
    </div>
  </div>
</body>
</html>`;
}

function buildSubject(client: Client, output: DailyOutput, dateLabel: string, isTrial: boolean): string {
    const marketLabel = getMarketLabel(output.market, client.language);
    const audienceTag = client.audienceProfile === 'chinese-community'
        ? t(client.language, '社群向', 'Community')
        : t(client.language, '市场向', 'Market');
    const core = t(
        client.language,
        `${dateLabel} · ${marketLabel} ${audienceTag}内容包已就绪`,
        `${dateLabel} · ${marketLabel} ${audienceTag} scripts are ready`,
    );
    const trialTag = isTrial ? t(client.language, ' [免费Sample]', ' [Sample]') : '';
    return `${getSubjectPrefix(client.language)} ${core}${trialTag}`.trim();
}

async function sendEmail(
    client: Client,
    output: DailyOutput,
    baseUrl: string,
    dryRun: boolean,
    isTrial = false,
    subscribeUrl?: string,
): Promise<boolean> {
    const dateLabel = new Date(output.generatedAt).toLocaleDateString(client.language === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        timeZone: 'America/New_York',
    });
    const viewerToken = createViewerToken(client, output.key);
    const manageToken = createManageToken(client);
    const viewerUrl = `${baseUrl}/view.html?key=${encodeURIComponent(output.key)}&token=${encodeURIComponent(viewerToken)}`;
    const manageUrl = `${baseUrl}/manage.html?token=${encodeURIComponent(manageToken)}`;
    const subject = buildSubject(client, output, dateLabel, isTrial);
    const html = buildEmailHTML(client, output, viewerUrl, manageUrl, dateLabel, isTrial, subscribeUrl);

    if (dryRun) {
        logger.info(`📧 [DRY RUN] Would send to ${client.name} <${client.email}> (${isTrial ? 'sample' : client.plan})`);
        return true;
    }

    try {
        await deliverEmail({
            from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM_ADDRESS}>`,
            toEmail: client.email,
            toName: client.name,
            replyTo: config.SUPPORT_EMAIL,
            subject,
            html,
            headers: {
                'List-Unsubscribe': `<${manageUrl}>, <mailto:${config.SUPPORT_EMAIL}?subject=unsubscribe>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
        });
        logger.info(`✅ Email sent via ${config.EMAIL_PROVIDER} to ${client.name} <${client.email}> (${isTrial ? 'sample' : client.plan})`);
        return true;
    } catch (error) {
        logger.error(`❌ Failed to send via ${config.EMAIL_PROVIDER} to ${client.name} <${client.email}>`, {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

export async function sendBatchEmails(
    clients: Client[],
    output: DailyOutput,
    baseUrl: string,
    dryRun = false,
    isTrial = false,
    subscribeUrl?: string,
): Promise<{ sent: number; failed: number; sentClientIds: string[] }> {
    let sent = 0;
    let failed = 0;
    const sentClientIds: string[] = [];

    for (const client of clients) {
        const ok = await sendEmail(client, output, baseUrl, dryRun, isTrial, subscribeUrl);
        if (ok) {
            sent += 1;
            sentClientIds.push(client.id);
        } else {
            failed += 1;
        }
        if (!dryRun) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    logger.info(`📊 Email results (${isTrial ? 'sample' : 'subscriber'}): ${sent} sent, ${failed} failed`);
    return { sent, failed, sentClientIds };
}
