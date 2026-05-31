const { createApp, ref, computed, nextTick } = Vue;

createApp({
    setup() {
        const activeTab = ref('manager');
        const isDarkMode = ref(localStorage.getItem('asr_theme') !== 'light');
        const filterDate = ref(new Date().toISOString().split('T')[0]);
        const jsonPayload = ref('');
        
        const routines = ref(JSON.parse(localStorage.getItem('asr_routines')) || []);
        const checklist = ref(JSON.parse(localStorage.getItem('asr_checklist')) || {});
        const scores = ref(JSON.parse(localStorage.getItem('asr_scores')) || []);

        const form = ref({ id: '', title: '', type: 'Self', date: filterDate.value, startTime: '', endTime: '' });
        const isEditing = computed(() => form.value.id !== '');
        
        let chartInstance = null;
        const showAnalytics = ref(false);
        const currentScore = ref(0);
        const aiFeedback = ref('');

        const sortedRoutines = computed(() => [...routines.value].sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
        const timelineTasks = computed(() => routines.value.filter(t => t.date === filterDate.value).sort((a,b) => a.startTime.localeCompare(b.startTime)));
        const todayTasks = computed(() => routines.value.filter(t => t.date === new Date().toISOString().split('T')[0]).sort((a,b) => a.startTime.localeCompare(b.startTime)));
        
        const inputClasses = computed(() => isDarkMode.value ? 'bg-black border border-zinc-700 text-white' : 'bg-white border-2 border-slate-200 text-slate-900');

        const conflictStatus = computed(() => {
            let hasConflict = false; let hasFriction = false;
            const sDate = form.value.date; const sStart = form.value.startTime;
            if(!sDate || !sStart || !form.value.endTime) return { hasConflict, hasFriction };
            const nStartMins = timeToMins(sStart);

            routines.value.forEach(item => {
                if (item.id === form.value.id || item.date !== sDate) return;
                if (sStart < item.endTime && form.value.endTime > item.startTime) hasConflict = true;
                if (Math.abs(nStartMins - timeToMins(item.endTime)) < 30) hasFriction = true;
            });
            return { hasConflict, hasFriction };
        });

        const toggleTheme = () => {
            isDarkMode.value = !isDarkMode.value;
            localStorage.setItem('asr_theme', isDarkMode.value ? 'dark' : 'light');
            if(chartInstance && showAnalytics.value) renderChart();
        };

        const switchTab = (tab) => { activeTab.value = tab; if(tab === 'analytics' && showAnalytics.value) nextTick(() => renderChart()); };

        const getTypeColor = (type) => {
            if (type === 'Exam') return { bg: 'bg-red-500', border: 'border-l-red-500', text: 'text-red-500' };
            if (type === 'Coaching') return { bg: 'bg-blue-500', border: 'border-l-blue-500', text: 'text-blue-500' };
            return { bg: 'bg-emerald-500', border: 'border-l-emerald-500', text: 'text-emerald-500' };
        };

        const saveTask = () => {
            if (isEditing.value) {
                routines.value[routines.value.findIndex(t => t.id === form.value.id)] = { ...form.value };
            } else {
                routines.value.push({ ...form.value, id: 'item_' + Date.now() });
            }
            localStorage.setItem('asr_routines', JSON.stringify(routines.value));
            cancelEdit();
        };

        const editTask = (task) => { form.value = { ...task }; };
        const cancelEdit = () => { form.value = { id: '', title: '', type: 'Self', date: filterDate.value, startTime: '', endTime: '' }; };
        const deleteTask = (id) => { routines.value = routines.value.filter(t => t.id !== id); localStorage.setItem('asr_routines', JSON.stringify(routines.value)); };

        const injectJSON = () => {
            try {
                JSON.parse(jsonPayload.value).forEach(item => {
                    item.id = "item_" + Math.random().toString(36).substr(2, 6) + "_" + Date.now();
                    routines.value.push(item);
                });
                localStorage.setItem('asr_routines', JSON.stringify(routines.value));
                jsonPayload.value = '';
                alert("Injection Successful!");
            } catch (e) { alert("Syntax Error."); }
        };

        const processAnalytics = () => {
            let completed = 0; if(todayTasks.value.length === 0) return;
            todayTasks.value.forEach(t => { if(checklist.value[t.id]) completed++; });
            currentScore.value = Math.round((completed / todayTasks.value.length) * 100);
            
            const today = new Date().toISOString().split('T')[0];
            scores.value = scores.value.filter(s => s.date !== today);
            scores.value.push({ date: today, score: currentScore.value });
            localStorage.setItem('asr_scores', JSON.stringify(scores.value));

            aiFeedback.value = calculateMetricsFeedback(currentScore.value);
            showAnalytics.value = true;
            nextTick(() => renderChart());
        };

        const renderChart = () => {
            const ctx = document.getElementById('performanceChart'); if(!ctx) return;
            if (chartInstance) chartInstance.destroy();
            const labels = []; const dataPoints = [];
            for(let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
                const historic = scores.value.find(s => s.date === d.toISOString().split('T')[0]);
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

        return { activeTab, isDarkMode, filterDate, jsonPayload, routines, checklist, form, isEditing, sortedRoutines, timelineTasks, todayTasks, inputClasses, conflictStatus, showAnalytics, currentScore, aiFeedback, toggleTheme, switchTab, getTypeColor, saveTask, editTask, cancelEdit, deleteTask, injectJSON, processAnalytics };
    }
}).mount('#app');
