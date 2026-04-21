// Tiny CSV export helper. Client-side — we already have the data in the
// browser, no point round-tripping. Escapes per RFC 4180: wrap any cell
// containing comma / quote / newline in double quotes, double any inner quote.

export interface CsvColumn<T> {
	header: string;
	value: (row: T) => string | number | null | undefined;
}

function escapeCell(v: string | number | null | undefined): string {
	if (v == null) return "";
	const s = typeof v === "number" ? String(v) : v;
	if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

export function arrayToCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
	const header = columns.map((c) => escapeCell(c.header)).join(",");
	const lines = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(","));
	return [header, ...lines].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
	// Prepend UTF-8 BOM so Excel on Windows reads accented characters correctly.
	const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.style.display = "none";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	// Revoke after next tick so the browser has time to start the download.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
