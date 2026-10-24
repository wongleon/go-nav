"use client";

import { memo, useEffect, useState } from "react";
import {
	DAILY_SENTENCE_API_URL,
	parseDailySentence,
	type DailySentence as DailySentenceData,
} from "@/lib/daily-sentence";
import { COMPACT_CARD_SURFACE_CLASS } from "./ui/ui.constants";

/**
 * 每日一言：首页搜索栏下方展示 ONE 一个当天的图文文案。
 * server 模式走 /api/daily-sentence 服务端代理（避免 https 页面请求 http 接口被拦截）；
 * 静态导出模式没有 API 路由，回退为直连上游接口（该接口已允许跨域）。
 */
export const DailySentence = memo(function DailySentence() {
	const [sentence, setSentence] = useState<DailySentenceData | null>(null);

	useEffect(() => {
		let active = true;
		void loadDailySentence().then((result) => {
			if (active && result) setSentence(result);
		});
		return () => {
			active = false;
		};
	}, []);

	if (!sentence) return null;

	const attribution = [sentence.author, sentence.source]
		.filter(Boolean)
		.join(" ");

	return (
		<section
			aria-label="每日一言"
			className={`mx-3 mt-2 mb-2 px-4 py-3 text-center ${COMPACT_CARD_SURFACE_CLASS}`}
		>
			<p className="text-sm leading-relaxed text-foreground">
				「{sentence.text}」
			</p>
			{attribution ? (
				<p className="mt-1 text-xs text-muted">—— {attribution}</p>
			) : null}
		</section>
	);
});

async function loadDailySentence(): Promise<DailySentenceData | null> {
	try {
		const res = await fetch("/api/daily-sentence", { cache: "no-store" });
		if (res.ok && isJsonResponse(res)) {
			return (await res.json()) as DailySentenceData;
		}
	} catch {
		// 静态托管下没有该接口，继续尝试直连上游。
	}

	try {
		const res = await fetch(DAILY_SENTENCE_API_URL, { cache: "no-store" });
		if (!res.ok) return null;
		return parseDailySentence(await res.json());
	} catch {
		// 接口不可用时静默隐藏，不影响首页其它内容。
		return null;
	}
}

function isJsonResponse(res: Response): boolean {
	return res.headers.get("content-type")?.includes("application/json") ?? false;
}
