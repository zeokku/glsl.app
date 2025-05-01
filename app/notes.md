# vue hmr failure with css modules

hmr uses original file disregarding any transforms causing css modules plugin to work incorrectly

downgrade to @vitejs/plugin-vue 5.1.5 for now

sometimes it still breaks but saving twice helps

# resize icon

ffmpeg -i $i -vf scale=256:256 icon-1.5-256.png