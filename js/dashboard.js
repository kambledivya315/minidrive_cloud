// Dashboard functionality
document.addEventListener("DOMContentLoaded", () => {
  let currentUser = null
  let userFiles = []
  let currentView = "all"
  let currentSort = "name"

  // DOM elements
  const userName = document.getElementById("userName")
  const logoutBtn = document.getElementById("logoutBtn")
  const uploadBtn = document.getElementById("uploadBtn")
  const fileInput = document.getElementById("fileInput")
  const uploadModal = document.getElementById("uploadModal")
  const uploadArea = document.getElementById("uploadArea")
  const filesGrid = document.getElementById("filesGrid")
  const emptyState = document.getElementById("emptyState")
  const loadingState = document.getElementById("loadingState")
  const searchInput = document.getElementById("searchInput")
  const sortSelect = document.getElementById("sortSelect")
  const viewBtns = document.querySelectorAll(".view-btn")
  const navItems = document.querySelectorAll(".nav-item")
  const pageTitle = document.getElementById("pageTitle")
  const fileCount = document.getElementById("fileCount")
  const previewModal = document.getElementById("previewModal")
  const uploadProgress = document.getElementById("uploadProgress")
  const progressFill = document.getElementById("progressFill")
  const progressText = document.getElementById("progressText")

  const appwriteUtils = window.appwriteUtils
  const appwrite = window.appwrite
  const downloadFile = window.downloadFile
  const deleteFile = window.deleteFile

  init()

  async function init() {
    try {
      const isAuth = await window.appwriteUtils.isAuthenticated()
      if (!isAuth) {
        window.location.href = "login.html"
        return
      }

      currentUser = await window.appwrite.account.get()
      if (currentUser) {
        userName.textContent = currentUser.name
      }

      await loadFiles()
      updateStorageInfo()
    } catch (error) {
      console.error("Dashboard initialization error:", error)
      window.location.href = "login.html"
    }
  }

  async function loadFiles() {
    try {
      loadingState.style.display = "block"
      emptyState.style.display = "none"
      filesGrid.innerHTML = ""

      const files = await window.appwrite.storage.listFiles(window.appwrite.BUCKET_ID)
      userFiles = files.files || []

      displayFiles(userFiles)
      updateFileCount()
    } catch (error) {
      console.error("Error loading files:", error)
      userFiles = []
      showEmptyState()
    } finally {
      loadingState.style.display = "none"
    }
  }

  function displayFiles(files) {
    if (!files || files.length === 0) {
      showEmptyState()
      return
    }

    let filteredFiles = filterFiles(files)
    filteredFiles = sortFiles(filteredFiles)

    const searchTerm = searchInput.value.toLowerCase()
    if (searchTerm) {
      filteredFiles = filteredFiles.filter((file) => file.name.toLowerCase().includes(searchTerm))
    }

    if (filteredFiles.length === 0) {
      showEmptyState()
      return
    }

    emptyState.style.display = "none"
    filesGrid.innerHTML = ""

    filteredFiles.forEach((file) => {
      const fileCard = createFileCard(file)
      filesGrid.appendChild(fileCard)
    })

    updateFileCount(filteredFiles.length)
  }

  function createFileCard(file) {
    const card = document.createElement("div")
    card.className = "file-card"
    card.dataset.fileId = file.$id

    const icon = window.appwriteUtils.getFileIcon(file.mimeType)
    const size = window.appwriteUtils.formatFileSize(file.sizeOriginal)
    const date = window.appwriteUtils.formatDate(file.$createdAt)

    card.innerHTML = `
      <div class="file-actions">
        <button class="action-btn" onclick="downloadFile('${file.$id}')">
          <i class="fas fa-download"></i>
        </button>
        <button class="action-btn" onclick="deleteFile('${file.$id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="file-icon">
        <i class="${icon}"></i>
      </div>
      <div class="file-name">${file.name}</div>
      <div class="file-info">
        <span>${size}</span>
        <span>${date}</span>
      </div>
    `

    card.addEventListener("click", (e) => {
      if (!e.target.closest(".file-actions")) {
        previewFile(file)
      }
    })

    return card
  }

  function filterFiles(files) {
    switch (currentView) {
      case "recent":
        return files.filter((file) => {
          const fileDate = new Date(file.$createdAt)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return fileDate > weekAgo
        })
      case "images":
        return files.filter((file) => file.mimeType.startsWith("image/"))
      case "documents":
        return files.filter(
          (file) =>
            file.mimeType.includes("pdf") || file.mimeType.includes("document") || file.mimeType.includes("text"),
        )
      case "trash":
        return [] // Implement trash functionality if needed
      default:
        return files
    }
  }

  function sortFiles(files) {
    return files.sort((a, b) => {
      switch (currentSort) {
        case "date":
          return new Date(b.$createdAt) - new Date(a.$createdAt)
        case "size":
          return b.sizeOriginal - a.sizeOriginal
        case "type":
          return a.mimeType.localeCompare(b.mimeType)
        default:
          return a.name.localeCompare(b.name)
      }
    })
  }

  function showEmptyState() {
    filesGrid.innerHTML = ""
    emptyState.style.display = "block"
    updateFileCount(0)
  }

  function updateFileCount(count = userFiles.length) {
    fileCount.textContent = `${count} file${count !== 1 ? "s" : ""}`
  }

  function updateStorageInfo() {
    const totalSize = userFiles.reduce((sum, file) => sum + file.sizeOriginal, 0)
    const totalSpace = 1024 * 1024 * 1024
    const usedPercentage = (totalSize / totalSpace) * 100

    document.getElementById("usedSpace").textContent = window.appwriteUtils.formatFileSize(totalSize)
    document.getElementById("storageUsed").style.width = `${Math.min(usedPercentage, 100)}%`
  }

  // ✅ CLEAN UP & SECURE UPLOAD LOGIC
  async function uploadFiles(files) {
    if (!files || files.length === 0) return

    uploadProgress.style.display = "block"
    uploadArea.style.display = "none"

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        progressText.textContent = `Uploading ${file.name}... (${i + 1}/${files.length})`

        const progress = ((i + 1) / files.length) * 100
        progressFill.style.width = `${progress}%`

        await window.appwrite.storage.createFile(
          window.appwrite.BUCKET_ID,
          window.appwrite.ID.unique(),
          file,
          [
            `read("user:${currentUser.$id}")`,
            `delete("user:${currentUser.$id}")`
          ]
        )
      }

      await loadFiles()
      updateStorageInfo()
      closeModal(uploadModal)
    } catch (error) {
      console.error("Upload error:", error)
      alert("Upload failed: " + error.message)
    } finally {
      uploadProgress.style.display = "none"
      uploadArea.style.display = "block"
      progressFill.style.width = "0%"
    }
  }

  function previewFile(file) {
    const previewContent = document.getElementById("previewContent")
    const previewTitle = document.getElementById("previewTitle")

    previewTitle.textContent = file.name

    if (file.mimeType.startsWith("image/")) {
      const fileUrl = window.appwrite.storage.getFilePreview(window.appwrite.BUCKET_ID, file.$id)
      previewContent.innerHTML = `<img src="${fileUrl}" alt="${file.name}">`
    } else {
      previewContent.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <i class="${window.appwriteUtils.getFileIcon(file.mimeType)}" style="font-size: 4rem; color: #667eea; margin-bottom: 1rem;"></i>
          <h3>${file.name}</h3>
          <p>Size: ${window.appwriteUtils.formatFileSize(file.sizeOriginal)}</p>
          <p>Type: ${file.mimeType}</p>
          <p>Created: ${window.appwriteUtils.formatDate(file.$createdAt)}</p>
        </div>
      `
    }

    document.getElementById("downloadBtn").onclick = () => downloadFile(file.$id)
    document.getElementById("deleteBtn").onclick = () => {
      deleteFile(file.$id)
      closeModal(previewModal)
    }

    previewModal.style.display = "block"
  }

  window.downloadFile = (fileId) => {
    const fileUrl = window.appwrite.storage.getFileDownload(window.appwrite.BUCKET_ID, fileId)
    window.open(fileUrl, "_blank")
  }

  window.deleteFile = async (fileId) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      await window.appwrite.storage.deleteFile(window.appwrite.BUCKET_ID, fileId)
      await loadFiles()
      updateStorageInfo()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Delete failed: " + error.message)
    }
  }

  function closeModal(modal) {
    modal.style.display = "none"
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      await window.appwrite.account.deleteSession("current")
      window.location.href = "index.html"
    } catch (error) {
      console.error("Logout error:", error)
      window.location.href = "index.html"
    }
  })

  uploadBtn.addEventListener("click", () => {
    uploadModal.style.display = "block"
  })

  fileInput.addEventListener("change", (e) => {
    uploadFiles(e.target.files)
  })

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault()
    uploadArea.classList.add("dragover")
  })

  uploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault()
    uploadArea.classList.remove("dragover")
  })

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault()
    uploadArea.classList.remove("dragover")
    uploadFiles(e.dataTransfer.files)
  })

  searchInput.addEventListener("input", () => {
    displayFiles(userFiles)
  })

  sortSelect.addEventListener("change", function () {
    currentSort = this.value
    displayFiles(userFiles)
  })

  viewBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      viewBtns.forEach((b) => b.classList.remove("active"))
      this.classList.add("active")
    })
  })

  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault()
      navItems.forEach((i) => i.classList.remove("active"))
      this.classList.add("active")
      currentView = this.dataset.view
      pageTitle.textContent = this.textContent.trim()
      displayFiles(userFiles)
    })
  })

  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", function () {
      const modal = this.closest(".modal")
      closeModal(modal)
    })
  })

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal(e.target)
    }
  })
})
