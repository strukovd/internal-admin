type DateValue = string | number | Date | null | undefined;
type NumberValue = string | number | null | undefined;

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
	month: 'long',
});



export function formatDate(value: DateValue) {
	const date = toDate(value);
	return date ? dateFormatter.format(date) : '';
}

export function formatDateTime(value: DateValue) {
	const date = toDate(value);
	return date ? dateTimeFormatter.format(date) : '';
}

export function formatMonth(value: DateValue) {
	const date = toMonthDate(value);
	return date ? monthFormatter.format(date) : '';
}

export function getMonthName(date: Date) {
	return date.toLocaleString('default', { month: 'long' });
}

export function toISODate(date: Date | string) {
	if(typeof date === 'string') date = new Date(date);
	return (date as Date).toLocaleDateString('fr-CA');
}

export function toLocaleDate(date: Date | string) {
	if(typeof date === 'string') date = new Date(date);
	return (date as Date).toLocaleDateString('ru-RU');
}

export function isCurrentMonth(date: unknown) {
	if(typeof date === 'string') date = new Date(date);

	if(date instanceof Date) {
		const currentDate = new Date();
		return date.getFullYear() === currentDate.getFullYear()
			&& date.getMonth() === currentDate.getMonth();
	}
	else
		return false;
}

export function formatNumber(value: unknown) {
	return Number(value).toLocaleString('ru-RU', {
		maximumFractionDigits: 4
	});
}

function toDate(value: DateValue) {
	if (!value) return null;

	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function toMonthDate(value: DateValue) {
	if (!value) return null;

	if (value instanceof Date || typeof value === 'number') return toDate(value);

	const text = String(value);
	const isoMonth = text.match(/^(\d{4})-(\d{2})$/);
	if (isoMonth) return new Date(Number(isoMonth[1]), Number(isoMonth[2]) - 1, 1);

	const shortMonth = text.match(/^(\d{2})\.(\d{4})$/);
	if (shortMonth) return new Date(Number(shortMonth[2]), Number(shortMonth[1]) - 1, 1);

	return toDate(text);
}

function toNumber(value: NumberValue) {
	if (value === null || value === undefined || value === '') return null;

	const number = Number(value);
	return Number.isNaN(number) ? null : number;
}