const DISPLAY_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDisplayDate(value) {
	const match = DISPLAY_DATE.exec(String(value).trim());
	if (!match) return null;
	const [, day, month, year] = match;
	const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	const date = new Date(`${iso}T00:00:00Z`);
	return Number.isFinite(+date) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

export function formatDisplayDate(iso) {
	const match = ISO_DATE.exec(String(iso));
	if (!match) return '';
	const [, year, month, day] = match;
	return parseDisplayDate(`${day}/${month}/${year}`) === iso ? `${day}/${month}/${year}` : '';
}

function pickerFor(input) { return input.closest('.date-input').querySelector('.date-picker'); }

function syncValidity(input) {
	const iso = parseDisplayDate(input.value);
	const max = input.dataset.maxDate;
	input.setCustomValidity(input.value.trim() && !iso ? 'Enter a valid date as DD/MM/YYYY.' :
		iso && max && iso > max ? `Choose a date on or before ${formatDisplayDate(max)}.` : '');
	const picker = pickerFor(input);
	picker.value = iso && (!max || iso <= max) ? iso : '';
	return iso;
}

export function getDateValue(input) { return parseDisplayDate(input.value) || ''; }

export function setDateValue(input, iso = '') {
	input.value = iso ? formatDisplayDate(iso) : '';
	syncValidity(input);
}

export function setDateMax(input, iso) {
	input.dataset.maxDate = iso;
	pickerFor(input).max = iso;
	syncValidity(input);
}

export function initDateControls() {
	for (const wrapper of document.querySelectorAll('.date-input')) {
		const input = wrapper.querySelector('input[type="text"]');
		const picker = wrapper.querySelector('input[type="date"]');
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'date-picker-icon';
		button.setAttribute('aria-label', picker.getAttribute('aria-label'));
		button.textContent = '📅';
		wrapper.querySelector('.date-picker-icon').replaceWith(button);
		picker.tabIndex = -1;
		picker.setAttribute('aria-hidden', 'true');
		input.addEventListener('input', () => syncValidity(input));
		input.addEventListener('blur', () => {
			const iso = syncValidity(input);
			if (iso) input.value = formatDisplayDate(iso);
		});
		button.addEventListener('click', () => {
			try { picker.showPicker(); }
			catch { picker.focus(); picker.click(); }
		});
		picker.addEventListener('change', () => {
			setDateValue(input, picker.value);
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
	}
}
