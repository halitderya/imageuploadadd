// Global variables

const BUCKET_NAME = "halit-imageupload-app-2025";

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

const AWS_LAMBDA_UPLOAD_ENDPOINT =
  "https://kiyjgvylvlgriqo2r6rr4x2bh40zdjdg.lambda-url.eu-west-2.on.aws/";

const AWS_LAMBDA_LIST_ENDPOINT =
  "https://3fpatjuyidjsbhribcnaogf5em0beisk.lambda-url.eu-west-2.on.aws/";

document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  updateCarouselButtons();
  loadImageList(); // Auto-load existing images
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
  let successCount = 0;
  const totalFiles = files.length;

  files.forEach((file, index) => {
    // Her dosya için delay ekle (rate limiting için)
    setTimeout(async () => {
      try {
        await processFileAsync(file);
        successCount++;
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }

      processedCount++;
      const progress = (processedCount / totalFiles) * 100;
      updateProgress(progress);

      if (processedCount === totalFiles) {
        setTimeout(() => {
          hideProgress();
          showBatchUploadResult(successCount, totalFiles);
        }, 500);
      }
    }, index * 1000); // 1 saniye delay (rate limiting)
  });
}

// Process individual file - AWS Lambda ile
function processFile(file) {
  const reader = new FileReader();

  reader.onload = async function (e) {
    try {
      // Lambda'ya gönderilecek data
      const uploadData = {
        image: e.target.result, // base64 format (data:image/jpeg;base64,... dahil)
        imageData: e.target.result, // Lambda compatibility için ek field
        fileName: `${Date.now()}_${file.name}`,
        contentType: file.type,
      };

      // Lambda fonksiyonuna gönder
      const response = await uploadToAWS(uploadData);

      if (response.success) {
        const imageData = {
          id: Date.now() + Math.random(),
          src: e.target.result, // Local preview için
          name: file.name,
          size: file.size,
          type: file.type,
          awsFileName: response.fileName, // AWS'deki dosya adı
          uploaded: true,
        };

        addImageToCollection(imageData);
        showSuccessMessage(`${file.name} uploaded successfully!`);
      } else {
        showErrorMessage(`Failed to upload ${file.name}: ${response.error}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      showErrorMessage(`Error uploading ${file.name}`);
    }
  };

  reader.readAsDataURL(file);
}

// AWS Lambda'ya upload fonksiyonu
async function uploadToAWS(uploadData) {
  try {
    // Validate upload data
    if (!uploadData.image || !uploadData.fileName) {
      throw new Error("Missing required upload data");
    }

    console.log("Uploading to AWS:", {
      fileName: uploadData.fileName,
      contentType: uploadData.contentType,
      imageSize: uploadData.image.length,
      endpoint: AWS_LAMBDA_UPLOAD_ENDPOINT,
    });

    const response = await fetch(AWS_LAMBDA_UPLOAD_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      body: JSON.stringify(uploadData),
    });

    if (!response.ok) {
      let errorText;
      try {
        const errorJson = await response.json();
        errorText =
          errorJson.error || errorJson.message || `HTTP ${response.status}`;
      } catch {
        errorText = (await response.text()) || `HTTP ${response.status}`;
      }
      throw new Error(`Upload failed: ${errorText}`);
    }

    const result = await response.json();

    // Lambda response formatını kontrol et
    console.log("Upload Response:", result); // Debug için

    return {
      success: true,
      fileName: result.fileName || result.key || uploadData.fileName,
      message: result.message || "Upload successful",
      imageUrl: result.imageUrl,
    };
  } catch (error) {
    console.error("AWS Upload Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Load image list from AWS Lambda (S3)
async function loadImageList() {
  try {
    console.log("Loading image list from:", AWS_LAMBDA_LIST_ENDPOINT);

    const response = await fetch(AWS_LAMBDA_LIST_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image list: ${response.status}`);
    }

    const result = await response.json();

    console.log("AWS Response:", result); // Debug için

    // AWS response structure'ına göre handle et
    let imageFiles = [];
    if (result.files && Array.isArray(result.files)) {
      imageFiles = result.files.map((file) => file.key);
    } else if (Array.isArray(result.images)) {
      imageFiles = result.images;
    } else if (Array.isArray(result)) {
      imageFiles = result;
    }

    if (imageFiles.length > 0) {
      uploadedImages = imageFiles.map((filename, index) => ({
        id: Date.now() + index,
        src: `https://${BUCKET_NAME}.s3.eu-west-2.amazonaws.com/${filename}`,
        name: filename.replace(/^upload_\d+_/, ""), // Prefix'i temizle
        size: 0,
        type: "image/jpeg",
        awsFileName: filename,
        uploaded: true,
      }));

      rebuildGrid();
      updateCarousel();
      updateCarouselButtons();
      showSuccessMessage(`${imageFiles.length} images loaded from S3.`);
    } else {
      showSuccessMessage("No images found in S3 bucket.");
      // Empty state göster
      uploadedImages = [];
      rebuildGrid();
      updateCarousel();
      updateCarouselButtons();
    }
  } catch (error) {
    console.error("Error loading image list:", error);
    showErrorMessage(`Error loading image list: ${error.message}`);
  }
}

// Success message göster
function showSuccessMessage(message) {
  const notification = document.createElement("div");
  notification.className = "notification success";
  notification.innerHTML = `
    <span>✅ ${message}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `;

  document.body.appendChild(notification);

  // 3 saniye sonra otomatik kaldır
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

// Error message göster
function showErrorMessage(message) {
  const notification = document.createElement("div");
  notification.className = "notification error";
  notification.innerHTML = `
    <span>❌ ${message}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `;

  document.body.appendChild(notification);

  // 5 saniye sonra otomatik kaldır
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Async file processing
async function processFileAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async function (e) {
      try {
        const uploadData = {
          image: e.target.result,
          imageData: e.target.result, // Lambda compatibility için
          fileName: `${Date.now()}_${file.name}`,
          contentType: file.type,
        };

        const response = await uploadToAWS(uploadData);

        if (response.success) {
          const imageData = {
            id: Date.now() + Math.random(),
            src: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type,
            awsFileName: response.fileName,
            uploaded: true,
          };

          addImageToCollection(imageData);
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Batch upload sonucu göster
function showBatchUploadResult(successCount, totalFiles) {
  if (successCount === totalFiles) {
    showSuccessMessage(`All ${totalFiles} images uploaded successfully!`);
    // Upload başarılı olduğunda image list'i refresh et
    setTimeout(() => {
      loadImageList();
    }, 1000);
  } else if (successCount > 0) {
    showSuccessMessage(
      `${successCount}/${totalFiles} images uploaded successfully`
    );
    showErrorMessage(`${totalFiles - successCount} images failed to upload`);
    // Partial success'te de refresh et
    setTimeout(() => {
      loadImageList();
    }, 1000);
  } else {
    showErrorMessage("All uploads failed. Please try again.");
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
