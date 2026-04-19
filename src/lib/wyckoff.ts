import type { WyckoffAnalysis, WyckoffPhase, WyckoffSegment } from "../types/flow";
import type { HistoryPoint } from "../types/market";

/**
 * Efficiency Ratio: measures how "straight" a price move is.
 * ER = abs(net change) / sum(abs(bar-to-bar changes))
 * ER near 1 = trending, near 0 = sideways/ranging
 */
function computeER(data: HistoryPoint[], start: number, end: number): number {
	if (end <= start) return 0;
	const netChange = Math.abs(data[end].close - data[start].close);
	let sumChanges = 0;
	for (let i = start + 1; i <= end; i++) {
		sumChanges += Math.abs(data[i].close - data[i - 1].close);
	}
	return sumChanges === 0 ? 0 : netChange / sumChanges;
}

/**
 * Average volume for a segment
 */
function avgVolume(data: HistoryPoint[], start: number, end: number): number {
	let sum = 0;
	for (let i = start; i <= end; i++) sum += data[i].volume;
	return sum / (end - start + 1);
}

/**
 * Determine direction: is price generally rising or falling in this segment?
 */
function priceDirection(data: HistoryPoint[], start: number, end: number): "up" | "down" | "flat" {
	const change = data[end].close - data[start].close;
	let high = -Infinity;
	let low = Infinity;
	for (let i = start; i <= end; i++) {
		if (data[i].high > high) high = data[i].high;
		if (data[i].low < low) low = data[i].low;
	}
	const range = high - low;
	if (range === 0) return "flat";
	const relChange = change / range;
	if (relChange > 0.15) return "up";
	if (relChange < -0.15) return "down";
	return "flat";
}

/**
 * Check if price is near highs or lows of the full dataset within a segment.
 * Returns "near_high", "near_low", or "mid"
 */
function pricePosition(
	data: HistoryPoint[],
	segStart: number,
	segEnd: number,
	fullHigh: number,
	fullLow: number,
): "near_high" | "near_low" | "mid" {
	const segAvg =
		data.slice(segStart, segEnd + 1).reduce((s, d) => s + d.close, 0) / (segEnd - segStart + 1);
	const fullRange = fullHigh - fullLow;
	if (fullRange === 0) return "mid";
	const position = (segAvg - fullLow) / fullRange;
	if (position > 0.7) return "near_high";
	if (position < 0.3) return "near_low";
	return "mid";
}

/**
 * Classify a segment into a Wyckoff phase based on ER, direction, and position.
 */
function classifyPhase(
	er: number,
	direction: "up" | "down" | "flat",
	position: "near_high" | "near_low" | "mid",
): WyckoffPhase {
	const erThreshold = 0.3;

	if (er >= erThreshold) {
		// Trending
		return direction === "down" ? "markdown" : "markup";
	}
	// Ranging/sideways
	if (position === "near_low" || (direction === "flat" && position !== "near_high")) {
		return "accumulation";
	}
	if (position === "near_high") {
		return "distribution";
	}
	// Default: if ranging in the middle, classify by slight direction
	return direction === "down" ? "distribution" : "accumulation";
}

/**
 * Compute confidence for a phase segment.
 * Factors: ER strength, volume confirmation, segment length.
 */
function computeConfidence(
	phase: WyckoffPhase,
	er: number,
	segmentLength: number,
	segVolume: number,
	overallAvgVolume: number,
): number {
	let confidence = 0.5; // base

	// ER contribution
	const erThreshold = 0.3;
	if (phase === "markup" || phase === "markdown") {
		// For trending phases, higher ER = more confident
		confidence += Math.min((er - erThreshold) * 0.8, 0.25);
	} else {
		// For ranging phases, lower ER = more confident
		confidence += Math.min((erThreshold - er) * 0.6, 0.2);
	}

	// Segment length: longer segments = more confident (up to a point)
	const lengthBonus = Math.min(segmentLength / 60, 0.15);
	confidence += lengthBonus;

	// Volume confirmation:
	// Accumulation/distribution should have decent volume
	// Markup/markdown with high volume confirms trend
	if (overallAvgVolume > 0) {
		const volRatio = segVolume / overallAvgVolume;
		if (volRatio > 1.2) confidence += 0.1;
		if (volRatio > 1.5) confidence += 0.05;
	}

	return Math.max(0.1, Math.min(0.95, confidence));
}

/**
 * Main Wyckoff phase detection.
 * Analyzes OHLCV history and returns detected phases.
 *
 * @param data - Daily OHLCV data (oldest first)
 * @param segmentWindow - Minimum bars per segment (default 20)
 */
export function detectWyckoffPhases(data: HistoryPoint[], segmentWindow = 20): WyckoffAnalysis {
	const minWindow = Math.max(segmentWindow, 2);
	if (data.length < minWindow * 2) {
		return { currentPhase: null, phases: [] };
	}

	let fullHigh = -Infinity;
	let fullLow = Infinity;
	for (const d of data) {
		if (d.high > fullHigh) fullHigh = d.high;
		if (d.low < fullLow) fullLow = d.low;
	}
	const overallAvgVol = data.reduce((s, d) => s + d.volume, 0) / data.length;

	const phases: WyckoffSegment[] = [];

	// Slide through data in segments
	let i = 0;
	while (i < data.length - segmentWindow + 1) {
		// Determine the end of this segment: extend while phase classification stays the same
		let segEnd = Math.min(i + segmentWindow - 1, data.length - 1);
		const er = computeER(data, i, segEnd);
		const dir = priceDirection(data, i, segEnd);
		const pos = pricePosition(data, i, segEnd, fullHigh, fullLow);
		const phase = classifyPhase(er, dir, pos);

		// Try to extend the segment
		while (segEnd < data.length - 1) {
			const nextEnd = Math.min(segEnd + Math.floor(segmentWindow / 2), data.length - 1);
			if (nextEnd === segEnd) break;
			const newER = computeER(data, i, nextEnd);
			const newDir = priceDirection(data, i, nextEnd);
			const newPos = pricePosition(data, i, nextEnd, fullHigh, fullLow);
			const newPhase = classifyPhase(newER, newDir, newPos);
			if (newPhase !== phase) break;
			segEnd = nextEnd;
		}

		const segER = computeER(data, i, segEnd);
		const segVol = avgVolume(data, i, segEnd);
		const confidence = computeConfidence(phase, segER, segEnd - i + 1, segVol, overallAvgVol);

		const priceStart = data[i].close;
		const priceEnd = data[segEnd].close;

		phases.push({
			phase,
			startIndex: i,
			endIndex: segEnd,
			startDate: data[i].date,
			endDate: data[segEnd].date,
			confidence,
			priceStart,
			priceEnd,
			priceChange: priceStart !== 0 ? ((priceEnd - priceStart) / priceStart) * 100 : 0,
		});

		i = segEnd + 1;
	}

	// Merge adjacent phases of the same type
	const merged: WyckoffSegment[] = [];
	for (const seg of phases) {
		const prev = merged[merged.length - 1];
		if (prev && prev.phase === seg.phase) {
			prev.endIndex = seg.endIndex;
			prev.endDate = seg.endDate;
			prev.priceEnd = seg.priceEnd;
			prev.priceChange = ((prev.priceEnd - prev.priceStart) / prev.priceStart) * 100;
			prev.confidence = (prev.confidence + seg.confidence) / 2;
		} else {
			merged.push({ ...seg });
		}
	}

	return {
		currentPhase: merged.length > 0 ? merged[merged.length - 1] : null,
		phases: merged,
	};
}
