import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDisplayDate, parseDisplayDate } from '../js/utils/dates.js';

test('displays and accepts day/month/year without changing the ISO date', () => {
	assert.equal(formatDisplayDate('2026-07-01'), '01/07/2026');
	assert.equal(parseDisplayDate('01/07/2026'), '2026-07-01');
	assert.equal(parseDisplayDate('1/7/2026'), '2026-07-01');
});

test('rejects impossible and ambiguous dates', () => {
	assert.equal(parseDisplayDate('29/02/2024'), '2024-02-29');
	assert.equal(parseDisplayDate('29/02/2025'), null);
	assert.equal(parseDisplayDate('12/31/2026'), null);
	assert.equal(parseDisplayDate('2026-07-01'), null);
	assert.equal(formatDisplayDate('2026-02-30'), '');
});
