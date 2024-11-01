#!/bin/sh

# 從package.json 中取得名稱並設為環境參數
export PRJ_NAME=$(grep '"name"' package.json | sed -E 's/.*"name": "(.*)".*/\1/')
# 從package.json 中取得版本並設為環境參數
export IMAGE_TAG=$(grep '"version"' package.json | sed -E 's/.*"version": "(.*)".*/\1/')
# Image name for checking exist or not
export IMAGE_NAME="$PRJ_NAME:$IMAGE_TAG"

echo "Using PRJ_NAME: $PRJ_NAME"
echo "Using IMAGE_TAG: $IMAGE_TAG"


# 若已存在則不加入 --build 參數
if docker images | grep -q "$IMAGE_NAME"; then
  echo "Image $IMAGE_NAME already exists. Running without --build."
  docker-compose -f docker-compose-sample.yml up -d
else
  echo "Image $IMAGE_NAME does not exist. Building the image."
  docker-compose -f docker-compose-sample.yml up --build -d
fi
