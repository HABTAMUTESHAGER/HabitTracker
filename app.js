// Habit Tracker Application
class HabitTracker {
    constructor() {
        this.habits = this.loadHabits();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
        this.updateStats();
    }

    setupEventListeners() {
        const form = document.getElementById('add-habit-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addHabit();
        });
    }

    addHabit() {
        const input = document.getElementById('habit-name-input');
        const habitName = input.value.trim();

        if (!habitName) return;

        const habit = {
            id: Date.now(),
            name: habitName,
            createdDate: new Date().toISOString(),
            completions: [],
            currentStreak: 0,
            longestStreak: 0
        };

        this.habits.push(habit);
        this.saveHabits();
        this.render();
        this.updateStats();
        
        input.value = '';
        input.focus();
    }

    deleteHabit(id) {
        if (confirm('Are you sure you want to delete this habit?')) {
            this.habits = this.habits.filter(habit => habit.id !== id);
            this.saveHabits();
            this.render();
            this.updateStats();
        }
    }

    toggleCompletion(id) {
        const habit = this.habits.find(h => h.id === id);
        if (!habit) return;

        const today = this.getTodayString();
        const completionIndex = habit.completions.indexOf(today);

        if (completionIndex === -1) {
            // Mark as complete
            habit.completions.push(today);
        } else {
            // Mark as incomplete
            habit.completions.splice(completionIndex, 1);
        }

        this.updateStreaks(habit);
        this.saveHabits();
        this.render();
        this.updateStats();
    }

    updateStreaks(habit) {
        if (habit.completions.length === 0) {
            habit.currentStreak = 0;
            return;
        }

        // Sort completions by date
        const sortedCompletions = habit.completions
            .map(d => new Date(d))
            .sort((a, b) => b - a);

        // Calculate current streak
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < sortedCompletions.length; i++) {
            const completionDate = new Date(sortedCompletions[i]);
            completionDate.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === i) {
                currentStreak++;
            } else {
                break;
            }
        }

        habit.currentStreak = currentStreak;

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 1;

        for (let i = 0; i < sortedCompletions.length - 1; i++) {
            const current = new Date(sortedCompletions[i]);
            const next = new Date(sortedCompletions[i + 1]);
            current.setHours(0, 0, 0, 0);
            next.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor((current - next) / (1000 * 60 * 60 * 24));

            if (daysDiff === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
        habit.longestStreak = longestStreak;
    }

    isCompletedToday(habit) {
        const today = this.getTodayString();
        return habit.completions.includes(today);
    }

    getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    render() {
        const container = document.getElementById('habits-container');

        if (this.habits.length === 0) {
            container.innerHTML = '<p class="empty-state">No habits yet. Add your first habit above! 🚀</p>';
            return;
        }

        container.innerHTML = this.habits.map(habit => {
            const isCompleted = this.isCompletedToday(habit);
            const completedClass = isCompleted ? 'completed' : '';

            return `
                <div class="habit-card ${completedClass}" data-habit-id="${habit.id}">
                    <div class="habit-info">
                        <div class="habit-name">${this.escapeHtml(habit.name)}</div>
                        <div class="habit-stats">
                            <div class="habit-stat">
                                <span>🔥</span>
                                <span>Current Streak: ${habit.currentStreak} days</span>
                            </div>
                            <div class="habit-stat">
                                <span>🏆</span>
                                <span>Best: ${habit.longestStreak} days</span>
                            </div>
                            <div class="habit-stat">
                                <span>✅</span>
                                <span>Total: ${habit.completions.length} times</span>
                            </div>
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button 
                            class="btn-complete ${completedClass}" 
                            data-action="toggle"
                        >
                            ${isCompleted ? 'Undo' : 'Complete'}
                        </button>
                        <button 
                            class="btn-delete" 
                            data-action="delete"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event delegation for habit actions
        this.attachHabitEventListeners();
    }

    attachHabitEventListeners() {
        const container = document.getElementById('habits-container');
        
        // Remove old listener if exists
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);
        
        // Add new listener with event delegation
        newContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const habitCard = button.closest('.habit-card');
            if (!habitCard) return;

            const habitId = parseInt(habitCard.dataset.habitId);
            const action = button.dataset.action;

            if (action === 'toggle') {
                this.toggleCompletion(habitId);
            } else if (action === 'delete') {
                this.deleteHabit(habitId);
            }
        });
    }

    updateStats() {
        const totalHabits = this.habits.length;
        const completedToday = this.habits.filter(h => this.isCompletedToday(h)).length;
        const longestStreak = this.habits.length > 0 
            ? this.habits.reduce((max, h) => Math.max(max, h.longestStreak), 0)
            : 0;

        document.getElementById('total-habits').textContent = totalHabits;
        document.getElementById('completed-today').textContent = completedToday;
        document.getElementById('longest-streak').textContent = longestStreak;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveHabits() {
        localStorage.setItem('habitTrackerData', JSON.stringify(this.habits));
    }

    loadHabits() {
        try {
            const data = localStorage.getItem('habitTrackerData');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load habits from localStorage:', error);
            return [];
        }
    }
}

// Initialize the app
const tracker = new HabitTracker();
