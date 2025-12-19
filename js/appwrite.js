// This file should not include any 'require' statements

// Get Appwrite SDK from global window (loaded via CDN script)
const { Client, Account, Databases, Storage, ID } = Appwrite;

// Initialize Appwrite client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1") // ✅ remove extra spaces
  .setProject("688637ce003bea5e9d38"); // ✅ your real Project ID

// Create Appwrite service instances
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Your constants
const DATABASE_ID = "688645c3003851c4c1b0";
const COLLECTION_ID = "6886460300304d87f9bc";
const BUCKET_ID = "68863868001f62776bd0";

// Expose Appwrite globally
window.appwrite = {
  client,
  account,
  databases,
  storage,
  ID,
  DATABASE_ID,
  COLLECTION_ID,
  BUCKET_ID,
};

// Extra utilities
window.appwriteUtils = {
  async isAuthenticated() {
    try {
      await account.get();
      return true;
    } catch (error) {
      return false;
    }
  },

  async getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  getFileIcon(mimeType) {
    if (mimeType.startsWith("image/")) return "fas fa-image";
    if (mimeType.startsWith("video/")) return "fas fa-video";
    if (mimeType.startsWith("audio/")) return "fas fa-music";
    if (mimeType.includes("pdf")) return "fas fa-file-pdf";
    if (mimeType.includes("word")) return "fas fa-file-word";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "fas fa-file-excel";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "fas fa-file-powerpoint";
    if (mimeType.includes("zip") || mimeType.includes("rar")) return "fas fa-file-archive";
    if (mimeType.includes("text")) return "fas fa-file-alt";
    return "fas fa-file";
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  },
};
