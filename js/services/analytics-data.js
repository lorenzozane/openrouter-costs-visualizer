export const ANALYTICS_COLUMNS = [
	'date_utc', 'model', 'request_count', 'total_usage', 'credits_usage',
	'byok_usage', 'tokens_prompt', 'tokens_completion', 'reasoning_tokens'
];

const NUMBER_COLUMNS = ANALYTICS_COLUMNS.slice(2);
const REQUIRED_METRICS = NUMBER_COLUMNS;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value) {
	const date = String(value).slice(0, 10);
	const parsed = DATE_PATTERN.test(date) ? new Date(`${date}T00:00:00Z`) : null;
	if (!parsed || !Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== date) {
		throw new Error('Invalid UTC date in analytics data.');
	}
	return date;
}

function normalizeRow(row) {
	const rawDate = String(row.date_utc ?? row.date__day ?? '');
	// The Analytics API documents both YYYY-MM-DD and UTC ISO timestamps for date__day.
	if (!DATE_PATTERN.test(rawDate) && !/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.\d+)?Z$/.test(rawDate)) {
		throw new Error('Invalid UTC date in analytics data.');
	}
	const date_utc = parseDate(row.date_utc ?? row.date__day);
	const model = String(row.model ?? '').trim();
	if (!model || /^[=+\-@\t\r]/.test(model) || /[\r\n]/.test(model)) {
		throw new Error('Invalid model in analytics data.');
	}
	const result = { date_utc, model };
	for (const field of NUMBER_COLUMNS) {
		const value = Number(row[field]);
		if (row[field] === '' || row[field] == null || !Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid ${field} in analytics data.`);
		}
		result[field] = value;
	}
	if (!Number.isSafeInteger(result.request_count)) throw new Error('Invalid request count in analytics data.');
	return result;
}

export function normalizeAnalyticsRows(rows) {
	if (!Array.isArray(rows)) throw new Error('Invalid analytics response.');
	const seen = new Set();
	return rows.map(row => {
		const normalized = normalizeRow(row);
		const identity = `${normalized.date_utc}\u0000${normalized.model}`;
		if (seen.has(identity)) throw new Error('Duplicate model and day in analytics data.');
		seen.add(identity);
		return normalized;
	}).sort((a, b) => a.date_utc.localeCompare(b.date_utc) || a.model.localeCompare(b.model));
}

function parseCSV(text) {
	const records = [];
	let record = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
			else if (char === '"') quoted = false;
			else field += char;
		} else if (char === '"' && field === '') quoted = true;
		else if (char === ',') { record.push(field); field = ''; }
		else if (char === '\n') { record.push(field.replace(/\r$/, '')); records.push(record); record = []; field = ''; }
		else field += char;
	}
	if (quoted) throw new Error('Unclosed quoted field in CSV.');
	if (field || record.length) { record.push(field.replace(/\r$/, '')); records.push(record); }
	return records;
}

export function importAnalyticsCSV(text) {
	const records = parseCSV(String(text).replace(/^\uFEFF/, ''));
	if (!records.length || records[0].join(',') !== ANALYTICS_COLUMNS.join(',')) {
		throw new Error('This is not an exported OpenRouter Analytics CSV.');
	}
	return normalizeAnalyticsRows(records.slice(1).filter(record => record.some(Boolean)).map(record => {
		if (record.length !== ANALYTICS_COLUMNS.length) throw new Error('Invalid analytics CSV row.');
		return Object.fromEntries(ANALYTICS_COLUMNS.map((column, index) => [column, record[index]]));
	}));
}

export function exportAnalyticsCSV(rows) {
	const clean = normalizeAnalyticsRows(rows);
	const encode = value => `"${String(value).replaceAll('"', '""')}"`;
	return [ANALYTICS_COLUMNS.join(','), ...clean.map(row => ANALYTICS_COLUMNS.map(column => encode(row[column])).join(','))].join('\r\n') + '\r\n';
}

function utcDay(date) { return date.toISOString().slice(0, 10); }

export function splitUTCDateRange(from, to) {
	const start = new Date(`${from}T00:00:00Z`);
	const end = new Date(`${to}T00:00:00Z`);
	if (!Number.isFinite(+start) || !Number.isFinite(+end) || utcDay(start) !== from || utcDay(end) !== to || start > end) {
		throw new Error('Choose a valid UTC date range.');
	}
	const exclusiveEnd = new Date(+end + 86400000);
	if ((exclusiveEnd - start) / 86400000 > 365) throw new Error('Choose a range of 365 days or less.');
	const ranges = [];
	for (let cursor = start; cursor < exclusiveEnd;) {
		const next = new Date(Math.min(+exclusiveEnd, +cursor + 28 * 86400000));
		ranges.push({ start: cursor.toISOString(), end: next.toISOString() });
		cursor = next;
	}
	return ranges;
}

async function request(url, key, options, signal) {
	let response;
	try {
		response = await fetch(url, {
			...options, signal, cache: 'no-store', referrerPolicy: 'no-referrer',
			headers: { Authorization: `Bearer ${key}`, ...options.headers }
		});
	} catch (error) {
		if (error.name === 'AbortError') throw error;
		throw new Error('Could not reach OpenRouter from this browser. Check your connection or browser cross-origin settings.');
	}
	if (response.status === 401) throw new Error('The management key is invalid or expired.');
	if (response.status === 403) throw new Error('Analytics requires a management key; a regular API key cannot access it.');
	if (response.status === 400) throw new Error('OpenRouter rejected this analytics query. Try a shorter date range.');
	if (response.status === 408) throw new Error('OpenRouter timed out. Try a shorter date range.');
	if (response.status === 429) throw new Error('OpenRouter is rate limiting requests. Try again later.');
	if (!response.ok) throw new Error(`OpenRouter returned HTTP ${response.status}.`);
	return response.json();
}

export async function fetchAnalytics(key, ranges, { signal, onProgress } = {}) {
	const base = 'https://openrouter.ai/api/v1/analytics';
	const meta = await request(`${base}/meta`, key, {}, signal);
	const metrics = new Set(meta?.data?.metrics?.map(item => item.name));
	const dimensions = new Set(meta?.data?.dimensions?.map(item => item.name));
	if (!REQUIRED_METRICS.every(metric => metrics.has(metric)) || !dimensions.has('model')) {
		throw new Error('OpenRouter Analytics does not expose the fields this dashboard needs.');
	}
	const rows = [];
	for (let i = 0; i < ranges.length; i++) {
		onProgress?.(i + 1, ranges.length);
		const payload = {
			metrics: REQUIRED_METRICS, dimensions: ['model'], granularity: 'day',
			time_range: ranges[i], limit: 10000
		};
		const result = await request(`${base}/query`, key, {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
		}, signal);
		if (result?.data?.metadata?.truncated !== false || !Array.isArray(result?.data?.data)) {
			throw new Error('OpenRouter returned incomplete analytics data. Try a shorter date range.');
		}
		rows.push(...result.data.data);
	}
	return normalizeAnalyticsRows(rows);
}
