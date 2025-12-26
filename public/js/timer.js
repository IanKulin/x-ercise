document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) return;

    const exerciseList = document.getElementById('exercise-list');
    const timerView = document.getElementById('timer-view');
    const completionView = document.getElementById('completion-view');
    const currentExerciseName = document.getElementById('current-exercise-name');
    const timerDisplay = document.getElementById('timer');

    let currentExerciseIndex = 0;
    let timerInterval;

    startBtn.addEventListener('click', () => {
        exerciseList.style.display = 'none';
        timerView.style.display = 'block';
        startNextExercise();
    });

    function startNextExercise() {
        if (currentExerciseIndex >= exerciseSet.exercises.length) {
            completeSet();
            return;
        }

        const exercise = exerciseSet.exercises[currentExerciseIndex];
        currentExerciseName.textContent = exercise.name;
        let timeLeft = exercise.duration;

        timerDisplay.textContent = timeLeft;

        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                currentExerciseIndex++;
                startNextExercise();
            }
        }, 1000);
    }

    function completeSet() {
        timerView.style.display = 'none';
        completionView.style.display = 'block';

        // POST to the completions endpoint (Phase 5)
        fetch('/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ set_slug: exerciseSet.slug }),
        })
        .then(response => {
            if (!response.ok) {
                console.error('Failed to record completion');
            }
        })
        .catch(error => {
            console.error('Error recording completion:', error);
        });
    }
});
