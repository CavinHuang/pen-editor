#!/bin/bash

# 遍历src/libs目录下的所有.js文件
find ./src/libs -name "*.js" | while read file; do
    # 获取文件所在目录
    dir=$(dirname "$file")
    # 获取文件名(不含扩展名)
    filename=$(basename "$file" .js)
    # 新文件路径
    new_file="$dir/$filename.ts"

    # 重命名文件
    mv "$file" "$new_file"
    echo "已重命名: $file -> $new_file"
done

echo "所有.js文件已成功重命名为.ts文件"
