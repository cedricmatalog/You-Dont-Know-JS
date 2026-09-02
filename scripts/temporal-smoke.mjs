#!/usr/bin/env node
/** Regression checks for Temporal claims in ES.Next Chapter 4 (H1–H9). */
import assert from "node:assert/strict";
import { Temporal } from "temporal-polyfill";

const suzyBirthday = Temporal.PlainMonthDay.from({ month: 7, day: 7 });
const workshop = Temporal.ZonedDateTime.from({
	timeZone: "America/Chicago",
	year: 2022,
	month: 7,
	day: 7,
	hour: 11,
	minute: 0,
});
assert.equal(workshop.toPlainDate().toPlainMonthDay().equals(suzyBirthday), true);
assert.equal(typeof suzyBirthday.month, "undefined");

const zdt = Temporal.ZonedDateTime.from("2022-03-12T08:00:00[America/Chicago]");
assert.match(zdt.add({ days: 1 }).toString(), /2022-03-13T08:00:00-05:00/);
assert.match(zdt.add({ hours: 24 }).toString(), /2022-03-13T09:00:00-05:00/);

const chicago = Temporal.ZonedDateTime.from("2022-07-07T11:00:00[America/Chicago]");
const paris = chicago.withTimeZone("Europe/Paris");
assert.equal(chicago.toInstant().equals(paris.toInstant()), true);
assert.equal(chicago.toPlainDate().equals(paris.toPlainDate()), true);
assert.equal(
	chicago.with({ hour: 22 }).withTimeZone("Europe/Paris").toPlainDate().toString(),
	"2022-07-08",
);

const start = Temporal.PlainDate.from("2022-07-07");
const end = Temporal.PlainDate.from("2022-07-10");
assert.equal(start.until(end).toString(), "P3D");
assert.throws(
	() => start.until(end, { largestUnit: "hours" }),
	{ name: "RangeError" },
);

assert.equal(typeof Temporal.TimeZone, "undefined");
assert.equal(typeof Temporal.Calendar, "undefined");

const gap = Temporal.ZonedDateTime.from({
	timeZone: "America/Chicago",
	year: 2022,
	month: 3,
	day: 13,
	hour: 2,
	minute: 30,
});
assert.match(gap.toString(), /2022-03-13T03:30:00-05:00/);
assert.throws(
	() =>
		Temporal.ZonedDateTime.from(
			{
				timeZone: "America/Chicago",
				year: 2022,
				month: 3,
				day: 13,
				hour: 2,
				minute: 30,
			},
			{ disambiguation: "reject" },
		),
	{ name: "RangeError" },
);

const fmt = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/Chicago",
	weekday: "long",
	month: "long",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
});
assert.throws(() => fmt.format(workshop), TypeError);
const instant = workshop.toInstant();
try {
	assert.equal(typeof fmt.format(instant), "string");
}
catch (err) {
	assert.equal(err.name, "TypeError");
	assert.equal(
		typeof fmt.format(new Date(instant.epochMilliseconds)),
		"string",
	);
}

const startSlot = Temporal.ZonedDateTime.from("2022-07-07T11:30:00[America/Chicago]");
assert.match(startSlot.add({ minutes: 90 }).toString(), /2022-07-07T13:00:00/);

console.log("ok — Temporal smoke (chapter 4 claims).");
