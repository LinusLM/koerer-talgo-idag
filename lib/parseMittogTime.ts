export function parseMittogTime(time: string) {
    if (typeof time !== "string" || time.trim() === "") {
        return NaN;
    }

    // Expected format: DD-MM-YYYY HH:mm (allow 1-2 digit day/month/hour)
    // Expected formats: DD-MM-YYYY HH:mm or DD-MM-YYYY HH:mm:ss
    // allow 1-2 digit day/month/hour and optional seconds
    const re = /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const m = re.exec(time.trim());
    if (!m) {
        return NaN;
    }

    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const second = m[6] ? Number(m[6]) : 0;

    // Validate ranges
    if (!(month >= 1 && month <= 12)) return NaN;
    if (!(day >= 1 && day <= 31)) return NaN;
    if (!(hour >= 0 && hour <= 23)) return NaN;
    if (!(minute >= 0 && minute <= 59)) return NaN;
    if (!(second >= 0 && second <= 59)) return NaN;

    const date = new Date(year, month - 1, day, hour, minute, second);
    const t = date.getTime();
    if (isNaN(t)) return NaN;
    return t;
}