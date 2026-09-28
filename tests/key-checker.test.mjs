import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCurrentKey, keyDetails } from '../js/services/key-checker.js';

test('checks the current key with a bearer header and no URL token', async () => {
	const key = 'sk-or-v1-test';
	const data = { label: 'Example', is_free_tier: false, usage: 12.5, limit: 30, limit_remaining: 17.5 };
	const received = await fetchCurrentKey(key, async (url, options) => {
		assert.equal(url, 'https://openrouter.ai/api/v1/key');
		assert.equal(options.headers.Authorization, `Bearer ${key}`);
		assert.equal(options.cache, 'no-store');
		return { ok: true, json: async () => ({ data }) };
	});
	assert.deepEqual(received, data);
	assert.deepEqual(keyDetails(data).slice(1, 5), [
		['Tier', 'Paid'], ['Usage', '$12.50'], ['Spending limit', '$30.00'], ['Remaining on key', '$17.50']
	]);
});

test('unlimited keys do not imply an account credit balance', () => {
	const details = keyDetails({ is_free_tier: true, usage: 0, limit: null, limit_remaining: null });
	assert.deepEqual(details.slice(1, 5), [
		['Tier', 'Free'], ['Usage', '$0.00'], ['Spending limit', 'No key limit'], ['Remaining on key', 'No key limit']
	]);
});

test('handles rejected keys and unexpected responses', async () => {
	await assert.rejects(fetchCurrentKey('bad', async () => ({ status: 401, ok: false })), /rejected/);
	await assert.rejects(fetchCurrentKey('bad', async () => ({ status: 429, ok: false })), /rate limiting/);
	await assert.rejects(fetchCurrentKey('bad', async () => ({ ok: true, json: async () => ({}) })), /unexpected/);
});
