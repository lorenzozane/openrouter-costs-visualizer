import { elements } from '../utils/dom.js';
import { state } from '../state.js';
import { escapeHTML } from '../services/parser.js';
import { getDateValue, setDateValue } from '../utils/dates.js';

export function updateModelButtonCaption() {
	if (!elements.modelBtn) return;
	const n = state.selectedModels.size;
	elements.modelBtn.textContent = n === 0 ? 'All models' : `${n} model${n>1?'s':''} selected`;
}

export function populateModelFilter(models) {
	if (!elements.modelList) return;
	elements.modelList.innerHTML = '';
	const arr = [...models].sort();
	for (const m of arr) {
		const id = 'mdl_' + btoa(m).replace(/=+$/,'');
		const wrap = document.createElement('label');
		wrap.className = 'model-item';
		wrap.innerHTML = `
			<input type="checkbox" value="${escapeHTML(m)}" id="${id}" />
			<span class="mono">${escapeHTML(m)}</span>
		`;
		const input = wrap.querySelector('input');
		input.addEventListener('change', () => {
			if (input.checked) state.selectedModels.add(m);
			else state.selectedModels.delete(m);
			updateModelButtonCaption();
		});
		elements.modelList.appendChild(wrap);
	}

	// reset and rebind head controls to avoid multiple listeners
	const newSearch = elements.modelSearch.cloneNode(true);
	elements.modelSearch.parentNode.replaceChild(newSearch, elements.modelSearch);
	elements.modelSearch = newSearch;

	const newAll = elements.modelAll.cloneNode(true);
	elements.modelAll.parentNode.replaceChild(newAll, elements.modelAll);
	elements.modelAll = newAll;

	const newNone = elements.modelNone.cloneNode(true);
	elements.modelNone.parentNode.replaceChild(newNone, elements.modelNone);
	elements.modelNone = newNone;

	elements.modelSearch?.addEventListener('input', () => {
		const q = elements.modelSearch.value.trim().toLowerCase();
		for (const el of elements.modelList.children) {
			const txt = el.textContent.toLowerCase();
			el.style.display = txt.includes(q) ? '' : 'none';
		}
	});
	elements.modelAll?.addEventListener('click', () => {
		if (state.models.size > 0) {
			state.selectedModels = new Set([...state.models]);
			for (const cb of elements.modelList.querySelectorAll('input[type="checkbox"]')) cb.checked = true;
			updateModelButtonCaption();
		}
	});
	elements.modelNone?.addEventListener('click', () => {
		state.selectedModels.clear();
		for (const cb of elements.modelList.querySelectorAll('input[type="checkbox"]')) cb.checked = false;
		updateModelButtonCaption();
	});

	if (!populateModelFilter._dropdownSetup) {
		elements.modelBtn?.addEventListener('click', (e) => {
			e.stopPropagation();
			if (state.models.size > 0) {
				const hidden = elements.modelPanel.hasAttribute('hidden');
				if (hidden) {
					elements.modelPanel.removeAttribute('hidden');
					positionModelPanel();
				} else {
					elements.modelPanel.setAttribute('hidden', '');
				}
			}
		});
		document.addEventListener('click', (e) => {
			if (!elements.modelPanel) return;
			if (elements.modelPanel.hasAttribute('hidden')) return;
			if (elements.modelPanel.contains(e.target) || elements.modelBtn.contains(e.target)) return;
			elements.modelPanel.setAttribute('hidden', '');
		});
		window.addEventListener('resize', () => {
			if (!elements.modelPanel?.hasAttribute('hidden')) positionModelPanel();
		});
		populateModelFilter._dropdownSetup = true;
	}

	// keep only existing selections
	const existingSelected = new Set();
	for (const s of state.selectedModels) if (models.has(s)) existingSelected.add(s);
	state.selectedModels = existingSelected;

	for (const cb of elements.modelList.querySelectorAll('input[type="checkbox"]')) {
		cb.checked = state.selectedModels.has(cb.value);
	}
	if (elements.modelSearch) elements.modelSearch.value = '';
	updateModelButtonCaption();
}

export function positionModelPanel() {
	if (!elements.modelPanel || !elements.modelBtn) return;
	elements.modelPanel.classList.remove('align-right');
	elements.modelPanel.style.maxWidth = Math.min(360, window.innerWidth - 16) + 'px';
	const btnRect = elements.modelBtn.getBoundingClientRect();
	const panelRect = elements.modelPanel.getBoundingClientRect();
	const margin = 8;
	const projectedRight = btnRect.left + panelRect.width;
	if (projectedRight > window.innerWidth - margin) elements.modelPanel.classList.add('align-right');
}

export function getSelectedModels() {
	if (state.selectedModels.size > 0) return [...state.selectedModels];
	if (elements.modelFilter?.selectedOptions?.length) {
		return Array.from(elements.modelFilter.selectedOptions).map(o => o.value);
	}
	return [];
}

export function dateStartInclusive(dateStr) {
	if (!dateStr) return null;
	const d = new Date(dateStr + 'T00:00:00');
	return isNaN(+d) ? null : d;
}
export function dateEndInclusive(dateStr) {
	if (!dateStr) return null;
	const d = new Date(dateStr + 'T23:59:59.999');
	return isNaN(+d) ? null : d;
}

export function applyFilters(renderAll) {
	if (state.rows.length === 0) { renderAll([]); return; }
	if (!elements.from.reportValidity() || !elements.to.reportValidity()) return;
	const sel = getSelectedModels();
	const hasSel = sel.length > 0;
	const from = dateStartInclusive(getDateValue(elements.from));
	const to = dateEndInclusive(getDateValue(elements.to));

	state.filtered = state.rows.filter(r => {
		if (hasSel && !sel.includes(r.model)) return false;
		if (from && r.date < from) return false;
		if (to && r.date > to) return false;
		return true;
	});

	renderAll(state.filtered);
}

export function resetFilters(renderAll) {
	setDateValue(elements.from);
	setDateValue(elements.to);
	if (elements.modelFilter?.options) for (const opt of elements.modelFilter.options) opt.selected = false;
	state.selectedModels.clear();
	for (const cb of elements.modelList?.querySelectorAll?.('input[type="checkbox"]') || []) cb.checked = false;
	updateModelButtonCaption();

	state.filtered = state.rows.slice();
	renderAll(state.filtered);
}

export function initFilters({ onApply }) {
	elements.btnApply?.addEventListener('click', () => applyFilters(onApply));
	elements.btnReset?.addEventListener('click', () => resetFilters(onApply));
	// legacy select
	elements.modelFilter?.addEventListener('change', () => applyFilters(onApply));
}
