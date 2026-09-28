import { exportAnalyticsCSV, fetchAnalytics, importAnalyticsCSV, splitUTCDateRange } from '../services/analytics-data.js';
import { fmtInt, fmtUSD_4dec, fmtUSD_6dec } from '../state.js';
import { formatDisplayDate, getDateValue, setDateMax, setDateValue } from '../utils/dates.js';

const byId = id => document.getElementById(id);
const VIEW_STORAGE_KEY = 'openrouter-costs-active-view';
let rows = [];
let modelChart = null;
let timeChart = null;
let activeRequest = null;

function showStatus(message, error = false) {
	const status = byId('apiStatus');
	status.textContent = message;
	status.classList.toggle('error', error);
}

function setBusy(busy) {
	byId('apiSyncBtn').disabled = busy;
	byId('apiCancelBtn').hidden = !busy;
	byId('apiKey').disabled = busy;
	byId('apiCsvFile').disabled = busy;
	byId('apiClearBtn').disabled = busy || rows.length === 0;
	byId('apiExportBtn').disabled = busy || rows.length === 0;
}

function sum(items, field) { return items.reduce((total, row) => total + row[field], 0); }

function chart(canvas, oldChart, type, labels, values) {
	oldChart?.destroy();
	return new Chart(canvas, {
		type,
		data: { labels, datasets: [{ label: 'Total cost (USD)', data: values, backgroundColor: '#40a0ff', borderColor: '#40a0ff', tension: 0.2 }] },
		options: {
			responsive: true, maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: { y: { beginAtZero: true, ticks: { callback: value => fmtUSD_4dec.format(value) } } },
			animation: { duration: 0 }
		}
	});
}

function render() {
	const hasData = rows.length > 0;
	byId('apiResults').hidden = !hasData;
	byId('apiExportBtn').disabled = !hasData;
	byId('apiClearBtn').disabled = !hasData;
	if (!hasData) {
		modelChart?.destroy(); modelChart = null;
		timeChart?.destroy(); timeChart = null;
		return;
	}
	const query = byId('apiModelSearch').value.trim().toLowerCase();
	const from = getDateValue(byId('apiFilterFrom'));
	const to = getDateValue(byId('apiFilterTo'));
	const shown = rows.filter(row => (!query || row.model.toLowerCase().includes(query)) &&
		(!from || row.date_utc >= from) && (!to || row.date_utc <= to));
	byId('apiFilterEmpty').hidden = shown.length > 0;
	byId('apiWorkspace').hidden = shown.length === 0;
	if (!shown.length) {
		modelChart?.destroy(); modelChart = null;
		timeChart?.destroy(); timeChart = null;
		return;
	}

	const requests = sum(shown, 'request_count');
	const cost = sum(shown, 'total_usage');
	const range = `${formatDisplayDate(shown[0].date_utc)} to ${formatDisplayDate(shown[shown.length - 1].date_utc)} UTC`;
	const summary = byId('apiSummary');
	summary.replaceChildren();
	for (const [label, value] of [
		['Requests', fmtInt.format(requests)],
		['Total cost', fmtUSD_4dec.format(cost)],
		['Avg cost / request', requests ? fmtUSD_6dec.format(cost / requests) : '—'],
		['Data coverage', range]
	]) {
		const item = document.createElement('div');
		item.className = 'kpi api-stat';
		const caption = document.createElement('span');
		caption.className = 'kpi-title';
		caption.textContent = label;
		const number = document.createElement('strong');
		number.className = 'kpi-value';
		number.textContent = value;
		item.append(caption, number);
		summary.append(item);
	}

	const models = new Map();
	const days = new Map();
	for (const row of shown) {
		const model = models.get(row.model) || { model: row.model, request_count: 0, total_usage: 0,
			credits_usage: 0, byok_usage: 0, tokens_prompt: 0, tokens_completion: 0, reasoning_tokens: 0 };
		for (const field of ['request_count', 'total_usage', 'credits_usage', 'byok_usage', 'tokens_prompt', 'tokens_completion', 'reasoning_tokens']) {
			model[field] += row[field];
		}
		models.set(row.model, model);
		days.set(row.date_utc, (days.get(row.date_utc) || 0) + row.total_usage);
	}
	const ranked = [...models.values()].sort((a, b) => b.total_usage - a.total_usage);
	const body = byId('apiTable').querySelector('tbody');
	body.replaceChildren();
	for (const row of ranked) {
		const tr = document.createElement('tr');
		for (const value of [row.model, fmtInt.format(row.request_count), fmtUSD_4dec.format(row.total_usage),
			fmtUSD_4dec.format(row.credits_usage), fmtUSD_4dec.format(row.byok_usage), fmtInt.format(row.tokens_prompt),
			fmtInt.format(row.tokens_completion), fmtInt.format(row.reasoning_tokens)]) {
			const td = document.createElement('td');
			td.textContent = value;
			tr.append(td);
		}
		body.append(tr);
	}
	modelChart = chart(byId('apiModelChart'), modelChart, 'bar', ranked.slice(0, 15).map(row => row.model), ranked.slice(0, 15).map(row => row.total_usage));
	const orderedDays = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	timeChart = chart(byId('apiTimeChart'), timeChart, 'line', orderedDays.map(([date]) => formatDisplayDate(date)), orderedDays.map(([, value]) => value));
}

function useRows(newRows, label) {
	rows = newRows;
	byId('apiModelSearch').value = '';
	setDateValue(byId('apiFilterFrom'));
	setDateValue(byId('apiFilterTo'));
	render();
	showStatus(rows.length ? `${label}: ${rows.length} daily model totals loaded. Data stays until you clear it, refresh, or close the tab.` : `${label}: this file contains no daily model totals.`);
	byId('apiViewBtn').click();
}

export function loadAnalyticsCSV(text) {
	const imported = importAnalyticsCSV(text);
	useRows(imported, 'CSV import');
}

export function initAnalyticsView() {
	const csvBtn = byId('csvViewBtn');
	const apiBtn = byId('apiViewBtn');
	function switchView(api, remember = true) {
		byId('apiView').hidden = !api;
		byId('csvView').hidden = api;
		byId('csvControls').hidden = api;
		csvBtn.classList.toggle('active', !api);
		apiBtn.classList.toggle('active', api);
		csvBtn.toggleAttribute('aria-current', !api);
		apiBtn.toggleAttribute('aria-current', api);
		if (remember) {
			try { localStorage.setItem(VIEW_STORAGE_KEY, api ? 'api' : 'csv'); } catch { /* Storage may be unavailable. */ }
		}
		if (api && rows.length) { modelChart?.resize(); timeChart?.resize(); }
	}
	csvBtn.addEventListener('click', () => switchView(false));
	apiBtn.addEventListener('click', () => switchView(true));
	try { switchView(localStorage.getItem(VIEW_STORAGE_KEY) === 'api', false); }
	catch { switchView(false, false); }

	const now = new Date();
	const today = now.toISOString().slice(0, 10);
	const prior = new Date(+now - 89 * 86400000).toISOString().slice(0, 10);
	setDateMax(byId('apiFrom'), today);
	setDateMax(byId('apiTo'), today);
	setDateValue(byId('apiFrom'), prior);
	setDateValue(byId('apiTo'), today);

	byId('apiSyncForm').addEventListener('submit', async event => {
		event.preventDefault();
		if (activeRequest) return;
		const keyInput = byId('apiKey');
		const key = keyInput.value.trim();
		keyInput.value = '';
		if (!key) { showStatus('Enter a management key to sync.', true); return; }
		let ranges;
		const from = getDateValue(byId('apiFrom'));
		const to = getDateValue(byId('apiTo'));
		try { ranges = splitUTCDateRange(from, to); }
		catch (error) { showStatus(error.message, true); return; }
		activeRequest = new AbortController();
		setBusy(true);
		showStatus('Checking OpenRouter Analytics…');
		try {
			const result = await fetchAnalytics(key, ranges, {
				signal: activeRequest.signal,
				onProgress: (part, total) => showStatus(`Syncing part ${part} of ${total}…`)
			});
			if (result.length) {
				useRows(result, 'OpenRouter sync');
			} else {
				showStatus(`OpenRouter returned no usage for ${formatDisplayDate(from)} through ${formatDisplayDate(to)} UTC. Try a wider range; existing data was kept.`);
			}
		} catch (error) {
			showStatus(error.name === 'AbortError' ? 'Sync cancelled. Existing data was kept.' : error.message, error.name !== 'AbortError');
		} finally {
			activeRequest = null;
			setBusy(false);
		}
	});
	byId('apiCancelBtn').addEventListener('click', () => activeRequest?.abort());
	for (const id of ['apiModelSearch', 'apiFilterFrom', 'apiFilterTo']) {
		byId(id).addEventListener('input', render);
	}
	byId('apiResetFilters').addEventListener('click', () => {
		byId('apiModelSearch').value = '';
		setDateValue(byId('apiFilterFrom'));
		setDateValue(byId('apiFilterTo'));
		render();
	});
	byId('apiClearBtn').addEventListener('click', () => {
		rows = [];
		render();
		showStatus('API data cleared from this tab.');
	});
	byId('apiExportBtn').addEventListener('click', () => {
		if (!rows.length) return;
		const blob = new Blob([exportAnalyticsCSV(rows)], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `openrouter-analytics-${rows[0].date_utc}-${rows[rows.length - 1].date_utc}.csv`;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 60000);
	});
	byId('apiCsvFile').addEventListener('change', async event => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		try { loadAnalyticsCSV(await file.text()); }
		catch (error) { showStatus(`${file.name}: ${error.message}`, true); }
	});
	return { loadAnalyticsCSV };
}
