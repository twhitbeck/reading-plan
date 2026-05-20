import { useEffect, useState } from "react";
import plan from "./plan.json";

const YEAR_STORAGE_KEY = "reading-plan-year";

const READING_DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PILL_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Sun→0, Mon→0, Tue→1, Wed→2, Thu→3, Fri→4, Sat→4
const DAY_TO_READING_INDEX = [0, 0, 1, 2, 3, 4, 4];

function getCurrentWeekOfYear(date: Date): number {
  // ISO 8601 week number: weeks start Monday, week 1 contains the first Thursday.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function biblegatewayUrl(reading: string): string {
  return `https://www.biblegateway.com/quicksearch/?quicksearch=${encodeURIComponent(reading)}&version=ESV`;
}

export function App() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const initialReadingIndex = DAY_TO_READING_INDEX[dayOfWeek];
  // Only show "today" indicator on weekdays
  const todayReadingIndex = dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : null;

  const [year, setYear] = useState<number>(() => {
    const stored = localStorage.getItem(YEAR_STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return parsed === 1 || parsed === 2 ? parsed : 1;
  });

  const yearData = plan.years.find((y) => y.year === year) ?? plan.years[0];
  const maxWeek = yearData.weeks.length;

  const defaultWeek = Math.min(Math.max(getCurrentWeekOfYear(today) - 1, 1), maxWeek);
  const [week, setWeek] = useState<number>(defaultWeek);
  const [dayIndex, setDayIndex] = useState<number>(initialReadingIndex);

  useEffect(() => {
    localStorage.setItem(YEAR_STORAGE_KEY, String(year));
  }, [year]);

  const weekData = yearData.weeks.find((w) => w.week_number === week) ?? yearData.weeks[0];
  const reading = weekData.readings[dayIndex];
  const items = [reading.ot, reading.nt, reading.psalm_proverb].filter(
    (item): item is string => item != null,
  );

  const selectClass =
    "ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-400";

  return (
    <div className="mx-auto max-w-xl px-4 py-10 font-sans">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{plan.reading_plan_title}</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <label className="text-sm font-medium">
          Year:
          <select
            className={selectClass}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {plan.years.map((y) => (
              <option key={y.year} value={y.year}>
                Year {y.year}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Week:
          <select
            className={selectClass}
            value={week}
            onChange={(e) => setWeek(parseInt(e.target.value, 10))}
          >
            {yearData.weeks.map((w) => (
              <option key={w.week_number} value={w.week_number}>
                Week {w.week_number}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex gap-1.5">
        {PILL_LABELS.map((label, i) => {
          const isSelected = i === dayIndex;
          const isToday = i === todayReadingIndex;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setDayIndex(i)}
              className={
                "relative flex-1 rounded-full px-2 py-1.5 text-sm font-medium transition " +
                (isSelected
                  ? "bg-sky-700 text-white shadow-sm dark:bg-sky-600"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")
              }
            >
              {label}
              {isToday && (
                <span
                  className={
                    "absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full " +
                    (isSelected ? "bg-white" : "bg-sky-600 dark:bg-sky-400")
                  }
                  aria-label="today"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {READING_DAY_LABELS[dayIndex]}
        </h2>
        <ul className="space-y-2 text-lg">
          {items.map((item) => (
            <li key={item}>
              <a
                className="text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-900 hover:decoration-sky-700 dark:text-sky-400 dark:decoration-sky-600 dark:hover:text-sky-200 dark:hover:decoration-sky-400"
                href={biblegatewayUrl(item)}
                target="_blank"
                rel="noreferrer"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
        {items.length > 1 && (
          <a
            className="mt-4 inline-block text-sm text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-900 hover:decoration-sky-700 dark:text-sky-400 dark:decoration-sky-600 dark:hover:text-sky-200 dark:hover:decoration-sky-400"
            href={biblegatewayUrl(items.join("; "))}
            target="_blank"
            rel="noreferrer"
          >
            Read all
          </a>
        )}
      </div>
    </div>
  );
}
