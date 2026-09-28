import { elements } from '../utils/dom.js';
import { state, COL_KEYS, COL_LABELS, fmtUSD, fmtUSD_4dec, fmtUSD_6dec, fmtInt, DEFAULT_COL_VISIBILITY } from '../state.js';
import { saveColumnVisibility } from '../services/storage.js';
import { escapeHTML } from '../services/parser.js';

function updateSortIcons() {
	const SVG_UP = `<svg width="16" height="16" viewBox="0 0 16 16" style="display:inline-block;vertical-align:middle;" xmlns="http://www.w3.org/2000/svg"><polyline points="4,10 8,6 12,10" fill="none" stroke="#bfc9d6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	const SVG_DOWN = `<svg width="16" height="16" viewBox="0 0 16 16" style="display:inline-block;vertical-align:middle;" xmlns="http://www.w3.org/2000/svg"><polyline points="4,6 8,10 12,6" fill="none" stroke="#bfc9d6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	const ths = document.querySelectorAll('#costTable th');
	ths.forEach(th => {
		const col = th.getAttribute('data-col');
		const icon = th.querySelector('.sort-icon');
		th.classList.remove('sorted-asc', 'sorted-desc', 'sorted-default');
		if (!icon) return;
		if (col === state.sort.col) {
			if (state.sort.dir === 'asc') {
				th.classList.add('sorted-asc');
				icon.innerHTML = SVG_UP;
			} else if (state.sort.dir === 'desc') {
				th.classList.add('sorted-desc');
				icon.innerHTML = SVG_DOWN;
			} else {
				th.classList.add('sorted-default');
				icon.innerHTML = '';
			}
		} else {
			icon.innerHTML = '';
		}
	});
}

export function setupTableSorting(renderAll) {
	const ths = document.querySelectorAll('#costTable th.sortable-header');
	ths.forEach(th => {
		const col = th.getAttribute('data-col');
		if (!col) return;
		th.addEventListener('click', (e) => {
			e.stopPropagation();
			if (state.sort.col === col) {
				if (state.sort.dir === 'default') state.sort.dir = 'desc';
				else if (state.sort.dir === 'desc') state.sort.dir = 'asc';
				else state.sort.dir = 'default';
			} else {
				state.sort.col = col;
				state.sort.dir = 'desc';
			}
			renderAll(state.filtered);
		});
	});
}

export function applyColumnVisibility() {
	const table = document.getElementById('costTable');
	if (!table) return;
	for (const key of COL_KEYS) {
		const show = !!state.colVisibility[key];
		table.querySelectorAll(`[data-col="${key}"]`).forEach(el => {
			if (show) el.classList.remove('col-hidden');
			else el.classList.add('col-hidden');
		});
	}
	saveColumnVisibility(state.colVisibility);
}

function positionColPanel() {
	if (!elements.colPanel || !elements.colBtn) return;
	elements.colPanel.classList.remove('align-right');
	elements.colPanel.style.maxWidth = Math.min(360, window.innerWidth - 16) + 'px';
	const btnRect = elements.colBtn.getBoundingClientRect();
	const panelRect = elements.colPanel.getBoundingClientRect();
	const margin = 8;
	const projectedRight = btnRect.left + panelRect.width;
	if (projectedRight > window.innerWidth - margin) elements.colPanel.classList.add('align-right');
}

export function initColumnFilterUI() {
	if (!elements.colList) return;
	elements.colList.innerHTML = '';

	for (const key of COL_KEYS) {
		const label = COL_LABELS[key] || key;
		const id = `col_${key}`;
		const row = document.createElement('label');
		row.className = 'model-item';
		const nonHideable = key === 'model' || key === 'req' || key === 'total';
		row.innerHTML = `
			<input type="checkbox" id="${id}" data-key="${key}" ${state.colVisibility[key] ? 'checked' : ''} ${nonHideable ? 'disabled' : ''}/>
			<span class="mono">${label}</span>
		`;
		const cb = row.querySelector('input');
		cb.addEventListener('change', () => {
			const k = cb.getAttribute('data-key');
			if (nonHideable) { cb.checked = true; return; }
			state.colVisibility[k] = cb.checked;
			applyColumnVisibility();
		});
		elements.colList.appendChild(row);
	}

	// Default button
	const defaultBtn = document.createElement('button');
	defaultBtn.id = 'colSelectDefault';
	defaultBtn.className = 'btn mini';
	defaultBtn.type = 'button';
	defaultBtn.textContent = 'Default';
	const panelHead = elements.colPanel?.querySelector('.model-panel-head');
	if (panelHead) {
		const noneBtn = panelHead.querySelector('#colSelectNone');
		panelHead.insertBefore(defaultBtn, noneBtn);
	}

	elements.colAll?.addEventListener('click', () => {
		for (const k of COL_KEYS) {
			if (k === 'model' || k === 'req' || k === 'total') continue;
			state.colVisibility[k] = true;
		}
		for (const cb of elements.colList.querySelectorAll('input[type="checkbox"]')) {
			if (cb.disabled) continue;
			cb.checked = true;
		}
		applyColumnVisibility();
	});
	defaultBtn.addEventListener('click', () => {
		for (const k of COL_KEYS) state.colVisibility[k] = DEFAULT_COL_VISIBILITY[k];
		for (const cb of elements.colList.querySelectorAll('input[type="checkbox"]')) {
			const k = cb.getAttribute('data-key');
			cb.checked = !!DEFAULT_COL_VISIBILITY[k];
		}
		applyColumnVisibility();
	});
	elements.colNone?.addEventListener('click', () => {
		for (const k of COL_KEYS) {
			if (k === 'model' || k === 'req' || k === 'total') continue;
			state.colVisibility[k] = false;
		}
		for (const cb of elements.colList.querySelectorAll('input[type="checkbox"]')) {
			if (cb.disabled) continue;
			cb.checked = false;
		}
		applyColumnVisibility();
	});

	elements.colBtn?.addEventListener('click', (e) => {
		e.stopPropagation();
		const hidden = elements.colPanel.hasAttribute('hidden');
		if (hidden) {
			elements.colPanel.removeAttribute('hidden');
			positionColPanel();
		} else {
			elements.colPanel.setAttribute('hidden', '');
		}
	});
	document.addEventListener('click', (e) => {
		if (!elements.colPanel) return;
		if (elements.colPanel.hasAttribute('hidden')) return;
		if (elements.colPanel.contains(e.target) || elements.colBtn.contains(e.target)) return;
		elements.colPanel.setAttribute('hidden', '');
	});
	window.addEventListener('resize', () => {
		if (!elements.colPanel?.hasAttribute('hidden')) positionColPanel();
	});

	applyColumnVisibility();
}

export function renderTable(rows) {
	// aggregate by model
	const byModel = new Map();
	for (const r of rows) {
		const m = byModel.get(r.model) || { total:0, web:0, cache:0, file:0, byok:0, tp:0, tc:0, tokenOutput:0, tr:0, req:0, genTime:0, ttft:0 };
		m.total += r.total;
		m.web += r.web;
		m.cache += r.cache;
		m.file += r.file;
		m.byok += r.byok;
		m.tp += r.tp;
		m.tc += r.tc;
		m.tokenOutput += (r.tc - r.tr);
		m.tr += r.tr;
		m.req += 1;
		m.genTime += r.genTime;
		m.ttft += r.ttft;
		byModel.set(r.model, m);
	}

	const sorted = [...byModel.entries()];
	const sortCol = state.sort.col;
	const sortDir = state.sort.dir;
	if (sortDir === 'default') {
		sorted.sort((a, b) => b[1].total - a[1].total);
	} else {
		sorted.sort((a, b) => {
			const va = a[1][sortCol] ?? 0;
			const vb = b[1][sortCol] ?? 0;
			if (typeof va === 'string' && typeof vb === 'string') {
				return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
			}
			return sortDir === 'asc' ? va - vb : vb - va;
		});
	}

	const totals = {
		models: sorted.length, req:0, total:0, byok:0, web:0, cache:0, file:0, tp:0, tc:0, tokenOutput:0, tr:0, genTime:0, ttft:0
	};
	for (const [, v] of sorted) {
		totals.req += v.req; totals.total += v.total; totals.byok += v.byok; totals.web += v.web;
		totals.cache += v.cache; totals.file += v.file; totals.tp += v.tp; totals.tc += v.tc;
		totals.tokenOutput += v.tokenOutput; totals.tr += v.tr; totals.genTime += v.genTime; totals.ttft += v.ttft;
	}
	const avgTp = totals.req > 0 ? Math.round(totals.tp / totals.req) : 0;
	const avgTokenOutput = totals.req > 0 ? (totals.tokenOutput / totals.req) : 0;
	const avgTr = totals.req > 0 ? Math.round(totals.tr / totals.req) : 0;
	const avgGenTime = totals.req > 0 ? Math.round(totals.genTime / totals.req) : 0;
	const avgTtft = totals.req > 0 ? Math.round(totals.ttft / totals.req) : 0;

	elements.tableBody.innerHTML = '';
	for (const [model, v] of sorted) {
		const avgGenTimeRow = v.req > 0 ? Math.round(v.genTime / v.req) : 0;
		const avgTtftRow = v.req > 0 ? Math.round(v.ttft / v.req) : 0;
		const avgTpRow = v.req > 0 ? Math.round(v.tp / v.req) : 0;
		const avgTokenOutputRow = v.req > 0 ? (v.tokenOutput / v.req) : 0;
		const avgTrRow = v.req > 0 ? Math.round(v.tr / v.req) : 0;
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td data-col="model" class="model-col mono">${escapeHTML(model)}</td>
			<td data-col="req" class="mono">${v.req === 0 ? `<span class="zero-value">${fmtInt.format(v.req)}</span>` : fmtInt.format(v.req)}</td>
			<td data-col="total" class="mono">${v.total === 0 ? `<span class="zero-value">${fmtUSD_4dec.format(v.total)}</span>` : fmtUSD_4dec.format(v.total)}</td>
			<td data-col="byok" class="mono">${v.byok === 0 ? `<span class="zero-value">${fmtUSD.format(v.byok)}</span>` : fmtUSD.format(v.byok)}</td>
			<td data-col="web" class="mono">${v.web === 0 ? `<span class="zero-value">${fmtUSD.format(v.web)}</span>` : fmtUSD.format(v.web)}</td>
			<td data-col="cache" class="mono">${v.cache === 0 ? `<span class="zero-value">${fmtUSD.format(v.cache)}</span>` : fmtUSD.format(v.cache)}</td>
			<td data-col="file" class="mono">${v.file === 0 ? `<span class="zero-value">${fmtUSD.format(v.file)}</span>` : fmtUSD.format(v.file)}</td>
			<td data-col="tp" class="mono">${v.tp === 0 ? `<span class="zero-value">${fmtInt.format(v.tp)}</span>` : fmtInt.format(v.tp)}</td>
			<td data-col="avgTp" class="mono">${avgTpRow === 0 ? `<span class="zero-value">${fmtInt.format(avgTpRow)}</span>` : fmtInt.format(avgTpRow)}</td>
			<td data-col="tokenOutput" class="mono">${v.tokenOutput === 0 ? `<span class="zero-value">${fmtInt.format(v.tokenOutput)}</span>` : fmtInt.format(v.tokenOutput)}</td>
			<td data-col="avgTokenOutput" class="mono">${avgTokenOutputRow === 0 ? `<span class="zero-value">${avgTokenOutputRow.toFixed(2)}</span>` : avgTokenOutputRow.toFixed(2)}</td>
			<td data-col="tr" class="mono">${v.tr === 0 ? `<span class="zero-value">${fmtInt.format(v.tr)}</span>` : fmtInt.format(v.tr)}</td>
			<td data-col="avgTr" class="mono">${avgTrRow === 0 ? `<span class="zero-value">${fmtInt.format(avgTrRow)}</span>` : fmtInt.format(avgTrRow)}</td>
			<td data-col="tc" class="mono">${v.tc === 0 ? `<span class="zero-value">${fmtInt.format(v.tc)}</span>` : fmtInt.format(v.tc)}</td>
			<td data-col="genTime" class="mono">${avgGenTimeRow === 0 ? `<span class="zero-value">${fmtInt.format(avgGenTimeRow)}ms</span>` : `${fmtInt.format(avgGenTimeRow)}ms`}</td>
			<td data-col="ttft" class="mono">${avgTtftRow === 0 ? `<span class="zero-value">${fmtInt.format(avgTtftRow)}ms</span>` : `${fmtInt.format(avgTtftRow)}ms`}</td>
		`;
		elements.tableBody.appendChild(tr);
	}

	const tableFooter = document.querySelector('#costTable tfoot');
	if (tableFooter) {
		tableFooter.innerHTML = `
			<tr>
				<td data-col="model" class="model-col mono">TOTAL (${totals.models} models)</td>
				<td data-col="req" class="mono">${totals.req === 0 ? `<span class="zero-value">${fmtInt.format(totals.req)}</span>` : fmtInt.format(totals.req)}</td>
				<td data-col="total" class="mono">${totals.total === 0 ? `<span class="zero-value">${fmtUSD_4dec.format(totals.total)}</span>` : fmtUSD_4dec.format(totals.total)}</td>
				<td data-col="byok" class="mono">${totals.byok === 0 ? `<span class="zero-value">${fmtUSD.format(totals.byok)}</span>` : fmtUSD.format(totals.byok)}</td>
				<td data-col="web" class="mono">${totals.web === 0 ? `<span class="zero-value">${fmtUSD.format(totals.web)}</span>` : fmtUSD.format(totals.web)}</td>
				<td data-col="cache" class="mono">${totals.cache === 0 ? `<span class="zero-value">${fmtUSD.format(totals.cache)}</span>` : fmtUSD.format(totals.cache)}</td>
				<td data-col="file" class="mono">${totals.file === 0 ? `<span class="zero-value">${fmtUSD.format(totals.file)}</span>` : fmtUSD.format(totals.file)}</td>
				<td data-col="tp" class="mono">${totals.tp === 0 ? `<span class="zero-value">${fmtInt.format(totals.tp)}</span>` : fmtInt.format(totals.tp)}</td>
				<td data-col="avgTp" class="mono">${avgTp === 0 ? `<span class="zero-value">${fmtInt.format(avgTp)}</span>` : fmtInt.format(avgTp)}</td>
				<td data-col="tokenOutput" class="mono">${totals.tokenOutput === 0 ? `<span class="zero-value">${fmtInt.format(totals.tokenOutput)}</span>` : fmtInt.format(totals.tokenOutput)}</td>
				<td data-col="avgTokenOutput" class="mono">${avgTokenOutput === 0 ? `<span class="zero-value">${avgTokenOutput.toFixed(2)}</span>` : avgTokenOutput.toFixed(2)}</td>
				<td data-col="tr" class="mono">${totals.tr === 0 ? `<span class="zero-value">${fmtInt.format(totals.tr)}</span>` : fmtInt.format(totals.tr)}</td>
				<td data-col="avgTr" class="mono">${avgTr === 0 ? `<span class="zero-value">${fmtInt.format(avgTr)}</span>` : fmtInt.format(avgTr)}</td>
				<td data-col="tc" class="mono">${totals.tc === 0 ? `<span class="zero-value">${fmtInt.format(totals.tc)}</span>` : fmtInt.format(totals.tc)}</td>
				<td data-col="genTime" class="mono">${avgGenTime === 0 ? `<span class="zero-value">${fmtInt.format(avgGenTime)}ms</span>` : `${fmtInt.format(avgGenTime)}ms`}</td>
				<td data-col="ttft" class="mono">${avgTtft === 0 ? `<span class="zero-value">${fmtInt.format(avgTtft)}ms</span>` : `${fmtInt.format(avgTtft)}ms`}</td>
			</tr>
		`;
	}

	updateSortIcons();
}
