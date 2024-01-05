const fs = require('fs').promises;
const path = require('path');
const convert = require('heic-convert');

const convertHeicToPngMiddleware = (UPLOADS_FOLDER) => {
  return async (req, res, next) => {
    let filesToConvert = [];

    // Check if req.files is an array or just a single file
    if (Array.isArray(req.files)) {
      filesToConvert = req.files;
    } else if (req.file) {
      filesToConvert.push(req.file);
    }

    if (filesToConvert.length > 0) {
      const heicFiles = filesToConvert.filter(
        (file) => file.mimetype === 'image/heic' || file.mimetype === 'image/heif'
      );

      await Promise.all(
        heicFiles.map(async (file) => {
          const heicBuffer = await fs.readFile(file.path);
          const pngBuffer = await convert({
            buffer: heicBuffer,
            format: 'PNG'
          });

          const pngFileName = `${path.basename(
            file.originalname,
            path.extname(file.originalname)
          )}.png`;
          const pngFilePath = path.join(UPLOADS_FOLDER, pngFileName);

          await fs.writeFile(pngFilePath, pngBuffer);

          // Remove the original HEIC file
          await fs.unlink(file.path);

          file.path = pngFilePath;
          file.filename = pngFileName;
          file.mimetype = 'image/png';
        })
      );
    }
    next();
  }
};

module.exports = convertHeicToPngMiddleware;
