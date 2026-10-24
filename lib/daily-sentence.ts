/** ONE 一个「每日图文」接口地址，服务端代理与静态模式直连共用。 */
export const DAILY_SENTENCE_API_URL =
	"http://v3.wufazhuce.com:8000/api/channel/one/0/0";

export type DailySentence = {
	/** 文案正文 */
	text: string;
	/** 文案作者 */
	author: string;
	/** 作品出处，例如 "from 《我们一无所有》" */
	source: string;
};

type OneApiContent = {
	category?: string;
	forward?: string;
	text_author_info?: {
		text_author_name?: string;
		text_author_work?: string;
	} | null;
};

type OneApiResponse = {
	res?: number;
	data?: { content_list?: OneApiContent[] };
};

/** 从 ONE 接口响应中解析当天的图文文案，解析失败返回 null。 */
export function parseDailySentence(payload: unknown): DailySentence | null {
	const list = (payload as OneApiResponse | null)?.data?.content_list;
	if (!Array.isArray(list)) return null;

	// category 为 "0" 的是每日图文，缺失时退回第一条内容。
	const target = list.find((item) => item?.category === "0") ?? list[0];
	const text = target?.forward?.trim();
	if (!text) return null;

	return {
		text,
		author: target?.text_author_info?.text_author_name?.trim() ?? "",
		source: target?.text_author_info?.text_author_work?.trim() ?? "",
	};
}
