const BUCKET_NAME = "halit-imageupload-app-2025";

let uploadedImages = [];
let currentImageIndex = 0;
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
        }, 500);
      }
    }, index * 1000);
  });
}

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
          src: e.target.result,
          name: file.name,
          size: file.size,
          type: file.type,
          awsFileName: response.fileName,
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

async function uploadToAWS(uploadData) {
  try {
    // Validate upload data
    if (!uploadData.image || !uploadData.fileName) {
      throw new Error("Missing required upload data");
    }

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

async function loadImageList() {
  try {
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

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

function showErrorMessage(message) {
  const notification = document.createElement("div");
  notification.className = "notification error";
  notification.innerHTML = `
    <span>❌ ${message}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

async function processFileAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async function (e) {
      try {
        const uploadData = {
          image: e.target.result,
          imageData: e.target.result,
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
    `;

  gridContainer.appendChild(imageItem);
}

function addImageToCollection(imageData) {
  uploadedImages.push(imageData);
  addImageToGrid(imageData);
  updateCarousel();
  updateCarouselButtons();
}

function addImageToGrid(imageData) {
  const imageItem = document.createElement("div");
  imageItem.className = "image-item new";
  imageItem.innerHTML = `
        <img src="${imageData.src}" alt="${
    imageData.name
  }" onclick="showInCarousel(${uploadedImages.length - 1})">

    `;

  gridContainer.appendChild(imageItem);

  setTimeout(() => {
    imageItem.classList.remove("new");
  }, 500);
}

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

function updateCarouselButtons() {
  if (uploadedImages.length <= 1) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  } else {
    prevBtn.style.display = "block";
    nextBtn.style.display = "block";
  }
}

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
