/**
 * Largest bank export accepted by the upload, in bytes: 5 MiB.
 *
 * A monthly or yearly export is a few hundred kilobytes, so 5 MiB leaves a
 * wide margin. Multer stops reading at this size and the upload answers `413`
 * (D-122), so an oversized file is never held whole in memory.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
