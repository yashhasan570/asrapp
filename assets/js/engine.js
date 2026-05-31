// Computational & Diagnostic Helper Modules
const timeToMins = (timeStr) => {
    if(!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const calculateMetricsFeedback = (score) => {
    if(score === 100) return "<strong>👑 Elite Execution.</strong><br>Neurological mapping complete. All structural objectives met. Rest now to compound retention.";
    if(score >= 70) return "<strong>📈 Optimum Processing.</strong><br>Good operational velocity. Analyze the gap intervals surrounding missed targets to reduce friction tomorrow.";
    return "<strong>⚠️ Cognitive Degradation Warning.</strong><br>Metrics indicate schedule crowding or burnout. Expand your post-exam buffer blocks immediately.";
};
