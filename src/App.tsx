import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

  const carouselRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isFirstRender = useRef(true);

  // Pill indicator refs
  const pillsRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const pillButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Position the indicator to match scroll progress (0–4)
  const updateIndicator = useCallback((progress: number) => {
    const indicator = indicatorRef.current;
    const pillsContainer = pillsRef.current;
    if (!indicator || !pillsContainer) return;

    const clamped = Math.max(0, Math.min(progress, PILL_LABELS.length - 1));
    const leftIdx = Math.floor(clamped);
    const rightIdx = Math.min(leftIdx + 1, PILL_LABELS.length - 1);
    const frac = clamped - leftIdx;

    const leftPill = pillButtonRefs.current[leftIdx];
    const rightPill = pillButtonRefs.current[rightIdx];
    if (!leftPill || !rightPill) return;

    const containerLeft = pillsContainer.getBoundingClientRect().left;
    const x0 = leftPill.getBoundingClientRect().left - containerLeft;
    const x1 = rightPill.getBoundingClientRect().left - containerLeft;

    indicator.style.transform = `translateX(${x0 + frac * (x1 - x0)}px)`;
    indicator.style.width = `${leftPill.offsetWidth}px`;
  }, []);

  // Set indicator position before first paint to avoid flash
  useLayoutEffect(() => {
    updateIndicator(initialReadingIndex);
  }, [initialReadingIndex, updateIndicator]);

  // Re-measure indicator on pill bar resize (e.g. viewport width change)
  useEffect(() => {
    const pills = pillsRef.current;
    if (!pills) return;
    const observer = new ResizeObserver(() => {
      const carousel = carouselRef.current;
      updateIndicator(carousel ? carousel.scrollLeft / carousel.clientWidth : 0);
    });
    observer.observe(pills);
    return () => observer.disconnect();
  }, [updateIndicator]);

  // Scroll to active day when dayIndex changes (pill button click)
  useEffect(() => {
    const el = dayRefs.current[dayIndex];
    if (!el) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: isFirstRender.current || prefersReducedMotion ? "instant" : "smooth",
      block: "nearest",
      inline: "start",
    });
    isFirstRender.current = false;
  }, [dayIndex]);

  // Drive indicator in real-time during swipe; sync dayIndex at scroll end
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const syncDayIndex = () => {
      setDayIndex(Math.round(container.scrollLeft / container.clientWidth));
    };

    const onScroll = () => {
      updateIndicator(container.scrollLeft / container.clientWidth);
      if (!("onscrollend" in window)) {
        clearTimeout(timer);
        timer = setTimeout(syncDayIndex, 150);
      }
    };

    let timer: ReturnType<typeof setTimeout>;
    container.addEventListener("scroll", onScroll, { passive: true });
    if ("onscrollend" in window) container.addEventListener("scrollend", syncDayIndex);

    return () => {
      container.removeEventListener("scroll", onScroll);
      if ("onscrollend" in window) container.removeEventListener("scrollend", syncDayIndex);
      clearTimeout(timer);
    };
  }, [updateIndicator]);

  useEffect(() => {
    localStorage.setItem(YEAR_STORAGE_KEY, String(year));
  }, [year]);

  const weekData = yearData.weeks.find((w) => w.week_number === week) ?? yearData.weeks[0];

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

      {/* Pill bar with sliding indicator */}
      <div ref={pillsRef} className="relative mb-4 flex gap-1.5">
        <div
          ref={indicatorRef}
          className="pointer-events-none absolute inset-y-0 rounded-full bg-sky-700 shadow-sm dark:bg-sky-600"
        />
        {PILL_LABELS.map((label, i) => {
          const isSelected = i === dayIndex;
          const isToday = i === todayReadingIndex;
          return (
            <button
              key={label}
              ref={(el) => {
                pillButtonRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setDayIndex(i)}
              className={
                "relative z-10 flex-1 rounded-full px-2 py-1.5 text-sm font-medium transition-colors " +
                (isSelected
                  ? "text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100")
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

      {/* Carousel — each panel carries its own card styling so the whole card swipes */}
      <div
        ref={carouselRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
      >
        {READING_DAY_LABELS.map((label, i) => {
          const reading = weekData.readings[i];
          const items = [reading.ot, reading.nt, reading.psalm_proverb].filter(
            (item): item is string => item != null,
          );
          return (
            <div
              key={label}
              ref={(el) => {
                dayRefs.current[i] = el;
              }}
              className="w-full shrink-0 snap-start"
            >
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {label}
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
        })}
      </div>
    </div>
  );
}
