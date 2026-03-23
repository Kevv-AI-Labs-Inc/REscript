export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface UsageObserverMeta {
    itemLabel?: string;
    step?: string;
    scriptsGenerated?: number;
}

export interface GenerationObserver {
    onStep?: (step: string) => void;
    onUsage?: (usage: TokenUsage, meta?: UsageObserverMeta) => void;
}

export function emptyUsage(): TokenUsage {
    return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
    };
}

export function addUsage(left: TokenUsage, right: Partial<TokenUsage> | null | undefined): TokenUsage {
    return {
        promptTokens: left.promptTokens + Number(right?.promptTokens || 0),
        completionTokens: left.completionTokens + Number(right?.completionTokens || 0),
        totalTokens: left.totalTokens + Number(right?.totalTokens || 0),
    };
}

export function normalizeUsage(payload: any): TokenUsage {
    const usage = payload?.usage || payload?.response?.usage || null;

    if (!usage) {
        return emptyUsage();
    }

    const promptTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? usage.promptTokens ?? 0);
    const completionTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? usage.completionTokens ?? 0);
    const totalTokens = Number(usage.total_tokens ?? usage.totalTokens ?? (promptTokens + completionTokens));

    return {
        promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
        completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
        totalTokens: Number.isFinite(totalTokens) ? totalTokens : promptTokens + completionTokens,
    };
}

export function estimateCostUsd(usage: TokenUsage, inputCostPer1M: number, outputCostPer1M: number): number {
    if (inputCostPer1M <= 0 && outputCostPer1M <= 0) {
        return 0;
    }

    const inputCost = (usage.promptTokens / 1_000_000) * inputCostPer1M;
    const outputCost = (usage.completionTokens / 1_000_000) * outputCostPer1M;
    return Number((inputCost + outputCost).toFixed(6));
}
