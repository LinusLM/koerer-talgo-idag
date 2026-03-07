/**
 * Parse a time string and produce a Unix timestamp.
 *
 * Accepts three input forms: full date "DD-MM-YYYY HH:mm" with optional seconds, time-only "HH:mm" with optional seconds (interpreted as today or the next day if the time is more than 12 hours in the past), or any ISO/standard date string.
 *
 * @param time - The input time string to parse.
 * @returns The timestamp in milliseconds since the Unix epoch if parsing succeeds, `NaN` otherwise.
 */
export function parseMittogTime(time: string) {
    if (typeof time !== "string" || time.trim() === "") {
        return NaN;
    }

    const trimmed = time.trim();

    // 1) Full date form: DD-MM-YYYY HH:mm(:ss)?
    const fullDateRe = /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const m = fullDateRe.exec(trimmed);
    if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        const hour = Number(m[4]);
        const minute = Number(m[5]);
        const second = m[6] ? Number(m[6]) : 0;

        if (!(month >= 1 && month <= 12)) return NaN;
        if (!(day >= 1 && day <= 31)) return NaN;
        if (!(hour >= 0 && hour <= 23)) return NaN;
        if (!(minute >= 0 && minute <= 59)) return NaN;
        if (!(second >= 0 && second <= 59)) return NaN;

        // Interpret the provided components in Europe/Copenhagen timezone
        const dt = DateTime.fromObject(
            { year, month, day, hour, minute, second },
            { zone: 'Europe/Copenhagen' }
        );
        if (!dt.isValid) return NaN;
        // Verify the date didn't roll over (e.g., Feb 30 -> March 2)
        if (dt.day !== day || dt.month !== month) return NaN;
        return dt.toMillis();
    }

    // 2) Time-only form: HH:mm(:ss)? — interpret relative to now (today or next day)
    const timeOnlyRe = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const mt = timeOnlyRe.exec(trimmed);
    if (mt) {
        const hour = Number(mt[1]);
        const minute = Number(mt[2]);
        const second = mt[3] ? Number(mt[3]) : 0;

        if (!(hour >= 0 && hour <= 23)) return NaN;
        if (!(minute >= 0 && minute <= 59)) return NaN;
        if (!(second >= 0 && second <= 59)) return NaN;

        // Use Europe/Copenhagen 'now' for relative calculations. Allow deterministic
        // parsing by accepting an optional `referenceNow` (ms since epoch) and
        // `thresholdMs` to override the 12-hour heuristic.
        const now = options && typeof options.referenceNow === 'number'
            ? DateTime.fromMillis(options.referenceNow).setZone('Europe/Copenhagen')
            : DateTime.now().setZone('Europe/Copenhagen');

        let dt = DateTime.fromObject(
            { year: now.year, month: now.month, day: now.day, hour, minute, second },
            { zone: 'Europe/Copenhagen' }
        );
        if (!dt.isValid) return NaN;

        // If the time appears to be significantly in the past (more than 12 hours),
        // assume the intended departure is the next day.
        const twelveHours = (options && typeof options.thresholdMs === 'number')
            ? options.thresholdMs
            : 12 * 60 * 60 * 1000;
        if (dt.toMillis() < now.toMillis() - twelveHours) {
            dt = dt.plus({ days: 1 });
        }

        return dt.toMillis();
    }

        const date = new Date(year, month - 1, day, hour, minute, second);
        // Verify the date didn't roll over (e.g., Feb 30 -> March 2)
        if (date.getDate() !== day || date.getMonth() !== month - 1) {
            return NaN;
        }
        const t = date.getTime();
        if (isNaN(t)) return NaN;
        return t;
    }

    // 2) Time-only form: HH:mm(:ss)? — interpret relative to now (today or next day)
    const timeOnlyRe = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const mt = timeOnlyRe.exec(trimmed);
    if (mt) {
        const hour = Number(mt[1]);
        const minute = Number(mt[2]);
        const second = mt[3] ? Number(mt[3]) : 0;

        if (!(hour >= 0 && hour <= 23)) return NaN;
        if (!(minute >= 0 && minute <= 59)) return NaN;
        if (!(second >= 0 && second <= 59)) return NaN;

        const now = new Date();
        let date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, second);

        // If the time appears to be significantly in the past (more than 12 hours),
        // assume the intended departure is the next day (small stations often show next-day departures).
        const twelveHours = 12 * 60 * 60 * 1000;
        if (date.getTime() < now.getTime() - twelveHours) {
            date.setDate(date.getDate() + 1);
        }
        const t = date.getTime();
        if (isNaN(t)) return NaN;
        return t;
    }

    // 3) Fallback: try parsing as an ISO/standard date string
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) return parsed;

    return NaN;
}