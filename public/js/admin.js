// Admin JavaScript for set form interactions

let exerciseCounter = 0;

// Add new exercise
function addExercise() {
  const exercisesList = document.getElementById("exercisesList");
  const exerciseCount = exercisesList.querySelectorAll(".exercise-item").length;

  const exerciseHTML = `
    <div class="exercise-item" data-position="${exerciseCount}">
      <div class="exercise-header">
        <div class="reorder-buttons">
          <button type="button" class="move-up" title="Move up">↑</button>
          <button type="button" class="move-down" title="Move down">↓</button>
        </div>
        <span class="exercise-number">Exercise ${exerciseCount + 1}</span>
        <button type="button" class="btn btn-small btn-danger remove-exercise-btn">Remove</button>
      </div>

      <div class="form-group">
        <label>Exercise Name *</label>
        <input type="text" name="exerciseName" required placeholder="e.g., Jumping Jacks">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Duration (seconds) *</label>
          <input type="number" name="exerciseDuration" required min="1" max="3600" value="60">
        </div>

        <div class="form-group">
          <label>Image Slug</label>
          <input type="text" name="exerciseImageSlug" pattern="[a-z0-9-_]+" placeholder="e.g., jumping-jacks">
        </div>
      </div>

      <div class="form-group">
        <label>Description *</label>
        <textarea name="exerciseDescription" required rows="2" placeholder="Describe how to perform this exercise"></textarea>
      </div>

      <div class="form-group">
        <label>Image Upload</label>
        <input type="file" name="exerciseImage" accept="image/*" class="exercise-image-upload">
      </div>
    </div>
  `;

  exercisesList.insertAdjacentHTML("beforeend", exerciseHTML);
  updateExerciseNumbers();
  updateButtonStates();
}

// Remove exercise (called via event delegation)
function removeExercise(button) {
  const exerciseItem = button.closest(".exercise-item");
  exerciseItem.remove();
  updateExerciseNumbers();
  updateButtonStates();
}

// Update exercise numbers after add/remove/reorder
function updateExerciseNumbers() {
  const exercises = document.querySelectorAll(".exercise-item");
  exercises.forEach((exercise, index) => {
    exercise.dataset.position = index;
    const numberSpan = exercise.querySelector(".exercise-number");
    if (numberSpan) {
      numberSpan.textContent = `Exercise ${index + 1}`;
    }
  });
}

// Handle image upload
async function handleImageUpload(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const exerciseItem = input.closest(".exercise-item");
  const imageSlugInput = exerciseItem.querySelector(
    'input[name="exerciseImageSlug"]',
  );

  // Ensure imageSlug is filled
  if (!imageSlugInput.value) {
    const nameInput = exerciseItem.querySelector('input[name="exerciseName"]');
    if (nameInput.value) {
      imageSlugInput.value = nameInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    } else {
      alert("Please enter an exercise name first");
      input.value = "";
      return;
    }
  }

  const imageSlug = imageSlugInput.value;

  // Validate imageSlug
  if (!/^[a-z0-9-_]+$/i.test(imageSlug)) {
    alert(
      "Invalid image slug. Use only letters, numbers, hyphens, and underscores.",
    );
    return;
  }

  // Create form data
  const formData = new FormData();
  formData.append("image", file);
  formData.append("imageSlug", imageSlug);

  try {
    // Show uploading state
    const originalText = input.previousElementSibling
      ? input.previousElementSibling.textContent
      : "";
    if (input.previousElementSibling) {
      input.previousElementSibling.textContent = "Uploading...";
    }

    const response = await fetch("/admin/exercises/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const data = await response.json();

    // Show preview
    let preview = exerciseItem.querySelector(".image-preview");
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "image-preview";
      input.parentNode.appendChild(preview);
    }

    preview.innerHTML = `<img src="${data.path}" alt="Exercise image">`;

    // Reset label
    if (input.previousElementSibling) {
      input.previousElementSibling.textContent = originalText;
    }

    alert("Image uploaded successfully!");
  } catch (error) {
    alert("Error uploading image: " + error.message);
    input.value = "";
  }
}

// Handle image loading errors with fallback formats
function handleImageError(img) {
  const imageSlug = img.dataset.imageSlug;
  if (!imageSlug) return;

  const supportedFormats = ["jpg", "png", "webp", "gif"];
  const currentSrc = img.src;
  const currentExt = currentSrc.split(".").pop().split("?")[0];
  const currentIndex = supportedFormats.indexOf(currentExt);

  if (currentIndex < supportedFormats.length - 1) {
    // Try next format
    const nextFormat = supportedFormats[currentIndex + 1];
    img.src = `/images/${imageSlug}.${nextFormat}`;
  } else {
    // All formats failed, hide the image
    img.style.display = "none";
  }
}

// Initialize reorder buttons
function initializeReorderButtons() {
  const exercisesList = document.getElementById("exercisesList");

  exercisesList.addEventListener("click", (e) => {
    if (e.target.classList.contains("move-up")) {
      const exerciseItem = e.target.closest(".exercise-item");
      const previousItem = exerciseItem.previousElementSibling;
      if (previousItem) {
        exercisesList.insertBefore(exerciseItem, previousItem);
        updateExerciseNumbers();
        updateButtonStates();
      }
    }

    if (e.target.classList.contains("move-down")) {
      const exerciseItem = e.target.closest(".exercise-item");
      const nextItem = exerciseItem.nextElementSibling;
      if (nextItem) {
        exercisesList.insertBefore(nextItem, exerciseItem);
        updateExerciseNumbers();
        updateButtonStates();
      }
    }
  });
}

// Update button states based on position
function updateButtonStates() {
  const exercises = document.querySelectorAll(".exercise-item");
  exercises.forEach((exercise, index) => {
    const upButton = exercise.querySelector(".move-up");
    const downButton = exercise.querySelector(".move-down");

    // Disable up button for first exercise
    upButton.disabled = index === 0;

    // Disable down button for last exercise
    downButton.disabled = index === exercises.length - 1;
  });
}

// Form submission and event delegation
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("setForm");
  if (!form) return;

  // Initialize reorder buttons
  initializeReorderButtons();
  updateButtonStates();

  // Add Exercise button
  const addExerciseBtn = document.getElementById("addExerciseBtn");
  if (addExerciseBtn) {
    addExerciseBtn.addEventListener("click", addExercise);
  }

  // Event delegation for Remove Exercise buttons
  document.addEventListener("click", (e) => {
    if (e.target.closest(".remove-exercise-btn")) {
      removeExercise(e.target.closest(".remove-exercise-btn"));
    }
  });

  // Event delegation for image uploads
  document.addEventListener("change", (e) => {
    if (e.target.matches(".exercise-image-upload")) {
      handleImageUpload(e.target);
    }
  });

  // Event delegation for image error handling
  document.addEventListener(
    "error",
    (e) => {
      if (e.target.matches(".exercise-preview-image")) {
        handleImageError(e.target);
      }
    },
    true,
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect form data
    const formData = {
      name: document.getElementById("name").value,
      slug: document.getElementById("slug").value,
      exercises: [],
    };

    // Collect exercises
    const exerciseItems = document.querySelectorAll(".exercise-item");
    exerciseItems.forEach((item, index) => {
      const exercise = {
        name: item.querySelector('input[name="exerciseName"]').value,
        duration: parseInt(
          item.querySelector('input[name="exerciseDuration"]').value,
        ),
        imageSlug:
          item.querySelector('input[name="exerciseImageSlug"]').value || "",
        description: item.querySelector('textarea[name="exerciseDescription"]')
          .value,
        position: index,
      };

      formData.exercises.push(exercise);
    });

    // Validate
    if (formData.exercises.length === 0) {
      alert("Please add at least one exercise");
      return;
    }

    try {
      // Determine if creating or updating
      const isEdit = typeof window.editingSetId !== "undefined";
      const url = isEdit ? `/admin/sets/${window.editingSetId}` : "/admin/sets";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save set");
      }

      const result = await response.json();
      alert(result.message || "Set saved successfully!");

      // Redirect to dashboard
      window.location.href = "/admin";
    } catch (error) {
      alert("Error saving set: " + error.message);
    }
  });
});
