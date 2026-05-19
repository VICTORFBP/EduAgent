import imageCompression from 'browser-image-compression';

/**
 * Optimiza un archivo antes de subirlo.
 * Si es una imagen (JPG, PNG, WebP), la comprime localmente.
 * Si es un PDF u otro archivo, por ahora lo retorna intacto 
 * (la compresión pesada de PDFs se delega al backend).
 */
export async function optimizeFile(file: File): Promise<File> {
  const isImage = file.type.startsWith('image/');
  
  if (isImage) {
    try {
      const options = {
        maxSizeMB: 1, // Tamaño máximo 1MB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8,
      };
      
      const compressedBlob = await imageCompression(file, options);
      
      // browser-image-compression retorna un Blob, lo convertimos de vuelta a File
      return new File([compressedBlob], file.name, {
        type: compressedBlob.type,
        lastModified: Date.now(),
      });
    } catch (error) {
      console.error('Error al comprimir la imagen:', error);
      // En caso de error, devolvemos el archivo original para no romper el flujo
      return file;
    }
  }

  // Para PDFs u otros archivos, pasamos el archivo tal cual
  return file;
}
