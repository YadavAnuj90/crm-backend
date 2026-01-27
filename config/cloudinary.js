const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  secure: true,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "crm-app/ticket-attachments",
    resource_type: "auto",
  },
});

const upload = multer({ storage });

module.exports = { upload, cloudinary };
