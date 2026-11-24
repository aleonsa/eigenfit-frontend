import type { ISODateTime, LocalDate } from './types';

const formatters = new Map<string, Intl.DateTimeFormat>();

function localParts(instant: Date, tz: string) {
    let formatter = formatters.get(tz);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        });
        formatters.set(tz, formatter);
    }
    const parts = formatter.formatToParts(instant);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
    return {
        date: `${part('year')?.padStart(4, '0')}-${part('month')}-${part('day')}`,
        time: `${part('hour')}:${part('minute')}`,
    };
}

export function localDateOf(iso: ISODateTime, tz: string): LocalDate {
    return localParts(new Date(iso), tz).date;
}

export function formatLocalTime(iso: ISODateTime, tz: string): string {
    return localParts(new Date(iso), tz).time;
}

export function addLocalDays(localDate: LocalDate, days: number): LocalDate {
    const date = new Date(`${localDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !Number.isFinite(date.getTime())
        || date.toISOString().slice(0, 10) !== localDate) {
        throw new RangeError(`Invalid local date: ${localDate}`);
    }
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

export function startOfLocalWeek(date: Date | string, tz: string): LocalDate {
    const localDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : localDateOf(new Date(date).toISOString(), tz);
    const weekday = new Date(`${localDate}T00:00:00Z`).getUTCDay();
    return addLocalDays(localDate, -((weekday + 6) % 7));
}

export function zonedLocalToUtc(localDate: LocalDate, time: string, tz: string): ISODateTime {
    addLocalDays(localDate, 0);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new RangeError(`Invalid local time: ${time}`);

    const wallTime = Date.parse(`${localDate}T${time}:00Z`);
    const candidates = [-36, 0, 36].map(hours => {
        const sample = wallTime + hours * 3_600_000;
        const parts = localParts(new Date(sample), tz);
        const offset = Date.parse(`${parts.date}T${parts.time}:00Z`) - sample;
        return wallTime - offset;
    });
    // Offset probes on both sides of a transition let us reject gaps and pick the first repeated time.
    const matches = candidates.filter(candidate => {
        const parts = localParts(new Date(candidate), tz);
        return parts.date === localDate && parts.time === time;
    });
    if (!matches.length) throw new RangeError(`Nonexistent local time: ${localDate} ${time} (${tz})`);
    return new Date(Math.min(...matches)).toISOString();
}
