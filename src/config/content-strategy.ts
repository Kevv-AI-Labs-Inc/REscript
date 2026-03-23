import type { AudienceProfile, Language, MarketId } from '../store/client-store.js';

type LocalizedText = Record<Language, string>;

interface MarketContext {
    displayName: LocalizedText;
    metroLabel: LocalizedText;
    neighborhoods: string[];
    housingMix: LocalizedText;
    demandDrivers: LocalizedText;
    agentAngles: LocalizedText;
}

interface AudienceContext {
    label: LocalizedText;
    agentProfile: LocalizedText;
    clientProfile: LocalizedText;
    platformMix: Record<Language, string[]>;
    voiceGuide: LocalizedText;
}

const MARKET_CONTEXTS: Record<MarketId, MarketContext> = {
    'new-york': {
        displayName: { en: 'New York', zh: '纽约' },
        metroLabel: { en: 'New York City metro', zh: '纽约都会区' },
        neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Long Island City', 'Astoria', 'Flushing', 'Jersey City', 'Park Slope'],
        housingMix: {
            en: 'Co-ops, condos, brownstones, small multifamily buildings, commuter suburbs, and luxury urban towers.',
            zh: '以 co-op、condo、brownstone、小型多家庭房、通勤郊区独栋和高端城市公寓为主。',
        },
        demandDrivers: {
            en: 'Low inventory, payment sensitivity, relocation demand, school and commute tradeoffs, and neighborhood-by-neighborhood pricing gaps.',
            zh: '低库存、月供敏感、搬迁需求、学区与通勤权衡，以及不同社区之间明显的定价分化。',
        },
        agentAngles: {
            en: 'Use neighborhood-level nuance, co-op and condo process awareness, and move-up or downsizer strategy.',
            zh: '内容应强调社区层面的差异、co-op/condo 流程认知，以及换房和 downsizing 场景。',
        },
    },
    'long-island': {
        displayName: { en: 'Long Island', zh: '纽约州长岛' },
        metroLabel: { en: 'Long Island / Nassau and Suffolk Counties', zh: '长岛（Nassau / Suffolk）' },
        neighborhoods: ['Great Neck', 'Manhasset', 'Roslyn', 'Jericho', 'Syosset', 'Plainview', 'Huntington', 'Port Washington'],
        housingMix: {
            en: 'School-district-driven suburban single-family homes, village-center inventory, commuter-friendly co-ops and condos, waterfront listings, and move-up family housing.',
            zh: '以学区驱动的郊区独栋、村镇核心区房源、通勤友好的 co-op/condo、临水住宅和改善型家庭住房为主。',
        },
        demandDrivers: {
            en: 'School district decisions, LIRR commute patterns, property tax sensitivity, move-out demand from New York City, and inventory differences between Nassau and Suffolk.',
            zh: '学区选择、LIRR 通勤模式、房产税敏感、纽约市外溢搬迁需求，以及 Nassau 与 Suffolk 之间明显的库存差异。',
        },
        agentAngles: {
            en: 'Lean into town-by-town nuance, school and commute tradeoffs, tax realism, family move-up narratives, and village-versus-hamlet positioning.',
            zh: '内容适合强调 town-by-town 的差异、学区与通勤权衡、房产税现实、家庭改善型迁移，以及 village 与 hamlet 的定位差别。',
        },
    },
    'los-angeles': {
        displayName: { en: 'Los Angeles', zh: '洛杉矶' },
        metroLabel: { en: 'Greater Los Angeles', zh: '大洛杉矶地区' },
        neighborhoods: ['Beverly Grove', 'Santa Monica', 'Pasadena', 'Torrance', 'Glendale', 'Culver City', 'Arcadia', 'Irvine'],
        housingMix: {
            en: 'Single-family homes, hillside luxury, condos, ADU-driven properties, and suburban family neighborhoods.',
            zh: '以独栋住宅、山景豪宅、condo、带 ADU 的房产和家庭型郊区社区为主。',
        },
        demandDrivers: {
            en: 'Affordability pressure, lifestyle migration, school district decisions, ADU potential, and neighborhood prestige.',
            zh: '可负担性压力、生活方式迁移、学区选择、ADU 潜力以及社区品牌感知。',
        },
        agentAngles: {
            en: 'Lean into lifestyle storytelling, renovation or ADU upside, and local commute patterns.',
            zh: '内容适合突出生活方式、翻新与 ADU 潜力，以及本地通勤方式变化。',
        },
    },
    'san-francisco': {
        displayName: { en: 'San Francisco Bay Area', zh: '旧金山湾区' },
        metroLabel: { en: 'San Francisco Bay Area', zh: '旧金山湾区' },
        neighborhoods: ['San Francisco', 'Palo Alto', 'Sunnyvale', 'San Mateo', 'Oakland', 'Walnut Creek', 'Fremont', 'Cupertino'],
        housingMix: {
            en: 'High-price single-family inventory, condos, townhomes, and tech-driven suburban family markets.',
            zh: '以高价独栋、condo、townhome 以及受科技就业驱动的郊区家庭市场为主。',
        },
        demandDrivers: {
            en: 'Rate sensitivity at high price points, stock-comp or RSU buyers, school-driven relocation, and inventory constraints.',
            zh: '高总价下的利率敏感、RSU/股票型买家、学区迁居需求，以及库存紧张。',
        },
        agentAngles: {
            en: 'Focus on total payment strategy, tech wealth timing, and district-by-district lifestyle differences.',
            zh: '内容适合强调总月供策略、科技资产兑现节奏，以及不同学区和生活圈差异。',
        },
    },
    'chicago': {
        displayName: { en: 'Chicago', zh: '芝加哥' },
        metroLabel: { en: 'Chicago metro', zh: '芝加哥都会区' },
        neighborhoods: ['Lincoln Park', 'Lakeview', 'West Loop', 'Naperville', 'Evanston', 'Schaumburg', 'Oak Park', 'Wicker Park'],
        housingMix: {
            en: 'Urban condos, classic two-flats, suburban single-family homes, and cash-flow-focused small multifamily stock.',
            zh: '包括市区 condo、传统 two-flat、多家庭投资房，以及郊区独栋住宅。',
        },
        demandDrivers: {
            en: 'Value relative to coastal markets, neighborhood identity, transit vs suburb tradeoffs, and multifamily interest.',
            zh: '相对海岸市场的性价比、社区个性、地铁与郊区平衡，以及多家庭投资需求。',
        },
        agentAngles: {
            en: 'Highlight neighborhood character, small multifamily economics, and move-up affordability narratives.',
            zh: '内容适合突出社区风格、小型多家庭投资逻辑，以及改善型置业的可负担性。',
        },
    },
    'miami': {
        displayName: { en: 'Miami', zh: '迈阿密' },
        metroLabel: { en: 'South Florida', zh: '南佛罗里达' },
        neighborhoods: ['Brickell', 'Coral Gables', 'Aventura', 'Doral', 'Miami Beach', 'Wynwood', 'Fort Lauderdale', 'Weston'],
        housingMix: {
            en: 'Condo-heavy coastal inventory, luxury towers, suburban family enclaves, and second-home or investor properties.',
            zh: '以海滨 condo、高端公寓、家庭型郊区社区，以及第二居所和投资房为主。',
        },
        demandDrivers: {
            en: 'Relocation demand, insurance and carrying-cost conversations, international capital, and lifestyle-led buying.',
            zh: '搬迁需求、保险和持有成本讨论、国际资金流入，以及生活方式驱动的购房。',
        },
        agentAngles: {
            en: 'Use relocation, cash-flow, and carrying-cost narratives instead of generic luxury hype.',
            zh: '内容应更多围绕 relocation、现金流和持有成本，而不是空泛豪宅叙事。',
        },
    },
    'seattle': {
        displayName: { en: 'Seattle', zh: '西雅图' },
        metroLabel: { en: 'Seattle metro', zh: '西雅图都会区' },
        neighborhoods: ['Bellevue', 'Kirkland', 'Ballard', 'Queen Anne', 'Redmond', 'Bothell', 'Capitol Hill', 'Sammamish'],
        housingMix: {
            en: 'Tech-oriented suburban homes, townhomes, urban condos, and high-demand family neighborhoods on the Eastside.',
            zh: '包括科技就业驱动的郊区独栋、townhome、市区 condo，以及 Eastside 家庭社区。',
        },
        demandDrivers: {
            en: 'Tech employment cycles, school-driven buying, move-up competition, and inventory swings by micro-market.',
            zh: '科技就业周期、学区型购房、改善型竞争，以及不同子市场的库存波动。',
        },
        agentAngles: {
            en: 'Emphasize commute tradeoffs, Eastside demand, and pragmatic move-up decision making.',
            zh: '内容适合强调通勤平衡、Eastside 需求，以及务实的改善型决策。',
        },
    },
    'boston': {
        displayName: { en: 'Boston', zh: '波士顿' },
        metroLabel: { en: 'Greater Boston', zh: '大波士顿地区' },
        neighborhoods: ['Back Bay', 'South End', 'Cambridge', 'Somerville', 'Newton', 'Brookline', 'Lexington', 'Quincy'],
        housingMix: {
            en: 'Historic housing stock, condos, dense suburban family towns, and academic or biotech-driven demand pockets.',
            zh: '拥有大量历史住宅、condo、密集型家庭郊区，以及学术和 biotech 驱动的需求板块。',
        },
        demandDrivers: {
            en: 'Academic relocation, biotech hiring, school-conscious buyers, and tight neighborhood-level inventory.',
            zh: '高校与科研搬迁、biotech 招聘、学区型买家，以及社区级库存紧张。',
        },
        agentAngles: {
            en: 'Lean into education-linked relocation, historic-home positioning, and suburb-versus-city decisions.',
            zh: '内容适合聚焦教育搬迁、历史住宅定位，以及城市与郊区之间的选择。',
        },
    },
    'houston': {
        displayName: { en: 'Houston', zh: '休斯顿' },
        metroLabel: { en: 'Houston metro', zh: '休斯顿都会区' },
        neighborhoods: ['The Heights', 'Sugar Land', 'Katy', 'The Woodlands', 'Bellaire', 'Memorial', 'Pearland', 'Midtown'],
        housingMix: {
            en: 'Single-family suburbs, master-planned communities, inner-loop townhomes, and value-oriented move-up inventory.',
            zh: '以郊区独栋、总体规划社区、内环 townhome，以及改善型高性价比房源为主。',
        },
        demandDrivers: {
            en: 'Corporate relocation, payment-driven search, new construction competition, and suburb lifestyle decisions.',
            zh: '企业搬迁、月供驱动的购房搜索、新房竞争，以及典型郊区生活方式决策。',
        },
        agentAngles: {
            en: 'Focus on space, monthly payment strategy, and the tradeoff between new builds and resale homes.',
            zh: '内容适合围绕空间、月供策略，以及新房与二手房之间的权衡。',
        },
    },
};

const AUDIENCE_CONTEXTS: Record<AudienceProfile, AudienceContext> = {
    general: {
        label: { en: 'North American agent audience', zh: '北美经纪人受众' },
        agentProfile: {
            en: 'Residential agents, team leads, and marketing operators serving local buyers, sellers, relocators, and investors.',
            zh: '服务本地买家、卖家、搬迁客户和投资者的住宅地产经纪人、团队负责人和营销运营。',
        },
        clientProfile: {
            en: 'Mainstream North American households, move-up buyers, downsizers, local investors, and relocation clients.',
            zh: '主流北美家庭、改善型买家、downsizer、本地投资者和搬迁客户。',
        },
        platformMix: {
            en: ['Instagram Reels', 'TikTok', 'YouTube', 'LinkedIn', 'Email newsletter'],
            zh: ['Instagram Reels', 'TikTok', 'YouTube', 'LinkedIn', 'Email newsletter'],
        },
        voiceGuide: {
            en: 'Commercial, credible, local, and easy to film. Sound like a working agent who understands market timing and client hesitation.',
            zh: '商业化、可信、本地化且易于上镜，要像真正懂市场和客户犹豫点的经纪人。',
        },
    },
    'chinese-community': {
        label: { en: 'Chinese-speaking North American agent audience', zh: '北美华语经纪人受众' },
        agentProfile: {
            en: 'Chinese-speaking agents serving immigrant families, bilingual households, overseas connections, relocators, and culturally specific community networks.',
            zh: '服务移民家庭、双语家庭、海外联动客户、搬迁客户和社区网络的华语经纪人。',
        },
        clientProfile: {
            en: 'Chinese-speaking buyers, sellers, parents buying for children, first-generation immigrant households, and cross-border or relocation-minded families.',
            zh: '华语买家、卖家、为子女置业的家庭、第一代移民家庭，以及带跨境或搬迁需求的客户。',
        },
        platformMix: {
            en: ['Xiaohongshu', 'WeChat Channels', 'YouTube', 'Instagram Reels'],
            zh: ['小红书', '视频号', 'YouTube', 'Instagram Reels'],
        },
        voiceGuide: {
            en: 'Warm but authoritative, bilingual-friendly, and trust-building. Keep North American market logic intact while acknowledging immigrant and community-specific concerns.',
            zh: '语气要亲切但专业，适合双语社交环境，同时保持北美市场逻辑，并理解移民家庭和社区型客户的真实顾虑。',
        },
    },
};

const PLATFORM_OPTIONS: Record<AudienceProfile, Record<Language, string[]>> = {
    general: {
        en: ['Instagram Reels', 'TikTok', 'YouTube', 'LinkedIn', 'General'],
        zh: ['Instagram Reels', 'TikTok', 'YouTube', 'LinkedIn', '通用'],
    },
    'chinese-community': {
        en: ['Instagram Reels', 'YouTube', 'WeChat Channels', 'Xiaohongshu', 'General'],
        zh: ['小红书', '视频号', 'YouTube', 'Instagram Reels', '通用'],
    },
};

function localize(text: LocalizedText, language: Language): string {
    return text[language];
}

export function getMarketContext(market: MarketId, language: Language) {
    const context = MARKET_CONTEXTS[market];
    return {
        market,
        marketName: localize(context.displayName, language),
        metroLabel: localize(context.metroLabel, language),
        neighborhoods: context.neighborhoods,
        housingMix: localize(context.housingMix, language),
        demandDrivers: localize(context.demandDrivers, language),
        agentAngles: localize(context.agentAngles, language),
    };
}

export function getAudienceContext(audienceProfile: AudienceProfile, language: Language) {
    const context = AUDIENCE_CONTEXTS[audienceProfile];
    return {
        label: localize(context.label, language),
        agentProfile: localize(context.agentProfile, language),
        clientProfile: localize(context.clientProfile, language),
        platformMix: context.platformMix[language],
        voiceGuide: localize(context.voiceGuide, language),
    };
}

export function getPlatformOptions(audienceProfile: AudienceProfile, language: Language): string[] {
    return PLATFORM_OPTIONS[audienceProfile][language];
}

export function getPromptGuardrails(language: Language): string[] {
    if (language === 'en') {
        return [
            'Do not invent mortgage rates, tax thresholds, school rankings, DOM figures, or legal rules unless the source input provides them.',
            'When hard evidence is missing, frame insights as agent observations, decision frameworks, or client questions rather than fake statistics.',
            'Neighborhood mentions must come from the selected market context or the source article itself.',
            'If taxes, legal process, fair housing, or compliance issues arise, keep the guidance high-level and tell the viewer to confirm with licensed local professionals.',
        ];
    }

    return [
        '不要臆造贷款利率、税率门槛、学区排名、DOM 数据或具体法规，除非输入里明确提供。',
        '当缺少硬数据时，应输出经纪人视角的判断框架和客户决策建议，而不是伪造数字。',
        '提到的社区名称应来自所选市场画像或原始新闻来源，避免跨城乱写。',
        '涉及税务、法律、公平住房或合规时，只能做高层次提醒，并提示观众向当地持牌专业人士确认。',
    ];
}
