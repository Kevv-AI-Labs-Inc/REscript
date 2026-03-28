import type { AudienceProfile, Language, MarketId } from '../store/client-store.js';

type AudienceScope = 'all' | 'general' | 'chinese-community';
type LocalizedText = Record<Language, string>;
type LocalizedKeywords = Record<Language, string[]>;

interface TopicDefinition {
    id: string;
    title: LocalizedText;
    angle: LocalizedText;
    keywords: LocalizedKeywords;
    audiences: AudienceScope[];
    markets?: MarketId[];
}

interface ModuleDefinition {
    id: string;
    name: LocalizedText;
    emoji: string;
    description: LocalizedText;
    topicsPerDay: number;
    audiences: AudienceScope[];
    topics: TopicDefinition[];
}

export interface TopicItem {
    id: string;
    title: string;
    angle: string;
    keywords: string[];
}

export interface ContentModule {
    id: string;
    name: string;
    emoji: string;
    description: string;
    topicsPerDay: number;
    topics: TopicItem[];
}

const ACTIVE_AUDIENCES: Record<AudienceProfile, AudienceScope[]> = {
    general: ['all', 'general'],
    'chinese-community': ['all', 'chinese-community'],
};

function t(copy: LocalizedText, language: Language): string {
    return copy[language];
}

function list(copy: LocalizedKeywords, language: Language): string[] {
    return copy[language];
}

function supportsAudience(audiences: AudienceScope[], audienceProfile: AudienceProfile): boolean {
    return audiences.some((audience) => ACTIVE_AUDIENCES[audienceProfile].includes(audience));
}

function supportsMarket(markets: MarketId[] | undefined, market: MarketId): boolean {
    return !markets || markets.includes(market);
}

const modules: ModuleDefinition[] = [
    {
        id: 'buyer-strategy',
        name: { en: 'Buyer strategy', zh: '买家策略' },
        emoji: '🧭',
        description: {
            en: 'Offer strategy, financing readiness, and confidence-building buyer education.',
            zh: '围绕出价、贷款准备和买家决策信心建立的内容模块。',
        },
        topicsPerDay: 1,
        audiences: ['all'],
        topics: [
            {
                id: 'buyer-01',
                title: { en: 'How buyers should evaluate monthly payment, not just headline price', zh: '买家该看月供，而不是只盯总价' },
                angle: { en: 'Explain how taxes, insurance, HOA, and rate assumptions change the real affordability conversation.', zh: '解释房产税、保险、HOA 和利率假设如何改变真实可负担性。' },
                keywords: { en: ['buyer payment strategy', 'monthly payment', 'home affordability'], zh: ['月供策略', '买房负担', '可负担性'] },
                audiences: ['all'],
            },
            {
                id: 'buyer-02',
                title: { en: 'What makes an offer feel clean to sellers in a higher-rate market', zh: '高利率市场里，什么样的 offer 更容易让卖家点头' },
                angle: { en: 'Focus on certainty, financing strength, timelines, contingencies, and agent communication.', zh: '重点讲清确定性、贷款强度、时间线、contingency 和经纪人的沟通质量。' },
                keywords: { en: ['offer strategy', 'seller psychology', 'home purchase'], zh: ['出价策略', '卖家心理', '买房'] },
                audiences: ['all'],
            },
            {
                id: 'buyer-03',
                title: { en: 'Condo, townhome, or single-family: how clients should decide', zh: 'Condo、townhome 还是独栋，客户应该怎么选' },
                angle: { en: 'Frame the decision around lifestyle, maintenance, monthly cost, privacy, and resale flexibility.', zh: '从生活方式、维护成本、月供结构、隐私和转售弹性来解释。' },
                keywords: { en: ['condo vs single family', 'townhome', 'buyer education'], zh: ['condo 对比', 'townhome', '买家教育'] },
                audiences: ['all'],
            },
            {
                id: 'buyer-04',
                title: { en: 'Inspection and appraisal: where buyers still have leverage', zh: '验房和 appraisal 阶段，买家还有哪些谈判空间' },
                angle: { en: 'Teach buyers how to think about negotiation leverage after the accepted offer, without sounding combative.', zh: '帮助买家理解 accepted offer 之后还能如何理性谈判，而不是制造对立。' },
                keywords: { en: ['inspection negotiation', 'appraisal', 'buyer leverage'], zh: ['验房谈判', '估价', '买家谈判'] },
                audiences: ['all'],
            },
            {
                id: 'buyer-05',
                title: { en: 'Move-up buyers: when selling and buying at the same time actually works', zh: '改善型买家什么时候适合边卖边买' },
                angle: { en: 'Explain timing, risk tolerance, bridge decisions, and the tradeoff between certainty and convenience.', zh: '讲清时间管理、风险承受力、bridge 决策，以及确定性与便利性的权衡。' },
                keywords: { en: ['move up buyer', 'bridge strategy', 'sell and buy'], zh: ['改善型买家', '衔接策略', '先卖后买'] },
                audiences: ['all'],
            },
            {
                id: 'buyer-06',
                title: { en: 'What first-time buyers usually misunderstand in competitive neighborhoods', zh: '首次买房者在热门社区最容易误判什么' },
                angle: { en: 'Address budget discipline, listing strategy, backup plans, and how to avoid emotional overbidding.', zh: '聚焦预算纪律、筛房策略、备选方案，以及如何避免情绪化加价。' },
                keywords: { en: ['first-time buyer', 'competitive market', 'budget strategy'], zh: ['首次购房', '热门市场', '预算策略'] },
                audiences: ['all'],
            },
        ],
    },
    {
        id: 'seller-strategy',
        name: { en: 'Seller strategy', zh: '卖家策略' },
        emoji: '🏡',
        description: {
            en: 'Pricing, prep, launch strategy, and seller-facing market expectations.',
            zh: '围绕定价、上市准备、launch 节奏和卖家预期管理的模块。',
        },
        topicsPerDay: 1,
        audiences: ['all'],
        topics: [
            {
                id: 'seller-01',
                title: { en: 'How sellers should price when comps tell mixed stories', zh: '当可比成交意见不一致时，卖家该怎么定价' },
                angle: { en: 'Explain why pricing is a positioning decision, not just a spreadsheet average.', zh: '强调定价不是机械平均数，而是市场定位决策。' },
                keywords: { en: ['listing price strategy', 'comps', 'home seller'], zh: ['挂牌定价', '可比成交', '卖家策略'] },
                audiences: ['all'],
            },
            {
                id: 'seller-02',
                title: { en: 'Pre-listing repairs versus selling as-is', zh: '上市前修整，还是直接按现状出售' },
                angle: { en: 'Show how sellers should decide which fixes create confidence and which ones just waste time.', zh: '解释哪些修整能提升买家信心，哪些只是浪费时间和预算。' },
                keywords: { en: ['pre-listing prep', 'as-is sale', 'seller tips'], zh: ['上市准备', '按现状出售', '卖家建议'] },
                audiences: ['all'],
            },
            {
                id: 'seller-03',
                title: { en: 'Open house follow-up is part of the listing strategy, not an afterthought', zh: 'Open house 之后的跟进，本来就是上市策略的一部分' },
                angle: { en: 'Teach sellers why post-showing feedback, agent outreach, and relaunch decisions matter.', zh: '帮助卖家理解看房反馈、经纪人跟进和二次 launch 为什么重要。' },
                keywords: { en: ['open house strategy', 'listing follow up', 'seller marketing'], zh: ['open house', '上市跟进', '卖房营销'] },
                audiences: ['all'],
            },
            {
                id: 'seller-04',
                title: { en: 'The strongest offer is not always the highest number', zh: '最好的 offer 不一定是最高报价' },
                angle: { en: 'Frame offer review around certainty, financing, timeline, contingencies, and buyer quality.', zh: '从确定性、贷款能力、时间线、条件限制和买家质量去看 offer。' },
                keywords: { en: ['multiple offers', 'seller decision', 'offer review'], zh: ['多 offer', '卖家决策', '出价筛选'] },
                audiences: ['all'],
            },
            {
                id: 'seller-05',
                title: { en: 'How downsizers should think about timing, storage, and move sequencing', zh: 'Downsizer 卖家该如何安排 timing、收纳和搬家顺序' },
                angle: { en: 'Turn a stressful transition into a planning conversation with clear next steps.', zh: '把高压力的生活转换，讲成一套可执行的规划流程。' },
                keywords: { en: ['downsizing', 'seller transition', 'moving plan'], zh: ['downsizing', '卖家过渡', '搬家规划'] },
                audiences: ['all'],
            },
            {
                id: 'seller-06',
                title: { en: 'Why stale listings lose leverage and how to relaunch smartly', zh: '为什么 stale listing 会越来越难谈，应该如何聪明重启' },
                angle: { en: 'Help sellers understand DOM psychology, pricing resets, and presentation upgrades.', zh: '解释 DOM 心理、价格重设和展示升级如何影响重新上市。' },
                keywords: { en: ['stale listing', 'relaunch strategy', 'DOM'], zh: ['滞销房源', '重启上市', 'DOM'] },
                audiences: ['all'],
            },
        ],
    },
    {
        id: 'market-intel',
        name: { en: 'Market intel', zh: '市场解读' },
        emoji: '📈',
        description: {
            en: 'Inventory, demand, pricing behavior, and neighborhood-level market interpretation.',
            zh: '围绕库存、需求、定价行为和社区级市场变化的解释模块。',
        },
        topicsPerDay: 1,
        audiences: ['all'],
        topics: [
            {
                id: 'market-01',
                title: { en: 'How agents should explain inventory shifts without sounding alarmist', zh: '经纪人该如何解释库存变化，而不是把市场说得太夸张' },
                angle: { en: 'Teach clients to connect inventory with leverage, pricing pressure, and time-on-market expectations.', zh: '帮助客户把库存变化与议价空间、价格压力和成交周期联系起来。' },
                keywords: { en: ['inventory shift', 'market update', 'housing supply'], zh: ['库存变化', '市场更新', '住房供给'] },
                audiences: ['all'],
            },
            {
                id: 'market-02',
                title: { en: 'Why the same metro can feel like two different markets', zh: '为什么同一个城市，会像两个完全不同的市场' },
                angle: { en: 'Use neighborhood segmentation, price bands, and product type differences to explain uneven demand.', zh: '用社区分层、总价带和房型差异，解释为什么需求冷热不均。' },
                keywords: { en: ['micro market', 'neighborhood trends', 'pricing bands'], zh: ['子市场', '社区趋势', '价格分层'] },
                audiences: ['all'],
            },
            {
                id: 'market-03',
                title: { en: 'What rate sensitivity looks like in real client behavior', zh: '利率敏感在真实客户行为里会怎么体现' },
                angle: { en: 'Focus on search behavior, budget resets, and the emotional difference between affordability and confidence.', zh: '从搜房范围变化、预算重设和信心变化来讲利率，而不是只讲宏观。' },
                keywords: { en: ['rate sensitivity', 'buyer behavior', 'affordability'], zh: ['利率敏感', '买家行为', '可负担性'] },
                audiences: ['all'],
            },
            {
                id: 'market-04',
                title: { en: 'What agents should watch when new construction starts competing with resale', zh: '当新房开始和二手房抢客户时，经纪人该看什么' },
                angle: { en: 'Compare incentives, finish level, timeline certainty, and resale competition.', zh: '比较 incentive、装修完成度、时间确定性和二手房竞争。' },
                keywords: { en: ['new construction', 'resale competition', 'market strategy'], zh: ['新房', '二手房竞争', '市场策略'] },
                audiences: ['all'],
            },
            {
                id: 'market-05',
                title: { en: 'How to talk about seasonality without pretending every year repeats itself', zh: '如何讲季节性，而不是假装每年都会完全重演' },
                angle: { en: 'Give clients a practical framework for timing decisions without making fake guarantees.', zh: '提供 timing 判断框架，而不是给出虚假的确定性承诺。' },
                keywords: { en: ['seasonality', 'timing the market', 'agent perspective'], zh: ['季节性', '入场时机', '经纪人视角'] },
                audiences: ['all'],
            },
            {
                id: 'market-06',
                title: { en: 'Neighborhood storylines that matter more than national headlines', zh: '比全国大新闻更值得讲的，其实是社区级变化' },
                angle: { en: 'Show how school demand, commute shifts, retail momentum, and local reputation shape pricing.', zh: '讲清学区需求、通勤变化、商业活力和社区口碑如何影响价格。' },
                keywords: { en: ['local market update', 'neighborhood story', 'hyperlocal real estate'], zh: ['本地市场更新', '社区故事', '超本地内容'] },
                audiences: ['all'],
            },
        ],
    },
    {
        id: 'investor-and-landlord',
        name: { en: 'Investor and landlord', zh: '投资与房东' },
        emoji: '💼',
        description: {
            en: 'Cash flow logic, hold strategy, landlord operations, and investor framing for agents.',
            zh: '围绕现金流、持有策略、房东运营和投资者沟通的话题模块。',
        },
        topicsPerDay: 1,
        audiences: ['all'],
        topics: [
            {
                id: 'invest-01',
                title: { en: 'Why investors should separate cash-flow deals from appreciation bets', zh: '投资客户为什么要把现金流型房产和增值型房产分开看' },
                angle: { en: 'Give agents a simple framework for talking through return expectations and holding periods.', zh: '给经纪人一套简单框架，解释回报预期和持有周期。' },
                keywords: { en: ['cash flow', 'appreciation', 'investment property'], zh: ['现金流', '增值', '投资房'] },
                audiences: ['all'],
            },
            {
                id: 'invest-02',
                title: { en: 'What small multifamily buyers underestimate after closing', zh: '小型多家庭投资房买家最容易低估哪些持有成本' },
                angle: { en: 'Focus on reserves, tenant turnover, maintenance cycles, and management bandwidth.', zh: '聚焦储备金、租客流动、维修周期和管理精力。' },
                keywords: { en: ['small multifamily', 'landlord costs', 'investment strategy'], zh: ['多家庭房', '房东成本', '投资策略'] },
                audiences: ['all'],
            },
            {
                id: 'invest-03',
                title: { en: 'Short-term rental hype versus operating reality', zh: '短租看起来很香，但真正的运营现实是什么' },
                angle: { en: 'Frame the topic around regulation risk, turnover burden, seasonality, and net operating discipline.', zh: '从监管风险、换租频率、季节性和净运营纪律来讲短租。' },
                keywords: { en: ['short term rental', 'operating costs', 'landlord strategy'], zh: ['短租', '运营成本', '房东策略'] },
                audiences: ['all'],
            },
            {
                id: 'invest-04',
                title: { en: 'How agents can talk about 1031 exchanges without pretending to be a CPA', zh: '经纪人如何讲 1031 exchange，而不装成 CPA' },
                angle: { en: 'Keep the conversation strategic and high-level while clearly drawing the line around professional advice.', zh: '内容保持战略层面，明确和税务专业建议之间的边界。' },
                keywords: { en: ['1031 exchange', 'investment planning', 'agent education'], zh: ['1031 exchange', '投资规划', '经纪人教育'] },
                audiences: ['all'],
            },
            {
                id: 'invest-05',
                title: { en: 'What makes a rental property resilient in a slower market', zh: '在偏慢的市场里，什么样的出租房更抗波动' },
                angle: { en: 'Tie resilience to location, renter profile, operating cost, and exit flexibility.', zh: '把抗风险能力和地段、租客画像、持有成本及退出弹性挂钩。' },
                keywords: { en: ['rental resilience', 'investment risk', 'hold strategy'], zh: ['出租抗风险', '投资风险', '持有策略'] },
                audiences: ['all'],
            },
            {
                id: 'invest-06',
                title: { en: 'Why investor clients need decision speed without sloppy underwriting', zh: '投资客户要快，但不能为了快而放弃 underwriting 纪律' },
                angle: { en: 'Explain how good agents help investors move quickly while staying disciplined on assumptions.', zh: '解释优秀经纪人如何让投资者既反应快，又不放松底层假设。' },
                keywords: { en: ['underwriting discipline', 'investor client', 'agent value'], zh: ['underwriting', '投资客户', '经纪人价值'] },
                audiences: ['all'],
            },
        ],
    },
    {
        id: 'neighborhood-storylines',
        name: { en: 'Neighborhood storylines', zh: '社区内容' },
        emoji: '📍',
        description: {
            en: 'Hyperlocal education, relocation stories, and neighborhood comparison content.',
            zh: '适合做超本地教育、搬迁解读和社区对比的内容模块。',
        },
        topicsPerDay: 1,
        audiences: ['all'],
        topics: [
            {
                id: 'hood-01',
                title: { en: 'How to compare two neighborhoods without turning it into clickbait', zh: '如何对比两个社区，而不是做成标题党' },
                angle: { en: 'Use commute, home type, lifestyle rhythm, and budget fit as the comparison framework.', zh: '用通勤、房型、生活节奏和预算适配做对比框架。' },
                keywords: { en: ['neighborhood comparison', 'relocation guide', 'local market'], zh: ['社区对比', '搬迁指南', '本地市场'] },
                audiences: ['all'],
            },
            {
                id: 'hood-02',
                title: { en: 'What makes a neighborhood feel family-friendly beyond school labels', zh: '除了学区标签，什么会让一个社区更适合家庭' },
                angle: { en: 'Talk about daily rhythm, parks, commute patterns, home layout, and neighborhood convenience.', zh: '从日常节奏、公园、通勤、房屋格局和生活便利度去讲。' },
                keywords: { en: ['family neighborhood', 'relocation content', 'home search'], zh: ['家庭社区', '搬迁内容', '找房'] },
                audiences: ['all'],
            },
            {
                id: 'hood-03',
                title: { en: 'Urban core versus suburb: how clients should frame the tradeoff', zh: '市中心还是郊区，客户该怎么理解这个取舍' },
                angle: { en: 'Frame the conversation around time, space, lifestyle, and long-term flexibility.', zh: '从时间、空间、生活方式和长期弹性来讲这类取舍。' },
                keywords: { en: ['city vs suburb', 'relocation strategy', 'buyer decision'], zh: ['城市 vs 郊区', '搬迁策略', '买家决策'] },
                audiences: ['all'],
            },
            {
                id: 'hood-04',
                title: { en: 'How agents can turn a neighborhood tour into trust-building content', zh: '经纪人怎样把社区带看，做成能建立信任感的内容' },
                angle: { en: 'Teach agents to show context, not just aesthetics, when filming local content.', zh: '帮助经纪人理解拍社区内容时，重点是 context，不只是景观。' },
                keywords: { en: ['neighborhood tour', 'agent content', 'trust building'], zh: ['社区探访', '经纪人内容', '信任建立'] },
                audiences: ['all'],
            },
            {
                id: 'hood-05',
                title: { en: 'What neighborhood buyers should ask before they fall in love with the listing', zh: '买家在爱上房源之前，应该先问清社区的哪些问题' },
                angle: { en: 'Focus on lifestyle fit, future plans, commute reality, and neighborhood momentum.', zh: '聚焦生活匹配、未来规划、通勤现实和社区趋势。' },
                keywords: { en: ['neighborhood questions', 'buyer education', 'local fit'], zh: ['社区问题', '买家教育', '适配度'] },
                audiences: ['all'],
            },
            {
                id: 'hood-06',
                title: { en: 'Why neighborhood reputation often moves faster than the data', zh: '为什么社区口碑的变化，常常比数据更早出现' },
                angle: { en: 'Help agents talk about local momentum without making unsupported promises.', zh: '让经纪人能谈本地势能，但不做没有依据的承诺。' },
                keywords: { en: ['neighborhood reputation', 'local momentum', 'agent insight'], zh: ['社区口碑', '本地势能', '经纪人洞察'] },
                audiences: ['all'],
            },
        ],
    },
    {
        id: 'agent-brand-and-leads',
        name: { en: 'Agent brand and leads', zh: '经纪人品牌与获客' },
        emoji: '🎥',
        description: {
            en: 'Content that helps agents build trust, follow up, and turn market knowledge into pipeline.',
            zh: '帮助经纪人建立信任、承接线索，并把市场认知转化为成交机会的模块。',
        },
        topicsPerDay: 1,
        audiences: ['all'],
        topics: [
            {
                id: 'brand-01',
                title: { en: 'How agents should turn a weekly market update into lead-generation content', zh: '经纪人怎样把每周市场更新，做成能带来线索的内容' },
                angle: { en: 'Teach the difference between informative commentary and strong, consultative positioning.', zh: '说明信息型内容和咨询型定位之间的差异。' },
                keywords: { en: ['market update content', 'lead generation', 'agent brand'], zh: ['市场更新内容', '获客', '经纪人品牌'] },
                audiences: ['all'],
            },
            {
                id: 'brand-02',
                title: { en: 'What agents should say after an open house if they want real follow-up conversations', zh: 'Open house 之后，经纪人该怎么跟进，才会有真实对话' },
                angle: { en: 'Focus on thoughtful follow-up, segmentation, and credibility instead of pushy sales language.', zh: '强调有判断力的 follow-up、客户分层和可信度，而不是硬推销。' },
                keywords: { en: ['open house follow up', 'agent scripts', 'lead nurture'], zh: ['open house 跟进', '经纪人口播', '线索培育'] },
                audiences: ['all'],
            },
            {
                id: 'brand-03',
                title: { en: 'The easiest way for agents to sound generic on camera', zh: '经纪人拍视频时，最容易显得没辨识度的地方是什么' },
                angle: { en: 'Use this as a brand-positioning lesson around specificity, point of view, and local context.', zh: '把它讲成一次品牌定位课：具体性、观点和本地语境才是差异化。' },
                keywords: { en: ['agent on camera', 'brand positioning', 'local content'], zh: ['经纪人视频', '品牌定位', '本地内容'] },
                audiences: ['all'],
            },
            {
                id: 'brand-04',
                title: { en: 'How listing prep content can win trust before the appointment', zh: '上市前教育内容，如何在 listing appointment 之前就建立信任' },
                angle: { en: 'Show how pre-listing education shifts the seller conversation from price obsession to strategy.', zh: '说明前置教育如何把卖家注意力从“只盯价格”转向策略沟通。' },
                keywords: { en: ['listing appointment', 'seller trust', 'agent marketing'], zh: ['listing appointment', '卖家信任', '经纪人营销'] },
                audiences: ['all'],
            },
            {
                id: 'brand-05',
                title: { en: 'Sphere of influence content that does not feel like spam', zh: '发给熟人圈的地产内容，怎样才不会像 spam' },
                angle: { en: 'Focus on relevance, timing, and how to sound helpful to people who are not ready today.', zh: '围绕相关性、时机和“对方还没准备好”时该如何保持价值感。' },
                keywords: { en: ['sphere marketing', 'agent nurture', 'relationship marketing'], zh: ['熟人圈营销', '经纪人维护', '关系营销'] },
                audiences: ['all'],
            },
            {
                id: 'brand-06',
                title: { en: 'Case-study storytelling: how agents should describe wins without sounding fake', zh: '案例型内容怎么讲，才不会像过度包装' },
                angle: { en: 'Use real client tension, decision points, and outcome framing instead of empty self-praise.', zh: '重点是客户的真实张力、决策节点和结果，而不是空泛夸自己。' },
                keywords: { en: ['case study content', 'agent stories', 'trust marketing'], zh: ['案例内容', '经纪人故事', '信任营销'] },
                audiences: ['all'],
            },
        ],
    },
    {
        id: 'market-playbooks',
        name: { en: 'Market playbooks', zh: '城市专属打法' },
        emoji: '🗺️',
        description: {
            en: 'One market-specific storyline per city so daily output reflects how agents actually speak in that metro.',
            zh: '按城市补充一个专属选题，让每天内容更像当地经纪人真实会讲的话题。',
        },
        topicsPerDay: 1,
        audiences: ['all'],
        topics: [
            {
                id: 'playbook-nyc',
                title: { en: 'Why New York buyers need a co-op versus condo decision early', zh: '纽约买家为什么要尽早想清 co-op 和 condo 的差别' },
                angle: { en: 'Frame the decision around approval process, monthly carrying cost, future flexibility, and buyer expectations.', zh: '从审批流程、月持有成本、未来灵活度和买家预期来讲清这个决定。' },
                keywords: { en: ['New York co-op', 'condo decision', 'buyer strategy'], zh: ['纽约 co-op', 'condo 选择', '买家策略'] },
                audiences: ['all'],
                markets: ['new-york'],
            },
            {
                id: 'playbook-li',
                title: { en: 'Why Long Island buyers need a school, tax, and commute framework before touring too much', zh: '长岛买家为什么要在大量看房前，先想清学区、房产税和通勤框架' },
                angle: { en: 'Frame Long Island decisions around school district fit, annual property tax realism, LIRR or driving commute, and the difference between Nassau and Suffolk buyer expectations.', zh: '从学区匹配、年度房产税现实、LIRR 或开车通勤，以及 Nassau 和 Suffolk 不同买家预期来讲清长岛决策。' },
                keywords: { en: ['Long Island real estate', 'school district move', 'property tax strategy'], zh: ['长岛地产', '学区搬迁', '房产税策略'] },
                audiences: ['all'],
                markets: ['long-island'],
            },
            {
                id: 'playbook-la',
                title: { en: 'How Los Angeles sellers should talk about renovation and ADU upside without overselling', zh: '洛杉矶卖家怎么讲翻新和 ADU 潜力，才不会说过头' },
                angle: { en: 'Use lifestyle, lot potential, and realistic buyer appetite rather than hype about instant value.', zh: '围绕生活方式、地块潜力和真实买家偏好，而不是夸大“立刻增值”。' },
                keywords: { en: ['Los Angeles ADU', 'renovation upside', 'seller strategy'], zh: ['洛杉矶 ADU', '翻新潜力', '卖家策略'] },
                audiences: ['all'],
                markets: ['los-angeles'],
            },
            {
                id: 'playbook-sf',
                title: { en: 'How Bay Area agents should talk to stock-comp buyers when the market feels noisy', zh: '湾区经纪人该怎么和股票薪酬型买家聊 timing' },
                angle: { en: 'Focus on payment discipline, liquidity timing, and what changes when RSUs or bonuses drive decision-making.', zh: '聚焦月供纪律、流动性节奏，以及 RSU 和 bonus 影响下的决策逻辑。' },
                keywords: { en: ['Bay Area buyer', 'RSU', 'stock compensation'], zh: ['湾区买家', 'RSU', '股票薪酬'] },
                audiences: ['all'],
                markets: ['san-francisco'],
            },
            {
                id: 'playbook-chi',
                title: { en: 'Why Chicago small multifamily and condo buyers are solving different problems', zh: '芝加哥多家庭投资房买家和 condo 买家，其实在解决不同问题' },
                angle: { en: 'Explain the split between cash-flow logic, owner-occupant value, and neighborhood identity.', zh: '解释现金流逻辑、自住价值和社区属性之间的区别。' },
                keywords: { en: ['Chicago multifamily', 'condo buyer', 'investment logic'], zh: ['芝加哥多家庭房', 'condo 买家', '投资逻辑'] },
                audiences: ['all'],
                markets: ['chicago'],
            },
            {
                id: 'playbook-mia',
                title: { en: 'How Miami agents should handle the carrying-cost conversation before a buyer falls in love', zh: '迈阿密经纪人为什么要在客户爱上房子前，先讲清持有成本' },
                angle: { en: 'Anchor the script around insurance, HOA, reserves, and lifestyle-led decision making.', zh: '重点放在保险、HOA、储备金和生活方式驱动的决定。' },
                keywords: { en: ['Miami carrying cost', 'insurance', 'condo buyer'], zh: ['迈阿密持有成本', '保险', 'condo 买家'] },
                audiences: ['all'],
                markets: ['miami'],
            },
            {
                id: 'playbook-sea',
                title: { en: 'What Seattle and Eastside buyers are really balancing when commute patterns shift', zh: '当通勤模式变化时，西雅图和 Eastside 买家真正权衡的是什么' },
                angle: { en: 'Talk about time, schools, tech employment patterns, and the move-up tradeoff between city and suburb.', zh: '围绕时间、学区、科技就业节奏，以及城市与郊区之间的改善型权衡。' },
                keywords: { en: ['Seattle Eastside', 'commute tradeoff', 'move-up buyer'], zh: ['西雅图 Eastside', '通勤权衡', '改善型买家'] },
                audiences: ['all'],
                markets: ['seattle'],
            },
            {
                id: 'playbook-bos',
                title: { en: 'How Boston-area agents should frame city versus suburb for academic and biotech relocation', zh: '大波士顿经纪人该怎么给学术和 biotech 搬迁客户讲城市与郊区' },
                angle: { en: 'Use commute, family timeline, school priorities, and historic-housing tradeoffs as the framework.', zh: '用通勤、家庭时间线、学区优先级和历史住宅取舍做框架。' },
                keywords: { en: ['Boston relocation', 'biotech hiring', 'city vs suburb'], zh: ['波士顿搬迁', 'biotech 招聘', '城市 vs 郊区'] },
                audiences: ['all'],
                markets: ['boston'],
            },
            {
                id: 'playbook-hou',
                title: { en: 'Why Houston buyers keep comparing new construction to resale, and what agents should say', zh: '休斯顿买家总在比较新房和二手房，经纪人该怎么讲' },
                angle: { en: 'Center the conversation on incentives, floorplan fit, monthly payment, and resale flexibility.', zh: '把重点放在 incentive、户型适配、月供结构和转售弹性。' },
                keywords: { en: ['Houston new construction', 'resale comparison', 'buyer strategy'], zh: ['休斯顿新房', '二手房比较', '买家策略'] },
                audiences: ['all'],
                markets: ['houston'],
            },
        ],
    },
    {
        id: 'bilingual-and-relocation',
        name: { en: 'Bilingual and relocation', zh: '华语客户与搬迁需求' },
        emoji: '🌏',
        description: {
            en: 'Topics tailored to Chinese-speaking agents serving immigrant, bilingual, and community-network-driven clients in North America.',
            zh: '面向北美华语经纪人，服务移民家庭、双语家庭和强社区网络客户的专题模块。',
        },
        topicsPerDay: 1,
        audiences: ['chinese-community'],
        topics: [
            {
                id: 'zh-01',
                title: { en: 'How Chinese-speaking agents can guide relocation families through North American housing choices', zh: '华语经纪人怎样帮助搬迁家庭理解北美住房选择' },
                angle: { en: 'Cover the emotional gap between familiar housing expectations and local market reality.', zh: '聚焦“原有住房认知”和“本地市场现实”之间的落差。' },
                keywords: { en: ['Chinese-speaking clients', 'relocation family', 'housing education'], zh: ['华语客户', '搬迁家庭', '住房教育'] },
                audiences: ['chinese-community'],
            },
            {
                id: 'zh-02',
                title: { en: 'What bilingual buyer consultations should clarify in the first meeting', zh: '双语买家第一次咨询，最该先讲清什么' },
                angle: { en: 'Frame trust-building around financing language, process expectations, and decision roles inside the family.', zh: '从贷款术语、流程预期和家庭内部决策角色切入。' },
                keywords: { en: ['bilingual consultation', 'Chinese buyer', 'agent trust'], zh: ['双语咨询', '华语买家', '信任建立'] },
                audiences: ['chinese-community'],
            },
            {
                id: 'zh-03',
                title: { en: 'How agents should talk about parents buying for children without overcomplicating the message', zh: '父母帮子女置业这件事，内容该怎么讲才清楚' },
                angle: { en: 'Keep it focused on budgeting, decision structure, timing, and family coordination rather than tax advice.', zh: '重点讲预算、决策结构、时间安排和家庭协同，而不是深入税务细节。' },
                keywords: { en: ['parents buying for children', 'family purchase', 'Chinese-speaking clients'], zh: ['父母帮子女买房', '家庭置业', '华语客户'] },
                audiences: ['chinese-community'],
            },
            {
                id: 'zh-04',
                title: { en: 'Community trust content: how Chinese-speaking agents should position local expertise', zh: '面向华语社区做内容时，经纪人怎样建立“本地很懂”的信任感' },
                angle: { en: 'Show how to combine local market knowledge with bilingual communication instead of relying on cultural shorthand alone.', zh: '强调“本地市场理解 + 双语表达”，而不是只靠身份标签。' },
                keywords: { en: ['community trust', 'bilingual agent', 'local expertise'], zh: ['社区信任', '双语经纪人', '本地专业度'] },
                audiences: ['chinese-community'],
            },
            {
                id: 'zh-05',
                title: { en: 'How Chinese-speaking seller education should balance emotion and strategy', zh: '华语卖家教育内容，怎样平衡情绪和策略' },
                angle: { en: 'Focus on expectation-setting, family discussion dynamics, and pricing discipline.', zh: '重点讲预期管理、家庭讨论结构和定价纪律。' },
                keywords: { en: ['Chinese seller', 'seller education', 'listing strategy'], zh: ['华语卖家', '卖家教育', '上市策略'] },
                audiences: ['chinese-community'],
            },
            {
                id: 'zh-06',
                title: { en: 'How to explain North American transaction timelines to clients who expect a different process', zh: '怎么向习惯不同流程的客户解释北美交易时间线' },
                angle: { en: 'Turn escrow, financing, inspections, and contingencies into a reassuring step-by-step story.', zh: '把 escrow、贷款、验房和 contingencies 讲成一套让人安心的步骤。' },
                keywords: { en: ['transaction timeline', 'Chinese-speaking clients', 'buyer process'], zh: ['交易时间线', '华语客户', '买房流程'] },
                audiences: ['chinese-community'],
            },
        ],
    },
];

function resolveTopic(topic: TopicDefinition, language: Language): TopicItem {
    return {
        id: topic.id,
        title: t(topic.title, language),
        angle: t(topic.angle, language),
        keywords: list(topic.keywords, language),
    };
}

function resolveModule(module: ModuleDefinition, language: Language, market: MarketId, audienceProfile: AudienceProfile): ContentModule | null {
    if (!supportsAudience(module.audiences, audienceProfile)) {
        return null;
    }

    const topics = module.topics
        .filter((topic) => supportsAudience(topic.audiences, audienceProfile) && supportsMarket(topic.markets, market))
        .map((topic) => resolveTopic(topic, language));

    if (topics.length === 0) {
        return null;
    }

    return {
        id: module.id,
        name: t(module.name, language),
        emoji: module.emoji,
        description: t(module.description, language),
        topicsPerDay: module.topicsPerDay,
        topics,
    };
}

export function getActiveContentModules(language: Language, market: MarketId, audienceProfile: AudienceProfile): ContentModule[] {
    return modules
        .map((module) => resolveModule(module, language, market, audienceProfile))
        .filter((module): module is ContentModule => Boolean(module));
}

export function getTodayTopics(module: ContentModule, dateStr: string): TopicItem[] {
    const dayNum = dateToDayNumber(dateStr);
    const pool = module.topics;
    const count = Math.min(module.topicsPerDay, pool.length);

    const startIdx = (dayNum * count) % pool.length;
    const selected: TopicItem[] = [];

    for (let i = 0; i < count; i += 1) {
        selected.push(pool[(startIdx + i) % pool.length]);
    }

    return selected;
}

function dateToDayNumber(dateStr: string): number {
    const date = new Date(`${dateStr}T00:00:00Z`);
    const epoch = new Date('2026-01-01T00:00:00Z');
    return Math.floor((date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
}
