const IMF_FIXDATE_PATTERN =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), ([0-9]{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2}) GMT$/;
const RFC850_DATE_PATTERN =
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([0-9]{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2}) GMT$/;
const ASCTIME_DATE_PATTERN =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?:(?:([0-9]{2}))|(?: ([0-9]))) ([0-9]{2}):([0-9]{2}):([0-9]{2}) ([0-9]{4})$/;
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface HttpDateParts {
  weekday: number;
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  second: number;
}

interface DateWithinYearParts {
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

function getTimestamp({ weekday, day, month, year, hour, minute, second }: HttpDateParts): number | undefined {
  if (year < 1900 || day < 1 || hour > 23 || minute > 59 || second > 60) {
    return undefined;
  }

  const leapSecond = second === 60;
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hour, minute, leapSecond ? 59 : second, 0);
  if (
    date.getUTCDay() !== weekday ||
    date.getUTCDate() !== day ||
    date.getUTCMonth() !== month ||
    date.getUTCFullYear() !== year ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== (leapSecond ? 59 : second)
  ) {
    return undefined;
  }

  return date.getTime() + (leapSecond ? 1000 : 0);
}

function compareDateParts(left: DateWithinYearParts, right: DateWithinYearParts): number {
  return (
    left.month - right.month ||
    left.day - right.day ||
    left.hour - right.hour ||
    left.minute - right.minute ||
    left.second - right.second ||
    left.millisecond - right.millisecond
  );
}

/**
 * Parses an RFC 9110 HTTP-date into epoch milliseconds.
 *
 * `referenceTime` resolves the rolling century of obsolete RFC 850 dates. Since ECMAScript time
 * cannot represent a leap second, second 60 maps to the following representable instant.
 */
export function parseHttpDate(value: string, referenceTime: number): number | undefined {
  const match = IMF_FIXDATE_PATTERN.exec(value);
  if (match) {
    const [, weekday, day, month, year, hour, minute, second] = match;
    return getTimestamp({
      weekday: SHORT_WEEKDAYS.indexOf(weekday!),
      day: Number(day),
      month: MONTHS.indexOf(month!),
      year: Number(year),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    });
  }

  const obsoleteMatch = RFC850_DATE_PATTERN.exec(value);
  if (obsoleteMatch) {
    const [, weekday, day, month, shortYear, hour, minute, second] = obsoleteMatch;
    const referenceDate = new Date(referenceTime);
    if (Number.isNaN(referenceDate.getTime())) {
      return undefined;
    }
    const referenceYear = referenceDate.getUTCFullYear();
    let year = Math.floor(referenceYear / 100) * 100 + Number(shortYear);
    if (year < referenceYear) {
      year += 100;
    }
    const monthIndex = MONTHS.indexOf(month!);
    const candidateDateParts: DateWithinYearParts = {
      month: monthIndex,
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
      millisecond: 0,
    };
    const referenceDateParts: DateWithinYearParts = {
      month: referenceDate.getUTCMonth(),
      day: referenceDate.getUTCDate(),
      hour: referenceDate.getUTCHours(),
      minute: referenceDate.getUTCMinutes(),
      second: referenceDate.getUTCSeconds(),
      millisecond: referenceDate.getUTCMilliseconds(),
    };
    if (
      year > referenceYear + 50 ||
      (year === referenceYear + 50 && compareDateParts(candidateDateParts, referenceDateParts) > 0)
    ) {
      year -= 100;
    }
    return getTimestamp({
      weekday: LONG_WEEKDAYS.indexOf(weekday!),
      day: Number(day),
      month: monthIndex,
      year,
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    });
  }

  const asctimeMatch = ASCTIME_DATE_PATTERN.exec(value);
  if (!asctimeMatch) {
    return undefined;
  }
  const [, weekday, month, twoDigitDay, oneDigitDay, hour, minute, second, year] = asctimeMatch;
  return getTimestamp({
    weekday: SHORT_WEEKDAYS.indexOf(weekday!),
    day: Number(twoDigitDay ?? oneDigitDay),
    month: MONTHS.indexOf(month!),
    year: Number(year),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  });
}
