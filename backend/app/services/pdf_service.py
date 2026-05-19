import fitz
import io
import logging

logger = logging.getLogger(__name__)

def compress_pdf(file_bytes: bytes) -> bytes:
    """
    Comprime un archivo PDF usando PyMuPDF (fitz).
    Remueve objetos sin uso y comprime los streams de datos.
    Retorna los bytes originales si la compresión falla o si el tamaño resultante es mayor.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        output = io.BytesIO()
        # garbage=4: elimina objetos basura y duplicados
        # deflate=True: comprime flujos no comprimidos
        # clean=True: limpia y sanitiza el contenido
        doc.save(output, garbage=4, deflate=True, clean=True)
        
        compressed_bytes = output.getvalue()
        
        # Solo retornar la version comprimida si de verdad reduce el tamaño
        if len(compressed_bytes) < len(file_bytes):
            logger.info(f"PDF comprimido de {len(file_bytes)} a {len(compressed_bytes)} bytes")
            return compressed_bytes
            
        logger.info("El PDF ya estaba optimizado. Manteniendo original.")
        return file_bytes
    except Exception as e:
        logger.error(f"Error comprimiendo PDF: {e}")
        return file_bytes
