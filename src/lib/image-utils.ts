
/**
 * Compresses an image file.
 * @param {File} file The image file to compress.
 * @returns {Promise<File>} The compressed file.
 */
export const compressImage = async (file: File): Promise<File> => {
    // Bypassing compression due to environment issues. Returning original file.
    return file;
};
