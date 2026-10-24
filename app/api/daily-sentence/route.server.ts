import { NextResponse } from "next/server";
import {
	DAILY_SENTENCE_API_URL,
	parseDailySentence,
	type DailySentence,
} from "@/lib/daily-sentence";

const REQUEST_TIMEOUT = 10_000;

/** 当日缓存：接口每天只更新一次，避免每次访问页面都请求上游。 */
let cached: { day: string; sentence: DailySentence } | null = null;

/** 取东八区日期作为缓存键，跨天后自动重新拉取。 */
function currentDayKey(): string {
	return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * 每日一言：代理 ONE 一个的每日图文接口。
 * GET /api/daily-sentence
 */
export async function GET() {
	const day = currentDayKey();
	if (cached?.day === day) {
		return NextResponse.json(cached.sentence);
	}

	try {
		const res = await fetch(DAILY_SENTENCE_API_URL, {
			cache: "no-store",
			signal: AbortSignal.timeout(REQUEST_TIMEOUT),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);

		const sentence = parseDailySentence(await res.json());
		if (!sentence) throw new Error("接口未返回有效文案");

		cached = { day, sentence };
		return NextResponse.json(sentence);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message || "获取每日一言失败" },
			{ status: 502 },
		);
	}
}
