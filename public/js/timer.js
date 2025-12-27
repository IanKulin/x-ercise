document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-btn");
  if (!startBtn) return;

  const exerciseList = document.getElementById("exercise-list");
  const timerView = document.getElementById("timer-view");
  const confirmationView = document.getElementById("confirmation-view");
  const completionView = document.getElementById("completion-view");
  const cancellationView = document.getElementById("cancellation-view");
  const confirmYesBtn = document.getElementById("confirm-yes-btn");
  const confirmNoBtn = document.getElementById("confirm-no-btn");
  const currentExerciseName = document.getElementById("current-exercise-name");
  const currentExerciseDescription = document.getElementById(
    "current-exercise-description",
  );
  const timerDisplay = document.getElementById("timer");
  const pauseBtn = document.getElementById("pause-btn");
  const exerciseImageContainer = document.getElementById(
    "exercise-image-container",
  );
  const exerciseImage = document.getElementById("exercise-image");
  let audioCtx;

  let currentExerciseIndex = 0;
  let timerInterval;
  let isPaused = false;
  let timeLeft;

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

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration / 1000);
  }
  // --- End Web Audio API Setup ---

  // --- Image Loading ---
  const imageCache = new Map();
  const supportedFormats = ["webp", "jpg", "png", "gif"];

  function loadExerciseImage(slug) {
    if (!slug) return Promise.resolve(null);
    if (imageCache.has(slug)) return Promise.resolve(imageCache.get(slug));

    return new Promise((resolve) => {
      let formatIndex = 0;
      function tryNextFormat() {
        if (formatIndex >= supportedFormats.length) {
          imageCache.set(slug, null);
          resolve(null);
          return;
        }
        const format = supportedFormats[formatIndex];
        const imagePath = `/images/exercises/${slug}.${format}`;
        const img = new Image();
        img.onload = () => {
          imageCache.set(slug, imagePath);
          resolve(imagePath);
        };
        img.onerror = () => {
          formatIndex++;
          tryNextFormat();
        };
        img.src = imagePath;
      }
      tryNextFormat();
    });
  }

  function preloadExerciseImages() {
    exerciseSet.exercises.forEach((exercise) => {
      if (exercise.imageSlug) loadExerciseImage(exercise.imageSlug);
    });
  }

  // Preload images when page loads
  preloadExerciseImages();
  // --- End Image Loading ---

  startBtn.addEventListener("click", () => {
    initAudio(); // Initialize audio on user interaction
    exerciseList.style.display = "none";
    timerView.style.display = "block";
    startNextExercise();
  });

  pauseBtn.addEventListener("click", () => {
    togglePause();
  });

  function startNextExercise() {
    if (currentExerciseIndex >= exerciseSet.exercises.length) {
      completeSet();
      return;
    }

    const exercise = exerciseSet.exercises[currentExerciseIndex];
    currentExerciseName.textContent = exercise.name;
    currentExerciseDescription.textContent = exercise.description;
    timeLeft = exercise.duration;

    timerDisplay.textContent = timeLeft;

    // Handle exercise image
    if (exercise.imageSlug) {
      loadExerciseImage(exercise.imageSlug).then((imagePath) => {
        if (imagePath) {
          exerciseImage.src = imagePath;
          exerciseImageContainer.style.display = "block";
        } else {
          exerciseImageContainer.style.display = "none";
        }
      });
    } else {
      exerciseImageContainer.style.display = "none";
    }

    startTimer();
  }

  function startTimer() {
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

  function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
      pauseTimer();
      pauseBtn.textContent = "Resume";
    } else {
      startTimer();
      pauseBtn.textContent = "Pause";
    }
  }

  function pauseTimer() {
    clearInterval(timerInterval);
  }

  function completeSet() {
    timerView.style.display = "none";
    confirmationView.style.display = "block";
  }

  function recordCompletion() {
    const USERNAME_KEY = "x-ercise-username";
    function getUserName() {
      return localStorage.getItem(USERNAME_KEY);
    }
    const username = getUserName();

    // POST to the completions endpoint
    fetch("/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        set_slug: exerciseSet.slug,
        username: username,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          console.error("Failed to record completion");
        }
      })
      .catch((error) => {
        console.error("Error recording completion:", error);
      });
  }

  confirmYesBtn.addEventListener("click", () => {
    recordCompletion();
    confirmationView.style.display = "none";
    completionView.style.display = "block";
  });

  confirmNoBtn.addEventListener("click", () => {
    confirmationView.style.display = "none";
    cancellationView.style.display = "block";
  });
});
