const compress_images = require('compress-images');
const rimraf = require("rimraf");
//const INPUT_path_to_your_images = 'tempImages/**/*.{jpg,JPG,jpeg,JPEG,png}';
const OUTPUT_path = 'hydrantsImages/';
exports.compressImages = (inputPath, cb) => {
    inputPath = inputPath + '/**/*.{jpg,JPG,jpeg,JPEG,png}';
    console.log("inputPath", inputPath)

    compress_images(inputPath, OUTPUT_path, { compress_force: false, statistic: true, autoupdate: true }, false,
        { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
        { png: { engine: 'pngquant', command: ['--quality=20-50'] } },
        { svg: { engine: 'svgo', command: '--multipass' } },
        { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } }, function (error, completed, statistic) {

            console.log('-------------');
            console.log(error);
            console.log(completed);
            console.log(statistic);
            console.log('-------------');
            cb();
        });
}

exports.compressImage = (imagePath) => {
    let imageFolderPath = imagePath.split("\\");
    imageFolderPath = imageFolderPath[0] + "/" + imageFolderPath[1];
    imagePath = imageFolderPath + '/*.{jpg,JPG,jpeg,JPEG,png}';
    return new Promise((resolve, reject) => {

        compress_images(imagePath, OUTPUT_path, { compress_force: false, statistic: true, autoupdate: true }, false,
            { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
            { png: { engine: 'pngquant', command: ['--quality=20-50'] } },
            { svg: { engine: 'svgo', command: '--multipass' } },
            { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } }, function (error, completed, statistic) {
    
                console.log('-------------');
                console.log(error);
                console.log(completed);
                console.log(statistic);
                console.log('-------------');
                if (error) reject("Compression failed");
                rimraf(imageFolderPath, (err) => {
                    if (err) reject("Deleting folder failed");
                    resolve(statistic.path_out_new); 
                });
                
            });
    })
}
