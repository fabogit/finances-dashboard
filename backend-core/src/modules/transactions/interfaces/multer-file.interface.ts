/**
 * The fields of a file that `FileInterceptor` (Multer, memory storage) puts
 * on the request and that the upload reads. A local type, so the core needs
 * neither `@types/multer` nor its `Express` namespace (ADR-0011).
 */
export interface MulterFile {
  /** Name of the file on the client's machine. */
  originalname: string;
  /** MIME type the client declared; the content is checked separately. */
  mimetype: string;
  /** Size in bytes. */
  size: number;
  /** The whole file, in memory. */
  buffer: Buffer;
}
