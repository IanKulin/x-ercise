document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) return;

    const exerciseList = document.getElementById('exercise-list');
    const timerView = document.getElementById('timer-view');
    const completionView = document.getElementById('completion-view');
    const currentExerciseName = document.getElementById('current-exercise-name');
    const currentExerciseDescription = document.getElementById('current-exercise-description');
    const timerDisplay = document.getElementById('timer');
    let audioCtx;

    let currentExerciseIndex = 0;
    let timerInterval;

    // --- Web Audio API Setup ---
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function beep(frequency = 440, duration = 100, volume = 0.5) {
        if (!audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration / 1000);
    }
    // --- End Web Audio API Setup ---

    startBtn.addEventListener('click', () => {
        initAudio(); // Initialize audio on user interaction
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
        currentExerciseDescription.textContent = exercise.description;
        let timeLeft = exercise.duration;

        timerDisplay.textContent = timeLeft;

        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;

            if (timeLeft > 0 && timeLeft <= 5) {
                beep(880, 100); // Higher pitch beep for countdown
            }

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                currentExerciseIndex++;
                beep(1200, 200); // Final beep
                setTimeout(startNextExercise, 500); // Short delay before next exercise
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
