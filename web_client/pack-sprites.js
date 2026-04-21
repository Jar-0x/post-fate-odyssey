const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

async function pack() {
    const assetsDir = path.join(__dirname, '../public/assets');
    const images = ['dirt.png', 'grass.png', 'stone.png', 'rock.png', 'tree.png', 'wall.png', 'food.png'];
    
    // We will place them side by side.
    const tiles = [];
    let totalWidth = 0;
    let maxHeight = 0;
    
    for (let img of images) {
        const imgPath = path.join(assetsDir, img);
        if (!fs.existsSync(imgPath)) {
            console.warn("Skipping", img, "as it doesn't exist.");
            continue;
        }
        const j = await Jimp.read(imgPath);
        if (img === 'food.png') {
            j.resize(32, 32, Jimp.RESIZE_NEAREST_NEIGHBOR);
        }
        tiles.push({ name: img, jimp: j, width: j.bitmap.width, height: j.bitmap.height });
        totalWidth += j.bitmap.width;
        maxHeight = Math.max(maxHeight, j.bitmap.height);
    }
    
    // Create white pseudo-sprite
    const white = new Jimp(32, 32, 0xFFFFFFFF);
    tiles.push({ name: 'white.png', jimp: white, width: 32, height: 32 });
    totalWidth += 32;
    maxHeight = Math.max(maxHeight, 32);
    
    // Create circle pseudo-sprite
    const circle = new Jimp(32, 32, 0x00000000);
    circle.scan(0, 0, 32, 32, function(x, y, idx) {
        const cx = x - 16;
        const cy = y - 16;
        if (cx*cx + cy*cy <= 196) { // r=14
            this.bitmap.data[idx] = 255;
            this.bitmap.data[idx+1] = 255;
            this.bitmap.data[idx+2] = 255;
            this.bitmap.data[idx+3] = 255;
        }
    });
    tiles.push({ name: 'circle.png', jimp: circle, width: 32, height: 32 });
    totalWidth += 32;
    maxHeight = Math.max(maxHeight, 32);

    // Provide 1px padding between sprites to prevent bleeding or just don't
    const padding = 2;
    totalWidth += tiles.length * padding;

    const atlas = new Jimp(totalWidth, maxHeight, 0x00000000);
    
    const frames = {};
    let currentX = 0;
    
    for (let t of tiles) {
        atlas.blit(t.jimp, currentX, 0);
        frames[t.name] = {
            frame: { x: currentX, y: 0, w: t.width, h: t.height },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: t.width, h: t.height },
            sourceSize: { w: t.width, h: t.height }
        };
        currentX += t.width + padding;
    }
    
    const atlasPath = path.join(assetsDir, 'spritesheet.png');
    await atlas.writeAsync(atlasPath);
    
    const json = {
        frames: frames,
        meta: {
            app: "Post-fate Odyssey Packer",
            image: "spritesheet.png",
            format: "RGBA8888",
            size: { w: totalWidth, h: maxHeight },
            scale: "1"
        }
    };
    
    fs.writeFileSync(path.join(assetsDir, 'spritesheet.json'), JSON.stringify(json, null, 2));
    console.log("Spritesheet packed successfully!");
}

pack().catch(console.error);
