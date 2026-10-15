// Computational & Diagnostic Helper Modules
// Exposed as one namespace instead of leaking globals; index.html must load
// this file before app.js.
window.ASR = (() => {
    const pad2 = (n) => String(n).padStart(2, '0');

    const timeToMins = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // YYYY-MM-DD in the DEVICE timezone. toISOString() is UTC, which flipped
    // "today" at 18:00 local in UTC+6 and emptied the daily checklist at night.
    const localDate = (d = new Date()) =>
        `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    const TASK_TYPES = ['Exam', 'Coaching', 'Private', 'Self'];
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

    const isValidTask = (t) =>
        !!t && typeof t === 'object' && !Array.isArray(t) &&
        typeof t.title === 'string' && t.title.trim() !== '' &&
        TASK_TYPES.includes(t.type) &&
        DATE_RE.test(String(t.date)) &&
        TIME_RE.test(String(t.startTime)) &&
        TIME_RE.test(String(t.endTime)) &&
        timeToMins(t.startTime) < timeToMins(t.endTime);

    const calculateMetricsFeedback = (score) => {
        if (score === 100) return "<strong>👑 Elite Execution.</strong><br>Neurological mapping complete. All structural objectives met. Rest now to compound retention.";
        if (score >= 70) return "<strong>📈 Optimum Processing.</strong><br>Good operational velocity. Analyze the gap intervals surrounding missed targets to reduce friction tomorrow.";
        return "<strong>⚠️ Cognitive Degradation Warning.</strong><br>Metrics indicate schedule crowding or burnout. Expand your post-exam buffer blocks immediately.";
    };

    return { timeToMins, localDate, isValidTask, calculateMetricsFeedback, TASK_TYPES };
})();