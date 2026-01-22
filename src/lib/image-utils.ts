
import imageCompression from 'browser-image-compression';

const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: false,
};

/**
 * Compresses an image file.
 * @param {File} file The image file to compress.
 * @returns {Promise<File>} The compressed file.
 */
export const compressImage = async (file: File): Promise<File> => {
    try {
        const compressedFile = await imageCompression(file, defaultOptions);
        console.log(`Compressed ${file.name} from ${file.size / 1024 / 1024} MB to ${compressedFile.size / 1024 / 1024} MB`);
        return compressedFile;
    } catch (error) {
        console.error(`Could not compress image ${file.name}, returning original file.`, error);
        // If compression fails, return the original file
        return file;
    }
};
