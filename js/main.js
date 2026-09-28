import { elements } from './utils/dom.js';
import { state, fmtUSD_4dec, fmtUSD_6dec, fmtInt } from './state.js';
import { mergeAndDeduplicateData } from './services/parser.js';
import { initFilesControl, positionFilesContainer } from './components/files-control.js';
import { initFilters, populateModelFilter, applyFilters } from './components/filters.js';
import { initColumnFilterUI, setupTableSorting, renderTable, applyColumnVisibility } from './components/table.js';
import { renderBarByModel, renderLineOverTime } from './components/charts.js';
import { initAnalyticsView } from './components/analytics.js';
import { initDateControls } from './utils/dates.js';

// KPIs + clear and render pipeline
function clearUI() {
	elements.kpiReq.textContent = '-';
	elements.kpiOpenRouterCost.textContent = '-';
	elements.kpiTotalCost.textContent = '-';
	elements.kpiAvg.textContent = '-';
	elements.kpiWin.textContent = '-';
	elements.tableBody.innerHTML = '';
	const tfoot = document.querySelector('#costTable tfoot');
	if (tfoot) tfoot.innerHTML = '';
	if (state.charts.bar) { state.charts.bar.destroy(); state.charts.bar = null; }
	if (state.charts.line) { state.charts.line.destroy(); state.charts.line = null; }
	const hasFiles = state.files.length > 0;
	elements.emptyStateTitle.textContent = hasFiles ? 'No matching records' : 'Add your OpenRouter CSV files';
	elements.emptyStateDetail.textContent = hasFiles
		? 'Adjust the date range or model selection, then apply the filters again.'
		: 'Drop files above or click to browse to see costs, models, and trends.';
	elements.dataEmptyState.hidden = false;
	elements.costTable.hidden = true;
	elements.chartEmptyStates.forEach(el => {
		el.textContent = hasFiles ? 'No matching data to chart.' : 'Add files to see this chart.';
		el.hidden = false;
	});
}

function renderKPIs(rows) {
	const totalOpenRouter = rows.reduce((s, r) => s + r.total, 0);
	const totalByok = rows.reduce((s, r) => s + r.byok, 0);
	const totalWeb = rows.reduce((s, r) => s + r.web, 0);
	const totalFile = rows.reduce((s, r) => s + r.file, 0);
	const totalCache = rows.reduce((s, r) => s + r.cache, 0);
	const totalCost = totalOpenRouter + totalByok + totalWeb + totalFile + totalCache;
	const count = rows.length;
	const avg = count ? totalOpenRouter / count : 0;
	const minD = rows[0].date;
	const maxD = rows[rows.length - 1].date;
	const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

	elements.kpiReq.textContent = fmtInt.format(count);
	elements.kpiOpenRouterCost.textContent = fmtUSD_4dec.format(totalOpenRouter);
	elements.kpiTotalCost.textContent = fmtUSD_4dec.format(totalCost);
	elements.kpiAvg.textContent = count ? fmtUSD_6dec.format(avg) : '-';
	elements.kpiWin.innerHTML = `${fmt(minD)}<br>${fmt(maxD)}`;
}

function renderAll(rows) {
	if (!rows || rows.length === 0) {
		clearUI();
		return;
	}
	elements.dataEmptyState.hidden = true;
	elements.costTable.hidden = false;
	elements.chartEmptyStates.forEach(el => { el.hidden = true; });
	renderKPIs(rows);
	renderTable(rows);
	applyColumnVisibility();
	renderBarByModel(rows);
	renderLineOverTime(rows);
}

function onFilesChanged() {
	if (state.files.length === 0) {
		state.rows = [];
		state.models = new Set();
		state.selectedModels.clear();
		state.filtered = [];
		if (elements.uniqueRecords) elements.uniqueRecords.textContent = '0 unique records';
		if (elements.modelList) elements.modelList.innerHTML = '';
		if (elements.modelPanel && !elements.modelPanel.hasAttribute('hidden')) elements.modelPanel.setAttribute('hidden','');
		clearUI();
		return;
	}

	const { rows, models } = mergeAndDeduplicateData(state.files);
	state.rows = rows;
	state.models = models;
	if (elements.uniqueRecords) elements.uniqueRecords.textContent = `${rows.length} unique records`;
	populateModelFilter(models);
	applyFilters(renderAll);
}

function setupTooltips() {
	const tooltip = elements.tableTooltip;
	const ths = document.querySelectorAll('[data-tooltip]');
	if (!tooltip || !ths.length) return;

	ths.forEach(th => {
		th.addEventListener('mouseenter', () => {
			const text = th.getAttribute('data-tooltip');
			if (!text) return;
			tooltip.textContent = text;
			tooltip.style.display = 'block';
			const rect = th.getBoundingClientRect();
			let top = rect.bottom + 6;
			let left = rect.left + Math.min(rect.width/2, 120);
			const maxRight = window.innerWidth - 12;
			const ttWidth = tooltip.offsetWidth || 260;
			if (left + ttWidth > maxRight) left = maxRight - ttWidth;
			tooltip.style.top = `${top}px`;
			tooltip.style.left = `${left}px`;
		});
		th.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
		th.addEventListener('mousemove', e => {
			const ttWidth = tooltip.offsetWidth || 260;
			let left = e.clientX + 12;
			let top = e.clientY + 14;
			const maxRight = window.innerWidth - 12;
			if (left + ttWidth > maxRight) left = maxRight - ttWidth;
			tooltip.style.top = `${top}px`;
			tooltip.style.left = `${left}px`;
		});
	});
}

// Initialize
initDateControls();
clearUI();
const analyticsView = initAnalyticsView();
initFilesControl(onFilesChanged, analyticsView.loadAnalyticsCSV);
initFilters({ onApply: renderAll });
initColumnFilterUI();
setupTableSorting(renderAll);
applyColumnVisibility();
setupTooltips();

// keep files panel positioned if open on resize
window.addEventListener('resize', positionFilesContainer);
window.addEventListener('scroll', positionFilesContainer, { passive: true });
