const { createApp, ref, computed, nextTick } = Vue;
const { timeToMins, localDate, isValidTask, calculateMetricsFeedback } = window.ASR;

// Corrupt localStorage used to throw at boot and blank the whole app.
const loadJSON = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        console.warn('[asr] dropping corrupt storage key:', key, e);
        return fallback;
    }
};

createApp({
    setup() {
        const activeTab = ref('manager');
        const isDarkMode = ref(localStorage.getItem('asr_theme') !== 'light');
        const filterDate = ref(localDate());
        const jsonPayload = ref('');

        const routines = ref(loadJSON('asr_routines', []));
        const checklist = ref(loadJSON('asr_checklist', {}));
        const scores = ref(loadJSON('asr_scores', []));

        const form = ref({ id: '', title: '', type: 'Self', date: filterDate.value, startTime: '', endTime: '' });
        const isEditing = computed(() => form.value.id !== '');

        let chartInstance = null;
        const showAnalytics = ref(false);
        const currentScore = ref(0);
        const aiFeedback = ref('');

        const byStart = (a, b) => a.startTime.localeCompare(b.startTime);
        const sortedRoutines = computed(() =>
            [...routines.value].sort((a, b) => a.date.localeCompare(b.date) || byStart(a, b)));
        const timelineTasks = computed(() =>
            routines.value.filter(t => t.date === filterDate.value).sort(byStart));
        const todayTasks = computed(() =>
            routines.value.filter(t => t.date === localDate()).sort(byStart));

        const inputClasses = computed(() => isDarkMode.value
            ? 'bg-black border border-zinc-700 text-white'
            : 'bg-white border-2 border-slate-200 text-slate-900');

        const conflictStatus = computed(() => {
            let hasConflict = false; let hasFriction = false;
            const sDate = form.value.date, sStart = form.value.startTime, sEnd = form.value.endTime;
            if (!sDate || !sStart || !sEnd) return { hasConflict, hasFriction };
            const sStartMins = timeToMins(sStart);
            const sEndMins = timeToMins(sEnd);

            routines.value.forEach(item => {
                if (item.id === form.value.id || item.date !== sDate) return;
                // overlap in either direction
                if (sStart < item.endTime && sEnd > item.startTime) hasConflict = true;
                // <30 min buffer, checked BOTH ways (was only prev-end -> this-start)
                const gapAfterPrev = sStartMins - timeToMins(item.endTime);
                const gapBeforeNext = timeToMins(item.startTime) - sEndMins;
                if ((gapAfterPrev >= 0 && gapAfterPrev < 30) ||
                    (gapBeforeNext >= 0 && gapBeforeNext < 30)) hasFriction = true;
            });
            return { hasConflict, hasFriction };
        });

        const persistRoutines = () => localStorage.setItem('asr_routines', JSON.stringify(routines.value));
        const saveChecklist = () => localStorage.setItem('asr_checklist', JSON.stringify(checklist.value));

        const toggleTheme = () => {
            isDarkMode.value = !isDarkMode.value;
            localStorage.setItem('asr_theme', isDarkMode.value ? 'dark' : 'light');
            if (chartInstance && showAnalytics.value) renderChart();
        };

        const switchTab = (tab) => {
            activeTab.value = tab;
            if (tab === 'analytics' && showAnalytics.value) nextTick(() => renderChart());
        };

        const getTypeColor = (type) => {
            if (type === 'Exam') return { bg: 'bg-red-500', border: 'border-l-red-500', text: 'text-red-500' };
            if (type === 'Coaching') return { bg: 'bg-blue-500', border: 'border-l-blue-500', text: 'text-blue-500' };
            if (type === 'Private') return { bg: 'bg-violet-500', border: 'border-l-violet-500', text: 'text-violet-500' };
            return { bg: 'bg-emerald-500', border: 'border-l-emerald-500', text: 'text-emerald-500' };
        };

        const saveTask = () => {
            if (!isValidTask(form.value)) {
                alert('Invalid task: title required, valid classification, date YYYY-MM-DD, and end time after start time.');
                return;
            }
            if (isEditing.value) {
                const idx = routines.value.findIndex(t => t.id === form.value.id);
                if (idx !== -1) routines.value[idx] = { ...form.value };
            } else {
                routines.value.push({
                    ...form.value,
                    id: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
                });
            }
            persistRoutines();
            cancelEdit();
        };

        const editTask = (task) => { form.value = { ...task }; };
        const cancelEdit = () => {
            form.value = { id: '', title: '', type: 'Self', date: filterDate.value, startTime: '', endTime: '' };
        };

        const deleteTask = (id) => {
            routines.value = routines.value.filter(t => t.id !== id);
            delete checklist.value[id];          // don't orphan checklist entries
            persistRoutines();
            saveChecklist();
        };

        const injectJSON = () => {
            let parsed;
            try {
                parsed = JSON.parse(jsonPayload.value);
            } catch (e) {
                alert('Syntax Error: paste valid JSON.');
                return;
            }
            if (!Array.isArray(parsed)) {
                alert('Payload must be a JSON array of tasks.');
                return;
            }
            const bad = parsed.map((t, i) => (isValidTask(t) ? null : i)).filter(v => v !== null);
            if (bad.length) {
                alert(`Invalid task(s) at index ${bad.join(', ')} — nothing imported.`);
                return;
            }
            const stamp = Date.now();
            parsed.forEach((item, i) => {
                routines.value.push({ ...item, id: 'item_' + stamp + '_' + i });
            });
            persistRoutines();
            jsonPayload.value = '';
            alert(`Injected ${parsed.length} task(s).`);
        };

        const processAnalytics = () => {
            const today = localDate();
            if (todayTasks.value.length === 0) {
                currentScore.value = 0;
                aiFeedback.value = '<strong>No tasks scheduled today.</strong><br>Add one on the Manager tab, then compile again.';
                showAnalytics.value = true;
                nextTick(() => renderChart());
                return;
            }
            const completed = todayTasks.value.filter(t => checklist.value[t.id]).length;
            currentScore.value = Math.round((completed / todayTasks.value.length) * 100);

            scores.value = scores.value.filter(s => s.date !== today);
            scores.value.push({ date: today, score: currentScore.value });
            localStorage.setItem('asr_scores', JSON.stringify(scores.value));

            aiFeedback.value = calculateMetricsFeedback(currentScore.value);
            showAnalytics.value = true;
            nextTick(() => renderChart());
        };

        const renderChart = () => {
            const ctx = document.getElementById('performanceChart');
            if (!ctx) return;
            if (chartInstance) chartInstance.destroy();
            const labels = []; const dataPoints = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                const key = localDate(d);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
                const historic = scores.value.find(s => s.date === key);
                dataPoints.push(historic ? historic.score : 0);
            }
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataPoints,
                        borderColor: isDarkMode.value ? '#22d3ee' : '#4f46e5',
                        backgroundColor: isDarkMode.value ? 'rgba(34, 211, 238, 0.1)' : 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4, fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        };

        return {
            activeTab, isDarkMode, filterDate, jsonPayload, routines, checklist, form, isEditing,
            sortedRoutines, timelineTasks, todayTasks, inputClasses, conflictStatus,
            showAnalytics, currentScore, aiFeedback,
            toggleTheme, switchTab, getTypeColor, saveTask, editTask, cancelEdit, deleteTask,
            injectJSON, saveChecklist, processAnalytics
        };
    }
}).mount('#app');