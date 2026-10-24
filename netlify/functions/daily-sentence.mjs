// Netlify Function：转发 ONE 一个的每日图文接口。
// 上游只提供 http://v3.wufazhuce.com:8000，https 页面无法直连（混合内容会被浏览器拦截），
// 因此在 Netlify 上由函数在服务端请求后返回给前端。
const UPSTREAM = "http://v3.wufazhuce.com:8000/api/channel/one/0/0";
const REQUEST_TIMEOUT = 9_000;

/** 当日缓存：接口每天只更新一次，避免每次访问都请求上游。 */
let cached = null;

/** 取东八区日期作为缓存键。 */
function currentDayKey() {
	return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 从接口响应中解析文案，逻辑与 lib/daily-sentence.ts 保持一致。 */
function parseDailySentence(payload) {
	const list = payload?.data?.content_list;
	if (!Array.isArray(list)) return null;

	const target = list.find((item) => item?.category === "0") ?? list[0];
	const text = target?.forward?.trim();
	if (!text) return null;

	return {
		text,
		author: target?.text_author_info?.text_author_name?.trim() ?? "",
		source: target?.text_author_info?.text_author_work?.trim() ?? "",
	};
}

function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			// 浏览器与 CDN 缓存半小时，减少函数调用次数。
			"Cache-Control": "public, max-age=1800",
		},
	});
}

export default async () => {
	const day = currentDayKey();
	if (cached?.day === day) {
		return jsonResponse(cached.sentence);
	}

	try {
		const res = await fetch(UPSTREAM, {
			signal: AbortSignal.timeout(REQUEST_TIMEOUT),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);

		const sentence = parseDailySentence(await res.json());
		if (!sentence) throw new Error("接口未返回有效文案");

		cached = { day, sentence };
		return jsonResponse(sentence);
	} catch (e) {
		return jsonResponse(
			{ error: e?.message || "获取每日一言失败" },
			502,
		);
	}
};
