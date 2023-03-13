const path = require('path');
const fs = require('fs');

exports.clearImage = (imageUrl) => {
    const imagePath = path.join(__dirname, '..', imageUrl);
    fs.unlink(imagePath, (err) => console.log(err));
};
