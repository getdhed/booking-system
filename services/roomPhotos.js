const path = require('node:path');
const fs = require('node:fs');
const { promises: files } = fs;
const crypto = require('node:crypto');
const multer = require('multer');

const uploadDirectory = path.resolve(process.env.ROOM_UPLOAD_DIR || path.join(__dirname, '..', 'uploads', 'rooms'));
fs.mkdirSync(uploadDirectory, { recursive: true });
const parsePhotos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 9, fields: 0 },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Only JPEG, PNG and WebP are allowed');
      error.status = 400; callback(error); return;
    }
    callback(null, true);
  }
}).array('photos', 9);

function extension(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function uploadPhotos(req, res, next) {
  parsePhotos(req, res, async error => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Photo exceeds 5 MB' : 'Invalid photos: use up to 9 JPEG, PNG or WebP files' });
    }
    if (!req.files?.length) return res.status(400).json({ error: 'Select at least one photo' });
    const extensions = req.files.map(file => extension(file.buffer));
    if (extensions.some(value => !value)) return res.status(400).json({ error: 'Invalid image content' });
    const saved = [];
    try {
      for (let i = 0; i < req.files.length; i++) {
        const name = crypto.randomUUID() + '.' + extensions[i];
        await files.writeFile(path.join(uploadDirectory, name), req.files[i].buffer, { flag: 'wx' });
        saved.push(name);
      }
      return res.status(201).json({ photos: saved.map(name => '/uploads/rooms/' + name) });
    } catch (err) {
      await Promise.allSettled(saved.map(name => files.unlink(path.join(uploadDirectory, name))));
      next(err);
    }
  });
}

module.exports = { uploadDirectory, uploadPhotos };
