import test from 'node:test';
import assert from 'node:assert/strict';
import {
	exportAnalyticsCSV, importAnalyticsCSV, normalizeAnalyticsRows,
	splitUTCDateRange, fetchAnalytics
} from '../js/services/analytics-data.js';

const row = {
	date_utc: '2026-09-25', model: 'openai/gpt-4.1', request_count: 5,
	total_usage: 0.123456, credits_usage: 0.1, byok_usage: 0.023456,
	tokens_prompt: 100, tokens_completion: 50, reasoning_tokens: 10
};

test('exported aggregate CSV reimports without turning five requests into one', () => {
	const csv = exportAnalyticsCSV([row]);
	assert.deepEqual(importAnalyticsCSV(csv), [row]);
	assert.equal(importAnalyticsCSV(csv)[0].request_count, 5);
	assert.match(csv, /^date_utc,model,request_count,/);
});

test('rejects duplicate buckets, malformed dates, and spreadsheet formulas', () => {
	assert.throws(() => normalizeAnalyticsRows([row, row]), /Duplicate/);
	assert.throws(() => normalizeAnalyticsRows([{ ...row, date_utc: '2026-02-30' }]), /date/);
	assert.throws(() => normalizeAnalyticsRows([{ ...row, model: '=HYPERLINK(1)' }]), /model/);
});

test('splits the inclusive UTC range without gaps or exceeding 365 days', () => {
	const parts = splitUTCDateRange('2026-01-01', '2026-03-01');
	assert.equal(parts[0].start, '2026-01-01T00:00:00.000Z');
	assert.equal(parts.at(-1).end, '2026-03-02T00:00:00.000Z');
	for (let i = 1; i < parts.length; i++) assert.equal(parts[i - 1].end, parts[i].start);
	assert.throws(() => splitUTCDateRange('2025-01-01', '2026-01-01'), /365/);
});

test('queries available metrics and refuses a truncated response', async () => {
	const originalFetch = globalThis.fetch;
	const calls = [];
	globalThis.fetch = async (url, options) => {
		calls.push({ url, options });
		return {
			ok: true,
			json: async () => url.endsWith('/meta')
				? { data: { metrics: Object.keys(row).slice(2).map(name => ({ name })), dimensions: [{ name: 'model' }] } }
				: { data: { data: [], metadata: { truncated: true } } }
		};
	};
	try {
		await assert.rejects(fetchAnalytics('test-key', splitUTCDateRange('2026-09-01', '2026-09-02')), /incomplete/);
		assert.equal(calls.length, 2);
		assert.equal(calls[1].options.headers.Authorization, 'Bearer test-key');
		assert.equal(JSON.parse(calls[1].options.body).dimensions[0], 'model');
	} finally { globalThis.fetch = originalFetch; }
});

test('normalizes successful daily model query results', async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async url => ({
		ok: true,
		json: async () => url.endsWith('/meta')
			? { data: { metrics: Object.keys(row).slice(2).map(name => ({ name })), dimensions: [{ name: 'model' }] } }
			: { data: { data: [{ ...row, date_utc: undefined, date__day: '2026-09-25' }], metadata: { truncated: false } } }
	});
	try {
		assert.deepEqual(await fetchAnalytics('test-key', splitUTCDateRange('2026-09-25', '2026-09-25')), [row]);
	} finally { globalThis.fetch = originalFetch; }
});

test('also accepts the UTC timestamp form documented for day buckets', () => {
	const normalized = normalizeAnalyticsRows([{ ...row, date_utc: undefined, date__day: '2026-09-25T00:00:00.000Z' }]);
	assert.deepEqual(normalized, [row]);
});
