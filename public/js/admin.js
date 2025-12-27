// Admin JavaScript for set form interactions

let draggedElement = null;
let exerciseCounter = 0;

// Add new exercise
function addExercise() {
  const exercisesList = document.getElementById('exercisesList');
  const exerciseCount = exercisesList.querySelectorAll('.exercise-item').length;

  const exerciseHTML = `
    <div class="exercise-item" data-position="${exerciseCount}">
      <div class="exercise-header">
        <span class="drag-handle">☰</span>
        <span class="exercise-number">Exercise ${exerciseCount + 1}</span>
        <button type="button" class="btn btn-small btn-danger" onclick="removeExercise(this)">Remove</button>
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
        <input type="file" name="exerciseImage" accept="image/*" onchange="handleImageUpload(this)">
      </div>
    </div>
  `;

  exercisesList.insertAdjacentHTML('beforeend', exerciseHTML);
  updateExerciseNumbers();
  initializeDragAndDrop();
}

// Remove exercise
function removeExercise(button) {
  const exerciseItem = button.closest('.exercise-item');
  exerciseItem.remove();
  updateExerciseNumbers();
}

// Update exercise numbers after add/remove/reorder
function updateExerciseNumbers() {
  const exercises = document.querySelectorAll('.exercise-item');
  exercises.forEach((exercise, index) => {
    exercise.dataset.position = index;
    const numberSpan = exercise.querySelector('.exercise-number');
    if (numberSpan) {
      numberSpan.textContent = `Exercise ${index + 1}`;
    }
  });
}

// Handle image upload
async function handleImageUpload(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const exerciseItem = input.closest('.exercise-item');
  const imageSlugInput = exerciseItem.querySelector('input[name="exerciseImageSlug"]');

  // Ensure imageSlug is filled
  if (!imageSlugInput.value) {
    const nameInput = exerciseItem.querySelector('input[name="exerciseName"]');
    if (nameInput.value) {
      imageSlugInput.value = nameInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    } else {
      alert('Please enter an exercise name first');
      input.value = '';
      return;
    }
  }

  const imageSlug = imageSlugInput.value;

  // Validate imageSlug
  if (!/^[a-z0-9-_]+$/i.test(imageSlug)) {
    alert('Invalid image slug. Use only letters, numbers, hyphens, and underscores.');
    return;
  }

  // Create form data
  const formData = new FormData();
  formData.append('image', file);
  formData.append('imageSlug', imageSlug);

  try {
    // Show uploading state
    const originalText = input.previousElementSibling ? input.previousElementSibling.textContent : '';
    if (input.previousElementSibling) {
      input.previousElementSibling.textContent = 'Uploading...';
    }

    const response = await fetch('/admin/exercises/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();

    // Show preview
    let preview = exerciseItem.querySelector('.image-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'image-preview';
      input.parentNode.appendChild(preview);
    }

    preview.innerHTML = `<img src="${data.path}" alt="Exercise image">`;

    // Reset label
    if (input.previousElementSibling) {
      input.previousElementSibling.textContent = originalText;
    }

    alert('Image uploaded successfully!');
  } catch (error) {
    alert('Error uploading image: ' + error.message);
    input.value = '';
  }
}

// Initialize drag and drop
function initializeDragAndDrop() {
  const exerciseItems = document.querySelectorAll('.exercise-item');

  exerciseItems.forEach((item) => {
    const handle = item.querySelector('.drag-handle');

    handle.addEventListener('dragstart', (e) => {
      draggedElement = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    handle.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedElement = null;
      updateExerciseNumbers();
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(item.parentElement, e.clientY);
      if (afterElement == null) {
        item.parentElement.appendChild(draggedElement);
      } else {
        item.parentElement.insertBefore(draggedElement, afterElement);
      }
    });

    // Make handle draggable
    handle.setAttribute('draggable', 'true');
  });
}

// Get element after which to insert dragged element
function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll('.exercise-item:not(.dragging)'),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}

// Form submission
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('setForm');
  if (!form) return;

  // Initialize drag and drop if exercises exist
  initializeDragAndDrop();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect form data
    const formData = {
      name: document.getElementById('name').value,
      slug: document.getElementById('slug').value,
      exercises: [],
    };

    // Collect exercises
    const exerciseItems = document.querySelectorAll('.exercise-item');
    exerciseItems.forEach((item, index) => {
      const exercise = {
        name: item.querySelector('input[name="exerciseName"]').value,
        duration: parseInt(
          item.querySelector('input[name="exerciseDuration"]').value,
        ),
        imageSlug:
          item.querySelector('input[name="exerciseImageSlug"]').value || '',
        description: item.querySelector('textarea[name="exerciseDescription"]')
          .value,
        position: index,
      };

      formData.exercises.push(exercise);
    });

    // Validate
    if (formData.exercises.length === 0) {
      alert('Please add at least one exercise');
      return;
    }

    try {
      // Determine if creating or updating
      const isEdit = typeof window.editingSetId !== 'undefined';
      const url = isEdit
        ? `/admin/sets/${window.editingSetId}`
        : '/admin/sets';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save set');
      }

      const result = await response.json();
      alert(result.message || 'Set saved successfully!');

      // Redirect to dashboard
      window.location.href = '/admin';
    } catch (error) {
      alert('Error saving set: ' + error.message);
    }
  });
});
