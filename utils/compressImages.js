const compress_images = require('compress-images');

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
