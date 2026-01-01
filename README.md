# Habit Tracker

A simple web app built with **HTML, CSS, and JavaScript** to help track daily habits.  
Users can add habits, mark them as complete, and visualize progress over time.

## Features
- ✨ Add and remove habits
- ✅ Track daily completion
- 🔥 Display streaks and progress
- 📊 View overall statistics
- 💾 Data persistence using Local Storage
- 📱 Responsive design for desktop and mobile

## Getting Started

### Clone the Repository
```bash
git clone https://github.com/HABTAMUTESHAGER/HabitTracker.git
cd HabitTracker
```

### Run the Application
Simply open `index.html` in your web browser:
```bash
open index.html
```

Or use a local development server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (with http-server installed)
npx http-server
```

Then navigate to `http://localhost:8000` in your browser.

## How to Use

1. **Add a Habit**: Enter a habit name in the input field and click "Add Habit"
2. **Complete a Habit**: Click the "Complete" button to mark it as done for today
3. **Track Progress**: View your current streak, longest streak, and total completions
4. **Remove a Habit**: Click the "Delete" button to remove a habit
5. **View Statistics**: Check your overall progress in the statistics section

## Technologies Used
- **HTML5**: Structure and semantic markup
- **CSS3**: Styling with modern features (Grid, Flexbox, Gradients)
- **JavaScript (ES6+)**: Application logic and DOM manipulation
- **Local Storage API**: Data persistence

## Project Structure
```
HabitTracker/
├── index.html      # Main HTML structure
├── styles.css      # CSS styling and responsive design
├── app.js          # JavaScript application logic
└── README.md       # Project documentation
```

## Features in Detail

### Habit Management
- Add unlimited habits with custom names
- Delete habits with confirmation prompt
- Persistent storage across browser sessions

### Progress Tracking
- Mark habits as complete/incomplete for each day
- Automatic streak calculation (consecutive days)
- Track longest streak achieved
- Total completion count for each habit

### Statistics Dashboard
- Total number of habits
- Habits completed today
- Overall longest streak across all habits

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interface

## Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Opera

Requires modern browser with Local Storage support.

## License
This project is open source and available under the MIT License.

## Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.
