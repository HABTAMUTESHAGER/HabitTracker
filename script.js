// Habit Tracker Pro - COMPLETE FIXED VERSION
class HabitTracker {
  constructor() {
    this.state = {
      habits: [],
      settings: {
        theme: 'light',
        accentColor: '#22d3ee',
        reminders: false,
        reminderTime: '09:00',
        notificationType: 'browser'
      },
      analytics: {
        timeRange: '30',
        chartType: 'line'
      }
    };
    this.charts = {};
    this.currentTimeRange = 'week';
    this.pendingConfirm = null;
    this.reminderTimeout = null;
    
    // Run init immediately if DOM is ready; otherwise wait.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  // ===== Init =====
  async init() {
    this.loadData();
    this.setupEventListeners();
    this.initUI();
    this.initCharts();
    this.renderAll();
    this.updateCurrentDate();
    this.requestNotificationPermission();
    this.scheduleReminders();
    this.switchSection('dashboard');
  }

  // ===== Persistence =====
  loadData() {
    try {
      const savedHabits = localStorage.getItem('habitTracker_habits');
      const savedSettings = localStorage.getItem('habitTracker_settings');
      if (savedHabits) this.state.habits = JSON.parse(savedHabits);
      if (savedSettings) this.state.settings = { ...this.state.settings, ...JSON.parse(savedSettings) };
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
  
  saveData() {
    try {
      localStorage.setItem('habitTracker_habits', JSON.stringify(this.state.habits));
      localStorage.setItem('habitTracker_settings', JSON.stringify(this.state.settings));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // ===== Event Listeners =====
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('nav button[data-section]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
      });
    });

    // Theme toggle
    document.getElementById('toggle-theme')?.addEventListener('click', () => this.toggleTheme());

    // Theme selector
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.setTheme(e.currentTarget.dataset.theme));
    });

    // Color selector
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.setAccentColor(e.currentTarget.dataset.color));
    });

    // Habit form
    const habitForm = document.getElementById('habit-form');
    if (habitForm) habitForm.addEventListener('submit', (e) => this.handleCreateHabit(e));

    // Frequency dropdown
    const frequencySelect = document.getElementById('habit-frequency');
    if (frequencySelect) frequencySelect.addEventListener('change', (e) => this.toggleCustomDays(e.target.value));

    // Time inputs for duration calculation
    const startTimeInput = document.getElementById('habit-start');
    const endTimeInput = document.getElementById('habit-end');
    if (startTimeInput && endTimeInput) {
      startTimeInput.addEventListener('change', () => this.calculateDuration());
      endTimeInput.addEventListener('change', () => this.calculateDuration());
    }

    // Habit filter
    const habitFilter = document.getElementById('habit-filter');
    if (habitFilter) habitFilter.addEventListener('change', (e) => this.filterHabits(e.target.value));

    // Add habit from empty state
    const addHabitBtn = document.getElementById('add-habit-today');
    if (addHabitBtn) addHabitBtn.addEventListener('click', () => this.switchSection('habits'));

    // Settings
    const enableReminders = document.getElementById('enable-reminders');
    if (enableReminders) {
      enableReminders.addEventListener('change', (e) => {
        this.state.settings.reminders = e.target.checked;
        this.saveData();
        this.updateReminderStatus();
        this.scheduleReminders();
      });
    }

    const reminderTime = document.getElementById('reminder-time');
    if (reminderTime) {
      reminderTime.addEventListener('change', (e) => {
        this.state.settings.reminderTime = e.target.value;
        this.saveData();
        this.scheduleReminders();
      });
    }

    const notificationType = document.getElementById('notification-type');
    if (notificationType) {
      notificationType.addEventListener('change', (e) => {
        this.state.settings.notificationType = e.target.value;
        this.saveData();
      });
    }

    // Data management
    document.getElementById('export-json')?.addEventListener('click', () => this.exportData('json'));
    document.getElementById('export-csv')?.addEventListener('click', () => this.exportData('csv'));
    document.getElementById('import-data')?.addEventListener('click', () => this.showImportModal());
    document.getElementById('reset-data')?.addEventListener('click', () => this.showResetConfirmation());

    // Analytics
    const progressRange = document.getElementById('progress-range');
    if (progressRange) {
      progressRange.addEventListener('change', (e) => {
        this.state.analytics.timeRange = e.target.value;
        this.updateProgressChart();
      });
    }

    // Time range buttons
    document.querySelectorAll('.time-range-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const range = e.currentTarget.dataset.range;
        this.setTimeRange(range);
        this.renderStats();
      });
    });

    // Week selector
    const weekSelector = document.getElementById('week-selector');
    if (weekSelector) weekSelector.addEventListener('change', (e) => this.updateWeeklyChart(e.target.value));

    // Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });
    document.getElementById('confirmation-cancel')?.addEventListener('click', () => this.closeAllModals());
    document.getElementById('confirmation-confirm')?.addEventListener('click', () => this.confirmAction());

    // File import
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#22d3ee';
        dropZone.style.background = 'rgba(34, 211, 238, 0.05)';
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
        const file = e.dataTransfer.files[0];
        if (file) this.handleFileImport(file);
      });
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.handleFileImport(file);
      });
    }

    // Modal backdrop
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) this.closeAllModals();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.switchSection('habits');
        document.getElementById('habit-name')?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  // ===== UI Init =====
  initUI() {
    this.applyTheme(this.state.settings.theme);
    this.applyAccentColor(this.state.settings.accentColor);
    this.updateReminderStatus();
    this.setDefaultTimeValues();
    this.calculateDuration();
  }

  // ===== Charts Init =====
  initCharts() {
    // Placeholders - actual initialization happens in update methods
  }

  // ===== Render All =====
  renderAll() {
    this.renderDashboard();
    this.renderHabits();
    this.renderStats();
    this.renderAnalytics();
    this.renderSettings();
  }

  // ===== Navigation =====
  switchSection(sectionId) {
    // Update nav buttons
    document.querySelectorAll('nav button[data-section]').forEach(btn => {
      const isActive = btn.dataset.section === sectionId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
    
    // Show active section
    document.querySelectorAll('main > section').forEach(section => {
      section.classList.toggle('active', section.id === sectionId);
    });
    
    // Render-on-demand for heavier sections
    setTimeout(() => {
      switch(sectionId) {
        case 'dashboard':
          this.updateWeeklyChart('current');
          this.updateConsistencyHeatmap();
          break;
        case 'habits':
          this.updateCategoryDistribution();
          break;
        case 'stats':
          this.renderStats();
          break;
        case 'analytics':
          this.updateProgressChart();
          this.updateHabitKPIs();
          this.updateAnalyticsMetrics();
          this.updateHabitHeatmap();
          break;
      }
    }, 50);
  }

  // ===== Theme & Accent =====
  toggleTheme() {
    const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }
  
  setTheme(theme) {
    if (theme === 'auto') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    this.state.settings.theme = theme;
    this.applyTheme(theme);
    document.querySelectorAll('.theme-option').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
    this.saveData();
  }
  
  applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.remove('light-theme');
      document.getElementById('toggle-theme').innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.body.classList.add('light-theme');
      document.getElementById('toggle-theme').innerHTML = '<i class="fas fa-moon"></i>';
    }
  }
  
  setAccentColor(color) {
    this.state.settings.accentColor = color;
    this.applyAccentColor(color);
    document.querySelectorAll('.color-option').forEach(btn => btn.classList.toggle('active', btn.dataset.color === color));
    this.saveData();
  }
  
  applyAccentColor(color) {
    document.documentElement.style.setProperty('--accent-primary', color);
    const lighter = this.lightenColor(color, 20);
    document.documentElement.style.setProperty('--accent-secondary', lighter);
  }
  
  lightenColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  // ===== Habits =====
  setDefaultTimeValues() {
    const start = document.getElementById('habit-start');
    const end = document.getElementById('habit-end');
    if (start && !start.value) start.value = '09:00';
    if (end && !end.value) {
      const [h, m] = (start?.value || '09:00').split(':').map(Number);
      const d = new Date();
      d.setHours(h + 1, m);
      end.value = d.toTimeString().slice(0, 5);
    }
  }
  
  calculateDuration() {
    const s = document.getElementById('habit-start')?.value;
    const e = document.getElementById('habit-end')?.value;
    const disp = document.getElementById('duration-calc');
    if (!s || !e || !disp) return;
    const dur = this.calculateTimeDuration(s, e);
    if (dur <= 0) {
      disp.textContent = 'Invalid time range';
      disp.style.color = '#ef4444';
    } else {
      const h = Math.floor(dur / 60), m = dur % 60;
      disp.textContent = h > 0 ? `${h}h ${m}m` : `${m} minutes`;
      disp.style.color = '#22d3ee';
    }
  }
  
  calculateTimeDuration(startTime, endTime) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let dur = (eh * 60 + em) - (sh * 60 + sm);
    if (dur < 0) dur += 1440;
    return dur;
  }
  
  toggleCustomDays(freq) {
    const box = document.getElementById('custom-days-container');
    if (box) box.style.display = freq === 'custom' ? 'flex' : 'none';
  }
  
  handleCreateHabit(e) {
    e.preventDefault();
    const name = document.getElementById('habit-name').value.trim();
    const category = document.getElementById('habit-category').value;
    const frequency = document.getElementById('habit-frequency').value;
    const startTime = document.getElementById('habit-start').value;
    const endTime = document.getElementById('habit-end').value;
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    
    if (!name) { this.showToast('Please enter a habit name', 'error'); return; }
    
    const duration = this.calculateTimeDuration(startTime, endTime);
    if (duration <= 0) { this.showToast('End time must be after start time (or next day)', 'error'); return; }

    let customDays = [];
    if (frequency === 'custom') {
      customDays = Array.from(document.querySelectorAll('input[name="custom-days"]:checked')).map(cb => cb.value);
      if (!customDays.length) { this.showToast('Select at least one custom day', 'error'); return; }
    }

    const habit = {
      id: Date.now().toString(),
      name, category, frequency, startTime, endTime, duration,
      customDays, difficulty,
      createdAt: new Date().toISOString(),
      createdWeekday: new Date().getDay(),
      completedDates: [],
      streak: 0,
      totalCompletions: 0,
      totalMinutes: 0,
      color: this.getRandomColor(),
      isActive: true
    };
    
    this.state.habits.push(habit);
    this.saveData();
    e.target.reset();
    this.setDefaultTimeValues();
    this.calculateDuration();
    this.showToast(`Habit "${name}" created successfully!`, 'success');
    this.renderAll();
  }
  
  getRandomColor() {
    const colors = ['#22d3ee', '#a855f7', '#58f29c', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  toggleHabitCompletion(habitId) {
    const habit = this.state.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const todayISO = this.getLocalISODate();
    if (!this.isHabitScheduledForToday(habit, new Date())) {
      this.showToast('This habit is not scheduled for today', 'warning');
      return;
    }
    
    const idx = habit.completedDates.findIndex(d => d.startsWith(todayISO));
    if (idx === -1) {
      habit.completedDates.push(new Date().toISOString());
      habit.totalCompletions++;
      habit.totalMinutes += habit.duration;
      this.updateHabitStreak(habit);
      this.showToast(`Habit "${habit.name}" marked as completed!`, 'success');
    } else {
      habit.completedDates.splice(idx, 1);
      habit.totalCompletions--;
      habit.totalMinutes -= habit.duration;
      habit.streak = this.calculateCurrentStreak(habit);
      this.showToast(`Habit "${habit.name}" unmarked`, 'info');
    }
    
    this.saveData();
    this.renderAll();
  }
  
  isHabitScheduledForToday(habit, date) {
    const dayOfWeek = date.getDay();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayName = dayNames[dayOfWeek];
    
    switch (habit.frequency) {
      case 'daily': return true;
      case 'weekly': return dayOfWeek === (habit.createdWeekday ?? 1);
      case 'monthly': return date.getDate() === new Date(habit.createdAt).getDate();
      case 'custom': return habit.customDays.includes(todayName);
      default: return true;
    }
  }
  
  updateHabitStreak(habit) { 
    habit.streak = this.calculateCurrentStreak(habit); 
  }
  
  calculateCurrentStreak(habit) {
    if (habit.completedDates.length === 0) return 0;
    
    const todayISO = this.getLocalISODate();
    const datesISO = habit.completedDates.map(d => d.slice(0, 10)).sort().reverse();
    let streak = 0;
    let cursor = todayISO;
    
    for (const d of datesISO) {
      if (d === cursor) {
        streak++;
        const cur = new Date(cursor);
        cur.setDate(cur.getDate() - 1);
        cursor = cur.toISOString().slice(0, 10);
      } else break;
    }
    
    return streak;
  }
  
  deleteHabit(habitId) {
    const idx = this.state.habits.findIndex(h => h.id === habitId);
    if (idx === -1) return;
    
    const habitName = this.state.habits[idx].name;
    this.showConfirmation('Delete Habit', `Are you sure you want to delete "${habitName}"? This action cannot be undone.`, () => {
      this.state.habits.splice(idx, 1);
      this.saveData();
      this.renderAll();
      this.showToast(`Habit "${habitName}" deleted`, 'info');
    });
  }

  // ===== Filters =====
  filterHabits(filter) {
    const habitsList = document.getElementById('habits-list');
    const empty = document.getElementById('no-habits');
    if (!habitsList) return;
    
    const todayStr = this.getLocalISODate();
    let filtered = [...this.state.habits];
    
    if (filter === 'today') filtered = filtered.filter(h => this.isHabitScheduledForToday(h, new Date()));
    if (filter === 'active') filtered = filtered.filter(h => h.isActive);
    if (filter === 'completed') filtered = filtered.filter(h => h.completedDates.some(d => d.startsWith(todayStr)));
    
    this.renderHabitsList(filtered);
    if (empty) empty.style.display = filtered.length ? 'none' : 'block';
  }

  // ===== Dashboard Rendering =====
  renderDashboard() {
    const today = new Date();
    const todayStr = this.getLocalISODate(today);
    const todayHabits = this.state.habits.filter(h => this.isHabitScheduledForToday(h, today));
    const completedToday = todayHabits.filter(h => h.completedDates.some(d => d.startsWith(todayStr)));
    const totalMinutes = completedToday.reduce((sum, h) => sum + h.duration, 0);
    const currentStreak = this.calculateOverallStreak();
    const completionRate = todayHabits.length ? Math.round((completedToday.length / todayHabits.length) * 100) : 0;

    this.setText('current-streak', currentStreak);
    this.setText('completion-rate', `${completionRate}%`);
    this.setText('total-minutes', totalMinutes);
    this.setText('active-habits', this.state.habits.length);

    this.renderTodayHabits(todayHabits);

    const noHabitsToday = document.getElementById('no-habits-today');
    const todayHabitsContainer = document.getElementById('today-habits');
    if (todayHabits.length === 0) {
      if (noHabitsToday) noHabitsToday.style.display = 'flex';
      if (todayHabitsContainer) todayHabitsContainer.style.display = 'none';
    } else {
      if (noHabitsToday) noHabitsToday.style.display = 'none';
      if (todayHabitsContainer) todayHabitsContainer.style.display = 'block';
    }
  }

  renderTodayHabits(habits) {
    const container = document.getElementById('today-habits');
    if (!container) return;
    
    const todayStr = this.getLocalISODate();
    container.innerHTML = habits.map(habit => {
      const isCompleted = habit.completedDates.some(date => date.startsWith(todayStr));
      const dur = habit.duration || 0;
      return `<div class="habit-item">
        <div class="habit-header">
          <div class="habit-info">
            <h3>${habit.name}</h3>
            <div class="habit-meta">
              <div class="habit-time"><i class="fas fa-clock"></i> ${habit.startTime}–${habit.endTime}</div>
              <div class="habit-badges">
                <span class="badge frequency">${habit.frequency}</span>
                <span class="badge streak">${habit.streak} day streak</span>
                <span class="badge difficulty">${habit.difficulty}</span>
              </div>
            </div>
          </div>
          <div class="habit-actions">
            <button class="completion-toggle ${isCompleted ? 'completed' : ''}" data-id="${habit.id}">
              <i class="fas ${isCompleted ? 'fa-check' : 'fa-play'}"></i> ${isCompleted ? 'Done' : 'Mark'}
            </button>
          </div>
        </div>
        <div class="habit-footer">
          <div class="habit-progress">
            <div class="progress-bar"><div class="progress-fill" style="width:${isCompleted ? 100 : 0}%"></div></div>
            <span>${isCompleted ? 'Completed' : 'Pending'}</span>
          </div>
          <div class="pill ghost small">${dur} min</div>
        </div>
      </div>`;
    }).join('');
    
    container.querySelectorAll('.completion-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggleHabitCompletion(btn.dataset.id));
    });
  }

  renderHabits() {
    const list = document.getElementById('habits-list');
    const empty = document.getElementById('no-habits');
    if (!list) return;
    
    const todayStr = this.getLocalISODate();
    if (!this.state.habits.length) {
      if (empty) empty.style.display = 'block';
      list.innerHTML = '';
      this.setText('total-habits-count', 0);
      this.setText('monthly-completion', '0%');
      return;
    }
    
    if (empty) empty.style.display = 'none';
    this.renderHabitsList(this.state.habits);
    this.setText('total-habits-count', this.state.habits.length);
    
    // Calculate monthly completion
    const monthlyCompletion = this.calculateMonthlyCompletion();
    this.setText('monthly-completion', `${monthlyCompletion}%`);
    
    // Update category distribution
    this.updateCategoryDistribution();
  }

  renderHabitsList(habits) {
    const list = document.getElementById('habits-list');
    const empty = document.getElementById('no-habits');
    if (!list) return;
    
    const todayStr = this.getLocalISODate();
    if (!habits.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    
    if (empty) empty.style.display = 'none';
    list.innerHTML = habits.map(h => {
      const doneToday = h.completedDates.some(d => d.startsWith(todayStr));
      const progress = Math.min(100, Math.round((h.streak / 30) * 100));
      return `<div class="habit-item">
        <div class="habit-header">
          <div class="habit-info">
            <h3>${h.name}</h3>
            <div class="habit-meta">
              <div class="habit-time"><i class="fas fa-clock"></i> ${h.startTime}–${h.endTime}</div>
              <div class="habit-badges">
                <span class="badge frequency">${h.frequency}</span>
                <span class="badge streak">${h.streak} day streak</span>
                <span class="badge difficulty">${h.difficulty}</span>
              </div>
            </div>
          </div>
          <div class="habit-actions">
            <button class="completion-toggle ${doneToday ? 'completed' : ''}" data-id="${h.id}">
              <i class="fas ${doneToday ? 'fa-check' : 'fa-play'}"></i> ${doneToday ? 'Done' : 'Mark'}
            </button>
            <button class="delete-btn" data-del="${h.id}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
        <div class="habit-footer">
          <div class="habit-progress">
            <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
            <span>${h.totalCompletions} completions</span>
          </div>
          <div class="pill ghost small">${h.totalMinutes} min</div>
        </div>
      </div>`;
    }).join('');
    
    list.querySelectorAll('.completion-toggle').forEach(btn => btn.addEventListener('click', () => this.toggleHabitCompletion(btn.dataset.id)));
    list.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => this.deleteHabit(btn.dataset.del)));
  }

  // ===== STATS SECTION - FIXED =====
  renderStats() {
    if (!this.state.habits.length) {
      this.renderEmptyStats();
      return;
    }
    
    // Calculate all metrics
    const monthlySummary = this.calculateMonthlySummary();
    const topHabits = this.getTopHabits(5);
    const consistencyRate = this.calculateOverallConsistency();
    const longestStreak = this.calculateLongestStreak();
    const bestDay = this.calculateBestDay();
    const weeklyTrend = this.calculateWeeklyTrend();
    
    // Update UI elements
    this.setText('monthly-total-minutes', monthlySummary.totalMinutes);
    this.setText('daily-average', monthlySummary.avgDailyMinutes);
    this.setText('weekly-average', Math.round(monthlySummary.totalMinutes / 4));
    this.setText('month-progress-text', `${monthlySummary.monthProgress}%`);
    this.setWidth('monthly-progress', `${monthlySummary.monthProgress}%`);
    
    this.setText('streak-days', longestStreak);
    this.setText('consistency-rate', `${consistencyRate}%`);
    this.setText('best-day', bestDay ? `${bestDay[0]} (${bestDay[1]})` : '--');
    
    // Update weekly summary
    const last7DaysMinutes = this.countMinutesLastDays(7);
    const last7DaysEntries = this.countEntriesLastDays(7);
    
    this.setText('total-entries', last7DaysEntries);
    this.setText('total-minutes-week', last7DaysMinutes);
    this.setText('avg-daily-minutes', Math.round(last7DaysMinutes / 7) || 0);
    
    // Update trend
    this.updateWeeklyTrend(weeklyTrend);
    
    // Render components
    this.renderTopHabits(topHabits);
    this.renderWeeklyBreakdown();
    
    // Update charts
    this.updateWeeklyMinutesChart();
    this.updateTimeDistributionChart();
  }

  renderEmptyStats() {
    this.setText('streak-days', 0);
    this.setText('consistency-rate', '0%');
    this.setText('best-day', '--');
    this.setText('monthly-total-minutes', 0);
    this.setText('weekly-average', 0);
    this.setText('daily-average', 0);
    this.setText('month-progress-text', '0%');
    this.setWidth('monthly-progress', '0%');
    this.setText('total-entries', 0);
    this.setText('total-minutes-week', 0);
    this.setText('avg-daily-minutes', 0);
    this.setText('trend-value', '0%');
    
    const container = document.getElementById('top-habits');
    if (container) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>No habit data yet</p></div>';
    }
    
    const tbody = document.getElementById('weekly-breakdown-body');
    if (tbody) tbody.innerHTML = '';
  }

  calculateMonthlySummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    let totalMinutes = 0;
    const habitCompletions = {};
    
    this.state.habits.forEach(habit => {
      habit.completedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        if (date >= startOfMonth && date <= now) {
          totalMinutes += habit.duration;
          const dayKey = date.toISOString().split('T')[0];
          habitCompletions[dayKey] = (habitCompletions[dayKey] || 0) + 1;
        }
      });
    });
    
    const daysSoFar = now.getDate();
    const completedDays = Object.keys(habitCompletions).length;
    const avgDailyMinutes = daysSoFar > 0 ? Math.round(totalMinutes / daysSoFar) : 0;
    const monthProgress = Math.min(100, Math.round((daysSoFar / daysInMonth) * 100));
    
    return {
      totalMinutes,
      avgDailyMinutes,
      monthProgress,
      completedDays,
      daysInMonth,
      daysSoFar,
      habitCompletions
    };
  }

  getTopHabits(limit = 5) {
    if (!this.state.habits.length) return [];
    
    return [...this.state.habits]
      .map(habit => ({
        ...habit,
        consistency: this.getHabitConsistency(habit)
      }))
      .sort((a, b) => {
        if (b.consistency !== a.consistency) return b.consistency - a.consistency;
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.totalCompletions - a.totalCompletions;
      })
      .slice(0, limit);
  }

  calculateOverallConsistency(days = 30) {
    if (!this.state.habits.length) return 0;
    
    const start = new Date();
    start.setDate(start.getDate() - days);
    let daysWithCompletions = 0;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const iso = this.getLocalISODate(date);
      
      const hasCompletion = this.state.habits.some(habit =>
        habit.completedDates.some(d => d.startsWith(iso))
      );
      
      if (hasCompletion) daysWithCompletions++;
    }
    
    return Math.round((daysWithCompletions / days) * 100);
  }

  calculateBestDay() {
    if (!this.state.habits.length) return null;
    
    const dayStats = {};
    this.state.habits.forEach(habit => {
      habit.completedDates.forEach(dateStr => {
        const day = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
        dayStats[day] = (dayStats[day] || 0) + 1;
      });
    });
    
    const entries = Object.entries(dayStats);
    if (!entries.length) return null;
    
    return entries.sort((a, b) => b[1] - a[1])[0];
  }

  calculateWeeklyTrend() {
    const thisWeekMinutes = this.countMinutesLastDays(7);
    const lastWeekMinutes = this.countMinutesLastDays(14) - thisWeekMinutes;
    
    if (lastWeekMinutes === 0) return 0;
    
    const trend = ((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100;
    return Math.round(trend);
  }

  updateWeeklyTrend(trend) {
    const trendEl = document.getElementById('trend-value');
    const icon = document.querySelector('#weekly-trend i');
    
    if (trendEl && icon) {
      trendEl.textContent = `${Math.abs(trend)}%`;
      
      if (trend >= 0) {
        icon.className = 'fas fa-arrow-up';
        icon.style.color = 'var(--accent-success)';
      } else {
        icon.className = 'fas fa-arrow-down';
        icon.style.color = 'var(--accent-danger)';
      }
    }
  }

  renderWeeklyBreakdown() {
    const tbody = document.getElementById('weekly-breakdown-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = {};
    
    // Initialize
    days.forEach(day => {
      dayStats[day] = { minutes: 0, count: 0 };
    });
    
    // Calculate last 7 days stats
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = days[date.getDay()];
      const iso = this.getLocalISODate(date);
      
      let dayMinutes = 0;
      let dayCount = 0;
      
      this.state.habits.forEach(habit => {
        const completedToday = habit.completedDates.some(d => d.startsWith(iso));
        if (completedToday) {
          dayMinutes += habit.duration;
          dayCount++;
        }
      });
      
      dayStats[dayName].minutes += dayMinutes;
      dayStats[dayName].count += dayCount;
    }
    
    // Create table rows
    days.forEach(day => {
      const stats = dayStats[day];
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${day}</td>
        <td>${stats.minutes}</td>
        <td>${stats.count}</td>
      `;
      
      tbody.appendChild(row);
    });
  }

  renderTopHabits() {
    const container = document.getElementById('top-habits');
    if (!container) return;
    
    const topHabits = this.getTopHabits(5);
    
    if (!topHabits.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-chart-line"></i>
          <p>No habit data yet</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = topHabits.map((habit, index) => `
      <div class="top-habit" data-id="${habit.id}">
        <div class="top-habit-rank">${index + 1}</div>
        <div class="top-habit-info">
          <div class="top-habit-name">${habit.name}</div>
          <div class="top-habit-meta">
            <span class="badge streak">${habit.streak} day streak</span>
            <span class="badge frequency">${habit.frequency}</span>
          </div>
        </div>
        <div class="top-habit-stats">
          <div class="top-habit-consistency">${habit.consistency}%</div>
          <div class="top-habit-completions">${habit.totalCompletions} done</div>
        </div>
      </div>
    `).join('');
  }

  // ===== Analytics Rendering =====
  renderAnalytics() {
    const totalCompletions = this.state.habits.reduce((sum, h) => sum + h.totalCompletions, 0);
    const totalPossible = this.state.habits.length * 30;
    const overall = totalPossible ? Math.round((totalCompletions / totalPossible) * 100) : 0;
    
    this.setText('current-streak-analytics', `${this.calculateOverallStreak()} days`);
    this.setText('success-rate', `${this.getOverallSuccessRate()}%`);
    this.setText('avg-completion-time', `${this.getAvgCompletionTime()} min`);
    this.setText('best-time', this.getBestTimeOfDay() || '--:--');
    
    this.updateProgressChart();
    this.updateHabitKPIs();
    this.updateAnalyticsMetrics();
    this.updateHabitHeatmap();
  }

  // ===== Streaks =====
  calculateOverallStreak() {
    if (!this.state.habits.length) return 0;
    
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    
    while (true) {
      const iso = this.getLocalISODate(cursor);
      const has = this.state.habits.some(h => h.completedDates.some(d => d.startsWith(iso)));
      if (!has) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    
    return streak;
  }
  
  calculateLongestStreak() {
    if (!this.state.habits.length) return 0;
    
    const dates = new Set();
    this.state.habits.forEach(h => h.completedDates.forEach(d => dates.add(d.slice(0, 10))));
    const sorted = [...dates].sort();
    
    if (!sorted.length) return 0;
    
    let longest = 1, current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const cur = new Date(sorted[i]);
      const diff = (cur - prev) / 86400000;
      
      if (diff === 1) { 
        current++; 
        longest = Math.max(longest, current); 
      } else if (diff > 1) { 
        current = 1; 
      }
    }
    
    return longest;
  }

  // ===== Helper Methods =====
  countEntriesLastDays(days) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    return this.state.habits.reduce((total, habit) => {
      return total + habit.completedDates.filter(d => new Date(d) >= start).length;
    }, 0);
  }
  
  countMinutesLastDays(days) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    return this.state.habits.reduce((total, habit) => {
      const completions = habit.completedDates.filter(d => new Date(d) >= start).length;
      return total + (completions * habit.duration);
    }, 0);
  }
  
  calculateMonthlyCompletion() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysSoFar = now.getDate();
    
    let totalPossible = 0;
    let totalCompleted = 0;
    
    this.state.habits.forEach(habit => {
      // Count how many days this habit should have been done this month
      const habitDays = this.getHabitDaysThisMonth(habit, startOfMonth, now);
      totalPossible += habitDays;
      
      // Count how many times it was actually completed this month
      const completedThisMonth = habit.completedDates.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= startOfMonth && date <= now;
      }).length;
      
      totalCompleted += completedThisMonth;
    });
    
    return totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  }
  
  getHabitDaysThisMonth(habit, startOfMonth, endDate) {
    let count = 0;
    const current = new Date(startOfMonth);
    
    while (current <= endDate) {
      if (this.isHabitScheduledForToday(habit, current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  // ===== Charts (destroy-safe) =====
  destroyChart(key) {
    if (this.charts[key]) {
      this.charts[key].destroy();
      delete this.charts[key];
    }
  }

  updateWeeklyChart(which = 'current') {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    
    const data = this.getWeeklyData(which);
    this.destroyChart('weekly');
    
    this.charts.weekly = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Completions',
          data: data.values,
          backgroundColor: 'var(--accent-primary)',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        }
      }
    });
  }
  
  getWeeklyData(which) {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const values = Array(7).fill(0);
    const now = new Date();
    const start = new Date(now);
    const shift = which === 'last' ? 7 : 0;
    
    start.setDate(start.getDate() - start.getDay() - shift);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = this.getLocalISODate(d);
      values[d.getDay()] = this.state.habits.filter(h => h.completedDates.some(x => x.startsWith(iso))).length;
    }
    
    return { labels, values };
  }

  updateConsistencyHeatmap() {
    const container = document.getElementById('consistency-heatmap');
    if (!container) return;
    
    container.innerHTML = '';
    const today = new Date();
    const days = 53 * 7;
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = this.getLocalISODate(d);
      const count = this.state.habits.filter(h => h.completedDates.some(x => x.startsWith(iso))).length;
      
      const cell = document.createElement('div');
      cell.className = 'heatmap-day';
      const intensity = Math.min(1, count / 3);
      cell.style.background = `rgba(34, 211, 238, ${intensity})`;
      cell.title = `${d.toDateString()}: ${count} completions`;
      container.appendChild(cell);
    }
  }

  updateWeeklyMinutesChart() {
    const ctx = document.getElementById('weeklyMinutesChart');
    if (!ctx) return;
    
    const data = this.getWeeklyMinutesData();
    this.destroyChart('weeklyMinutes');
    
    this.charts.weeklyMinutes = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
          label: 'Minutes',
          data: data.values,
          borderColor: 'var(--accent-primary)',
          backgroundColor: 'rgba(34, 211, 238, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: 'var(--accent-primary)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'var(--bg-secondary)',
            titleColor: 'var(--text-primary)',
            bodyColor: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: 'var(--text-secondary)' }
          },
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: 'var(--text-secondary)' }
          }
        }
      }
    });
  }
  
  getWeeklyMinutesData() {
    const values = Array(7).fill(0);
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const iso = this.getLocalISODate(date);
      
      const dayMinutes = this.state.habits.reduce((total, habit) => {
        const completed = habit.completedDates.some(d => d.startsWith(iso));
        return total + (completed ? habit.duration : 0);
      }, 0);
      
      values[i] = dayMinutes;
    }
    
    return { values };
  }

  updateTimeDistributionChart() {
    const ctx = document.getElementById('timeDistributionChart');
    if (!ctx) return;
    
    const dist = {};
    this.state.habits.forEach(h => { 
      dist[h.category] = (dist[h.category] || 0) + h.totalMinutes; 
    });
    
    const labels = Object.keys(dist);
    const values = Object.values(dist);
    
    this.destroyChart('timeDist');
    
    if (labels.length === 0) {
      const ctx = document.getElementById('timeDistributionChart');
      const ctx2d = ctx.getContext('2d');
      ctx2d.clearRect(0, 0, ctx.width, ctx.height);
      ctx2d.fillStyle = 'var(--text-secondary)';
      ctx2d.textAlign = 'center';
      ctx2d.fillText('No data available', ctx.width/2, ctx.height/2);
      return;
    }
    
    this.charts.timeDist = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map(() => this.getRandomColor()),
          borderWidth: 1,
          borderColor: 'var(--bg-primary)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });
    
    const leg = document.getElementById('time-distribution-legends');
    if (leg) {
      leg.innerHTML = '';
      labels.forEach((l, i) => {
        const div = document.createElement('div');
        div.className = 'distribution-legend';
        div.innerHTML = `<div class="legend-color" style="background:${this.charts.timeDist.data.datasets[0].backgroundColor[i]}"></div>
          <div class="legend-name">${l}</div><div class="legend-value">${values[i]} min</div>`;
        leg.appendChild(div);
      });
    }
  }

  // ===== Habit Categories Distribution =====
  updateCategoryDistribution() {
    const ctx = document.getElementById('categoryChart');
    const listEl = document.getElementById('category-list');
    
    if (!ctx || !listEl) return;
    
    // Count habits by category
    const categoryCounts = {};
    this.state.habits.forEach(habit => {
      categoryCounts[habit.category] = (categoryCounts[habit.category] || 0) + 1;
    });
    
    const categories = Object.keys(categoryCounts);
    const counts = Object.values(categoryCounts);
    
    // Destroy previous chart if exists
    this.destroyChart('category');
    
    // If no habits, show empty state
    if (categories.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>No habits yet</p></div>';
      return;
    }
    
    // Create colors for each category
    const categoryColors = {
      'health': '#22d3ee',
      'learning': '#a855f7',
      'work': '#58f29c',
      'personal': '#f59e0b',
      'other': '#ef4444'
    };
    
    const colors = categories.map(cat => categoryColors[cat] || this.getRandomColor());
    
    // Create pie chart
    this.charts.category = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: categories.map(cat => {
          const names = {
            'health': 'Health & Fitness',
            'learning': 'Learning',
            'work': 'Work',
            'personal': 'Personal',
            'other': 'Other'
          };
          return names[cat] || cat;
        }),
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: 'var(--bg-primary)',
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'var(--bg-secondary)',
            titleColor: 'var(--text-primary)',
            bodyColor: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} habits (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    
    // Update the category list
    listEl.innerHTML = '';
    categories.forEach((category, index) => {
      const displayName = {
        'health': 'Health & Fitness',
        'learning': 'Learning',
        'work': 'Work',
        'personal': 'Personal',
        'other': 'Other'
      }[category] || category;
      
      const percentage = Math.round((counts[index] / this.state.habits.length) * 100);
      
      const item = document.createElement('div');
      item.className = 'category-item';
      item.innerHTML = `
        <div class="category-color" style="background: ${colors[index]}"></div>
        <div class="category-name">${displayName}</div>
        <div class="category-count">${counts[index]} (${percentage}%)</div>
      `;
      listEl.appendChild(item);
    });
  }

  updateProgressChart() {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;
    
    const days = parseInt(this.state.analytics.timeRange, 10) || 30;
    const labels = [];
    const values = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = this.getLocalISODate(d);
      
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const v = this.state.habits.filter(h => h.completedDates.some(x => x.startsWith(iso))).length;
      values.push(v);
    }
    
    this.destroyChart('progress');
    
    this.charts.progress = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Completions',
          data: values,
          borderColor: 'var(--accent-secondary)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        }
      }
    });
  }

  updateHabitKPIs() {
    const c = document.getElementById('habit-kpis');
    if (!c) return;
    
    c.innerHTML = '';
    
    if (!this.state.habits.length) { 
      c.innerHTML = '<p class="muted">No habits yet</p>'; 
      return; 
    }
    
    this.state.habits.forEach(h => {
      const cons = this.getHabitConsistency(h);
      const card = document.createElement('div');
      card.className = 'kpi-card';
      card.innerHTML = `<div class="kpi-icon"><i class="fas fa-check"></i></div>
        <div class="kpi-content">
          <div class="kpi-title">${h.name}</div>
          <div class="kpi-value">${cons}%</div>
          <div class="kpi-trend">Streak: ${h.streak} • Completions: ${h.totalCompletions}</div>
        </div>`;
      c.appendChild(card);
    });
  }
  
  getHabitConsistency(h) {
    const created = new Date(h.createdAt);
    const days = Math.max(1, Math.ceil((Date.now() - created) / 86400000));
    return Math.min(100, Math.round((h.totalCompletions / days) * 100));
  }

  updateAnalyticsMetrics() {
    this.setText('current-streak-analytics', `${this.calculateOverallStreak()} days`);
    this.setText('success-rate', `${this.getOverallSuccessRate()}%`);
    this.setText('avg-completion-time', `${this.getAvgCompletionTime()} min`);
    this.setText('best-time', this.getBestTimeOfDay() || '--:--');
  }
  
  getOverallSuccessRate() {
    const total = this.state.habits.reduce((s, h) => s + h.totalCompletions, 0);
    const days = this.state.habits.reduce((s, h) => s + Math.max(1, Math.ceil((Date.now() - new Date(h.createdAt)) / 86400000)), 0);
    if (!days) return 0;
    return Math.min(100, Math.round((total / days) * 100));
  }
  
  getAvgCompletionTime() {
    const totalMinutes = this.state.habits.reduce((s, h) => s + h.totalMinutes, 0);
    const totalCompletions = this.state.habits.reduce((s, h) => s + h.totalCompletions, 0);
    return totalCompletions ? Math.round(totalMinutes / totalCompletions) : 0;
  }
  
  getBestTimeOfDay() {
    const hours = {};
    this.state.habits.forEach(h => h.completedDates.forEach(d => {
      const hh = new Date(d).getHours();
      hours[hh] = (hours[hh] || 0) + 1;
    }));
    
    const best = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;
    return `${String(best[0]).padStart(2, '0')}:00`;
  }

  updateHabitHeatmap() {
    const container = document.getElementById('habit-heatmap');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!this.state.habits.length) { 
      container.innerHTML = '<p class="muted">No data</p>'; 
      return; 
    }
    
    const days = 28;
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = this.getLocalISODate(d);
      const count = this.state.habits.filter(h => h.completedDates.some(x => x.startsWith(iso))).length;
      
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const intensity = Math.min(1, count / 3);
      cell.style.background = `rgba(34, 211, 238, ${intensity})`;
      cell.title = `${d.toDateString()}: ${count} completions`;
      container.appendChild(cell);
    }
  }

  // ===== Settings / Reminders =====
  renderSettings() { 
    this.updateReminderStatus(); 
  }
  
  updateReminderStatus() {
    const on = !!this.state.settings.reminders;
    const next = on ? this.calculateNextReminderText() : 'Off';
    this.setText('reminder-status', `🔔 Reminders: ${on ? 'On' : 'Off'}`);
    this.setText('reminder-next-settings', next);
  }
  
  calculateNextReminderText() {
    const t = this.state.settings.reminderTime || '09:00';
    const [h, m] = t.split(':').map(Number);
    const now = new Date();
    const nxt = new Date();
    
    nxt.setHours(h, m, 0, 0);
    if (nxt < now) nxt.setDate(nxt.getDate() + 1);
    
    return nxt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  scheduleReminders() {
    if (this.reminderTimeout) clearTimeout(this.reminderTimeout);
    if (!this.state.settings.reminders || !this.state.settings.reminderTime) return;
    
    const [h, m] = this.state.settings.reminderTime.split(':').map(Number);
    const now = new Date();
    const tgt = new Date();
    
    tgt.setHours(h, m, 0, 0);
    if (tgt < now) tgt.setDate(tgt.getDate() + 1);
    
    const diff = tgt - now;
    this.reminderTimeout = setTimeout(() => { 
      this.sendReminder(); 
      this.scheduleReminders(); 
    }, diff);
  }
  
  sendReminder() {
    const msg = 'Time to work on your habits!';
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Habit Tracker Reminder', { body: msg });
    } else {
      console.log(`🔔 Habit Reminder: ${msg}`);
    }
  }

  // ===== Analytics helpers =====
  setTimeRange(range) {
    document.querySelectorAll('.time-range-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.range === range);
    });
    this.currentTimeRange = range;
  }

  // ===== Modals and Data Import/Export =====
  showImportModal() { 
    document.getElementById('import-modal')?.classList.add('active'); 
  }
  
  closeAllModals() { 
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); 
  }
  
  showResetConfirmation() {
    this.showConfirmation('Reset Data', 'This will delete all your habits and statistics. Continue?', () => this.resetData());
  }
  
  showConfirmation(title, msg, onConfirm) {
    this.setText('confirmation-title', title);
    this.setText('confirmation-message', msg);
    document.getElementById('confirmation-modal')?.classList.add('active');
    this.pendingConfirm = onConfirm;
  }
  
  confirmAction() { 
    if (this.pendingConfirm) this.pendingConfirm(); 
    this.pendingConfirm = null; 
    this.closeAllModals(); 
  }
  
  resetData() {
    localStorage.removeItem('habitTracker_habits');
    localStorage.removeItem('habitTracker_settings');
    this.state.habits = [];
    this.state.settings = { ...this.state.settings, reminders: false };
    this.renderAll();
    this.showToast('All data has been reset!', 'info');
  }
  
  exportData(type = 'json') {
    if (type === 'json') {
      const data = { 
        habits: this.state.habits, 
        settings: this.state.settings, 
        exportedAt: new Date().toISOString() 
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = `habit-tracker-export-${this.getLocalISODate()}.json`; 
      document.body.appendChild(a); 
      a.click(); 
      a.remove(); 
      URL.revokeObjectURL(url);
    } else if (type === 'csv') {
      const rows = ['id,name,category,frequency,startTime,endTime,duration,totalCompletions,totalMinutes,streak'];
      this.state.habits.forEach(h => {
        rows.push(`${h.id},"${h.name}",${h.category},${h.frequency},${h.startTime},${h.endTime},${h.duration},${h.totalCompletions},${h.totalMinutes},${h.streak}`);
      });
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = `habit-tracker-export-${this.getLocalISODate()}.csv`; 
      document.body.appendChild(a); 
      a.click(); 
      a.remove(); 
      URL.revokeObjectURL(url);
    }
  }
  
  handleFileImport(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.habits && Array.isArray(data.habits)) this.state.habits = data.habits;
        if (data.settings) this.state.settings = { ...this.state.settings, ...data.settings };
        this.saveData();
        this.renderAll();
        this.showToast('Data imported successfully!', 'success');
      } catch (err) {
        this.showToast('Error importing data: Invalid file format', 'error');
        console.error(err);
      }
      this.closeAllModals();
    };
    reader.readAsText(file);
  }

  // ===== Misc =====
  getLocalISODate(d = new Date()) {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  }
  
  updateCurrentDate() {
    const el = document.getElementById('current-date');
    if (el) el.textContent = new Date().toDateString();
  }
  
  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  
  setWidth(id, val) {
    const el = document.getElementById(id);
    if (el) el.style.width = val;
  }
  
  showToast(msg, type = 'info') { 
    console.log(`[${type}] ${msg}`);
    // Optional: Implement a visible toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
  
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

// Instantiate
new HabitTracker();