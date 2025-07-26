// Global variables

let uploadedImages = [];
let currentImageIndex = 0;

// DOM elements
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const uploadProgress = document.getElementById("uploadProgress");
const progressBar = document.getElementById("progressBar");
const carousel = document.getElementById("carousel");
const carouselContainer = document.getElementById("carouselContainer");
const gridContainer = document.getElementById("gridContainer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  updateCarouselButtons();
});

// Setup event listeners
function setupEventListeners() {
  // File input change event
  fileInput.addEventListener("change", handleFileSelect);

  // Drag and drop events
  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleDrop);

  // Prevent default drag behaviors on document
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
}

// Handle file selection
function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    processFiles(files);
  }
}

// Handle drag over
function handleDragOver(event) {
  event.preventDefault();
  uploadArea.classList.add("dragover");
}

// Handle drag leave
function handleDragLeave(event) {
  event.preventDefault();
  uploadArea.classList.remove("dragover");
}

// Handle drop
function handleDrop(event) {
  event.preventDefault();
  uploadArea.classList.remove("dragover");

  const files = Array.from(event.dataTransfer.files);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (imageFiles.length > 0) {
    processFiles(imageFiles);
  } else {
    alert("Only image files, please!");
  }
}

// Process selected files
function processFiles(files) {
  showProgress();

  let processedCount = 0;
  const totalFiles = files.length;

  files.forEach((file, index) => {
    // Simulate upload progress
    setTimeout(() => {
      processFile(file);
      processedCount++;

      const progress = (processedCount / totalFiles) * 100;
      updateProgress(progress);

      if (processedCount === totalFiles) {
        setTimeout(hideProgress, 500);
      }
    }, index * 200);
  });
}

// Process individual file
function processFile(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    const imageData = {
      id: Date.now() + Math.random(),
      src: e.target.result,
      name: file.name,
      size: file.size,
      type: file.type,
    };

    addImageToCollection(imageData);
  };

  reader.readAsDataURL(file);
}

// Add image to collection
function addImageToCollection(imageData) {
  uploadedImages.push(imageData);
  addImageToGrid(imageData);
  updateCarousel();
  updateCarouselButtons();
}

// Add image to grid
function addImageToGrid(imageData) {
  const imageItem = document.createElement("div");
  imageItem.className = "image-item new";
  imageItem.innerHTML = `
        <img src="${imageData.src}" alt="${
    imageData.name
  }" onclick="showInCarousel(${uploadedImages.length - 1})">
        <button class="delete-btn" onclick="deleteImage('${
          imageData.id
        }')" title="Sil">×</button>
    `;

  gridContainer.appendChild(imageItem);

  setTimeout(() => {
    imageItem.classList.remove("new");
  }, 500);
}

// Update carousel
function updateCarousel() {
  if (uploadedImages.length === 0) {
    carousel.innerHTML = `
            <div class="no-images">
                <p>No image yet.</p>
            </div>
        `;
    return;
  }

  const currentImage = uploadedImages[currentImageIndex];
  carousel.innerHTML = `
        <img src="${currentImage.src}" alt="${currentImage.name}">
    `;
}

// Show specific image in carousel
function showInCarousel(index) {
  if (index >= 0 && index < uploadedImages.length) {
    currentImageIndex = index;
    updateCarousel();
    updateCarouselButtons();
  }
}

// Navigate to previous image
function previousImage() {
  if (uploadedImages.length === 0) return;

  currentImageIndex =
    currentImageIndex > 0 ? currentImageIndex - 1 : uploadedImages.length - 1;
  updateCarousel();
}

// Navigate to next image
function nextImage() {
  if (uploadedImages.length === 0) return;

  currentImageIndex =
    currentImageIndex < uploadedImages.length - 1 ? currentImageIndex + 1 : 0;
  updateCarousel();
}

// Update carousel navigation buttons
function updateCarouselButtons() {
  if (uploadedImages.length <= 1) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  } else {
    prevBtn.style.display = "block";
    nextBtn.style.display = "block";
  }
}

// Delete image
function deleteImage(imageId) {
  const imageIndex = uploadedImages.findIndex((img) => img.id === imageId);

  if (imageIndex !== -1) {
    // Remove from array
    uploadedImages.splice(imageIndex, 1);

    // Update current index if necessary
    if (currentImageIndex >= uploadedImages.length) {
      currentImageIndex = Math.max(0, uploadedImages.length - 1);
    }

    // Rebuild grid
    rebuildGrid();

    // Update carousel
    updateCarousel();
    updateCarouselButtons();
  }
}

// Rebuild grid
function rebuildGrid() {
  gridContainer.innerHTML = "";

  uploadedImages.forEach((imageData, index) => {
    addImageToGridAtIndex(imageData, index);
  });
}

// Add image to grid at specific index
function addImageToGridAtIndex(imageData, index) {
  const imageItem = document.createElement("div");
  imageItem.className = "image-item";
  imageItem.innerHTML = `
        <img src="${imageData.src}" alt="${imageData.name}" onclick="showInCarousel(${index})">
        <button class="delete-btn" onclick="deleteImage('${imageData.id}')" title="Sil">×</button>
    `;

  gridContainer.appendChild(imageItem);
}

// Show progress bar
function showProgress() {
  uploadProgress.style.display = "block";
  progressBar.style.width = "0%";
}

// Update progress bar
function updateProgress(percentage) {
  progressBar.style.width = percentage + "%";
}

// Hide progress bar
function hideProgress() {
  uploadProgress.style.display = "none";
}

// Keyboard navigation
document.addEventListener("keydown", function (event) {
  if (uploadedImages.length === 0) return;

  switch (event.key) {
    case "ArrowLeft":
      previousImage();
      break;
    case "ArrowRight":
      nextImage();
      break;
    case "Escape":
      // Could be used to close fullscreen view if implemented
      break;
  }
});

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Optional: Add touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

carouselContainer.addEventListener("touchstart", function (event) {
  touchStartX = event.changedTouches[0].screenX;
});

carouselContainer.addEventListener("touchend", function (event) {
  touchEndX = event.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50;
  const difference = touchStartX - touchEndX;

  if (Math.abs(difference) > swipeThreshold) {
    if (difference > 0) {
      // Swipe left - next image
      nextImage();
    } else {
      // Swipe right - previous image
      previousImage();
    }
  }
}
