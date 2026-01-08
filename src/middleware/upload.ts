import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "../../data/images/exercises");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Use temporary filename - will be renamed after upload
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `temp-${Date.now()}${ext}`);
  },
});

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.",
      ),
    );
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// Multer instance for JSON imports
const jsonFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (
    file.mimetype === "application/json" ||
    file.originalname.endsWith(".json")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only JSON files are allowed"));
  }
};

export const jsonUpload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1MB for JSON files
  fileFilter: jsonFileFilter,
});

/**
 * Validates that an imageSlug is safe (no path traversal)
 */
export function isValidImageSlug(slug: string): boolean {
  if (!slug) return false;
  // Check for path separators and parent directory references
  if (slug.includes("/") || slug.includes("\\") || slug.includes("..")) {
    return false;
  }
  // Only allow alphanumeric, hyphens, and underscores
  return /^[a-z0-9-_]+$/i.test(slug);
}

/**
 * Deletes an exercise image file if it exists
 */
export function deleteExerciseImage(imageSlug: string): void {
  if (!isValidImageSlug(imageSlug)) {
    return;
  }

  const extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

  for (const ext of extensions) {
    const filePath = path.join(UPLOAD_DIR, `${imageSlug}${ext}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
