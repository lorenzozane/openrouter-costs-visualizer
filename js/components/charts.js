import { elements } from '../utils/dom.js';
import { state, fmtUSD } from '../state.js';
import { formatDisplayDate } from '../utils/dates.js';

export function renderBarByModel(rows) {
	const totals = new Map();
	for (const r of rows) totals.set(r.model, (totals.get(r.model) || 0) + r.total);

	const sorted = [...totals.entries()].sort((a,b) => b[1]-a[1]).slice(0, 15);
	const labels = sorted.map(([m]) => m);
	const data = sorted.map(([_, v]) => v);

	if (state.charts.bar) { state.charts.bar.destroy(); state.charts.bar = null; }
	const ctx = elements.barCanvas.getContext('2d');
	ctx.clearRect(0, 0, elements.barCanvas.width, elements.barCanvas.height);

	state.charts.bar = new Chart(elements.barCanvas, {
		type: 'bar',
		data: { labels, datasets: [{ label: 'Total Cost (USD)', data, backgroundColor: '#40a0ff' }] },
		options: {
			responsive: true, maintainAspectRatio: false,
			layout: { padding: { bottom: 0 } },
			plugins: { legend: { display: false } },
			scales: { y: { ticks: { callback: v => fmtUSD.format(v) } }, x: { ticks: { maxRotation: 60, minRotation: 0, autoSkip: true } } },
			animation: { duration: 0 }
		}
	});
}

export function renderLineOverTime(rows) {
	const bucket = new Map();
	for (const r of rows) {
		const d = r.date;
		const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
		bucket.set(key, (bucket.get(key) || 0) + r.total);
	}
	const sorted = [...bucket.entries()].sort((a,b) => a[0].localeCompare(b[0]));
	const labels = sorted.map(([k]) => `${formatDisplayDate(k.slice(0, 10))} ${k.slice(11)}`);
	const data = sorted.map(([_, v]) => v);

	if (state.charts.line) { state.charts.line.destroy(); state.charts.line = null; }
	const ctx = elements.lineCanvas.getContext('2d');
	ctx.clearRect(0, 0, elements.lineCanvas.width, elements.lineCanvas.height);

	state.charts.line = new Chart(elements.lineCanvas, {
		type: 'line',
		data: { labels, datasets: [{ label: 'Total Cost (USD)', data, borderColor: '#40a0ff', backgroundColor: 'rgba(64,160,255,0.25)', tension: 0.2, fill: true }] },
		options: {
			responsive: true, maintainAspectRatio: false,
			layout: { padding: { bottom: 0 } },
			plugins: { legend: { display: false } },
			interaction: { mode: 'index', intersect: false },
			scales: { y: { ticks: { callback: v => fmtUSD.format(v) } }, x: { ticks: { maxRotation: 45, autoSkip: true } } },
			animation: { duration: 0 }
		}
	});
}
