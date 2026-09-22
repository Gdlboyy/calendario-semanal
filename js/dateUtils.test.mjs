import assert from 'node:assert/strict';
import {
  toISODate, getWeekStart, getWeekDates, addWeeks, formatDayLabel, formatWeekRange, isToday,
} from './dateUtils.js';

// getWeekStart always lands on a Monday, for any day of the week
for (let offset = 0; offset < 14; offset += 1) {
  const probe = new Date(2026, 0, 1 + offset);
  const start = getWeekStart(probe);
  assert.equal(start.getDay(), 1, `offset ${offset} should resolve to Monday`);
}

// getWeekDates returns 7 consecutive ISO dates starting at weekStart
const start = getWeekStart(new Date(2026, 5, 15));
const week = getWeekDates(start);
assert.equal(week.length, 7);
assert.equal(week[0], toISODate(start));
for (let i = 1; i < 7; i += 1) {
  const prev = new Date(week[i - 1]);
  const curr = new Date(week[i]);
  assert.equal((curr - prev) / (1000 * 60 * 60 * 24), 1, `day ${i} should be 1 day after day ${i - 1}`);
}

// addWeeks(date, 1) is exactly 7 days later
const base = new Date(2026, 2, 10);
const oneWeekLater = addWeeks(base, 1);
assert.equal((oneWeekLater - base) / (1000 * 60 * 60 * 24), 7);

// formatDayLabel returns a 3-letter code + day number
assert.match(formatDayLabel('2026-06-15'), /^[A-ZÁÉÍÓÚ]{3} \d{1,2}$/);

// formatWeekRange returns a human range string
assert.match(formatWeekRange(week), /^\d{1,2}–\d{1,2} [a-z]{3} \d{4}$/);
assert.equal(formatWeekRange(getWeekDates(new Date(2026, 8, 28))), '28 sep – 4 oct 2026');
assert.equal(formatWeekRange(getWeekDates(new Date(2026, 11, 28))), '28 dic 2026 – 3 ene 2027');

// isToday is true for today's own ISO date
assert.equal(isToday(toISODate(new Date())), true);
assert.equal(isToday('2000-01-01'), false);

console.log('dateUtils.test.mjs: all assertions passed');
