import "server-only";

import { uploadMultipleFiles } from "./cf-upload";
import { customError, customLog, customSuccess } from "@/lib/utils/log";
import { Result, ResultType } from "@/lib/utils/result";
import { nanoid } from "nanoid";
import { uploadSingleFile } from "./cf-upload";
import { db } from "@/lib/db";
import { medias } from "@/lib/db/schema/generation";

/**
 * 上传图片结果接口
 */
export interface UploadedImage {
  filename: string;
  url: string;
  size: number;
  contentType: string;
}

/**
 * 图片处理和上传结果的ResultType
 */
export type ProcessAndUploadResultType = ResultType<{
  uploadedImages: UploadedImage[];
}>;

/**
 * 处理图片数组并上传到云存储
 *
 * @param images - 图片数组，可以是File对象或包含file属性的对象
 * @param folder - 上传文件夹路径，默认为"generation/inputs"
 * @param useRandomFilename - 是否使用随机文件名，默认为true
 * @returns Promise<ProcessAndUploadResultType> - 处理结果
 */
export async function processAndUploadImages(
  images: any[],
  folder: string = "generation/inputs",
  useRandomFilename: boolean = true
): Promise<ProcessAndUploadResultType> {
  // 如果没有图片，返回空结果
  if (!images || images.length === 0) {
    return Result.success({
      uploadedImages: [],
    });
  }

  customLog(`processAndUploadImages > 准备处理 ${images.length} 张图片`);

  // 提取 File 对象
  const files: File[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    // 如果图片是 File 对象，直接使用
    if (image instanceof File) {
      files.push(image);
    }
    // 如果图片有 file 属性（来自 ImageUpload 组件的 ImageFile 接口）
    else if (image && image.file instanceof File) {
      files.push(image.file);
    }
    // 如果是其他格式，跳过（或者可以添加错误处理）
    else {
      customError(
        `processAndUploadImages > 不支持的图片格式，跳过第 ${i + 1} 张图片`
      );
    }
  }

  // 检查是否有有效的文件
  if (files.length === 0) {
    customError("processAndUploadImages > 没有找到有效的 File 对象");
    return Result.fail("没有找到有效的图片文件");
  }

  console.log("=== Image Upload Process ===");
  console.log("files count:", files.length);
  console.log(
    "file names:",
    files.map((f) => f.name)
  );

  try {
    // 调用 cf-upload 的 uploadMultipleFiles 函数
    const uploadResult = await uploadMultipleFiles(
      files,
      folder,
      undefined, // 不使用自定义文件名
      false, // 不跳过已存在的文件
      useRandomFilename // 使用随机文件名
    );

    // 处理上传结果
    if (uploadResult.successCount > 0) {
      const uploadedImages: UploadedImage[] = uploadResult.results.map(
        (result) => ({
          filename: result.filename,
          url: result.url,
          size: result.size,
          contentType: result.contentType,
        })
      );

      customSuccess(
        `processAndUploadImages > 图片上传成功: ${uploadResult.successCount}/${uploadResult.totalFiles}`
      );

      console.log("=== Upload Results ===");
      console.log("uploadedImages:", uploadedImages);

      return Result.success({
        uploadedImages,
      });
    } else {
      // 处理上传失败的情况
      const errorMessages = uploadResult.errors
        .map((err) => err.error)
        .join(", ");
      customError(`processAndUploadImages > 图片上传失败: ${errorMessages}`);
      return Result.fail(`图片上传失败: ${errorMessages}`);
    }
  } catch (error) {
    customError(`processAndUploadImages > 上传过程中发生错误: ${error}`);
    return Result.fail(
      `图片上传过程中发生错误: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * 从URL或MIME类型获取文件扩展名
 * @param url 文件URL
 * @param mimeType MIME类型
 * @returns 文件扩展名
 */
function getFileExtension(url: string, mimeType: string): string {
  // 首先尝试从URL中提取扩展名
  const urlParts = url.split("/");
  const filename = urlParts[urlParts.length - 1].split("?")[0];
  const urlExtension = filename.split(".").pop()?.toLowerCase();

  if (urlExtension && urlExtension.length <= 4) {
    return urlExtension;
  }

  // 如果URL中没有扩展名，根据MIME类型推断
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogg",
    "video/avi": "avi",
    "video/mov": "mov",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
  };

  return mimeToExt[mimeType] || "bin";
}

/**
 * 下载需要认证的媒体资源并上传到Cloudflare R2
 * @param url 媒体文件的URL
 * @param customHeaders 自定义请求头（可选）
 * @param uploadOptions 上传选项（可选）
 * @returns Promise<string> 返回Cloudflare R2的公开访问URL
 */
export default async function ConvertMedia(
  url: string,
  customHeaders?: Record<string, string>,
  uploadOptions?: {
    path?: string; // 上传路径
    skipExisting?: boolean; // 跳过已存在的文件
    sid?: string; // 用户ID
    recordId?: string; // 记录ID
    taskId?: string; // 任务ID
  }
): Promise<string> {
  customLog(`media > ConvertMedia ${JSON.stringify(uploadOptions)}`);
  try {
    // 第一步：下载受保护的媒体资源
    customLog(`media > ConvertMedia 开始下载媒体资源: ${url}`);

    const downloadHeaders: Record<string, string> = {
      ...customHeaders,
    };

    // 下载媒体文件
    const downloadResponse = await fetch(url, {
      method: "GET",
      headers: downloadHeaders,
    });

    if (!downloadResponse.ok) {
      throw new Error(
        `Failed to download media file: ${downloadResponse.status} ${downloadResponse.statusText}`
      );
    }

    const mediaBlob = await downloadResponse.blob();
    customLog(
      `media > ConvertMedia 媒体文件下载成功，大小: ${mediaBlob.size} bytes`
    );

    // 第二步：上传到Cloudflare R2
    customLog("media > ConvertMedia 开始上传到Cloudflare R2...");

    // 生成随机文件名
    const fileExtension = getFileExtension(url, mediaBlob.type);
    const randomFilename = `${nanoid()}.${fileExtension}`;

    // 创建File对象
    const file = new File([mediaBlob], randomFilename, {
      type: mediaBlob.type,
    });

    // 设置上传路径，默认为 "media"
    const uploadPath = uploadOptions?.path || "media";

    // 调用Cloudflare R2上传服务
    const uploadResult = await uploadSingleFile(
      file,
      uploadPath,
      undefined, // 不使用自定义文件名，直接使用随机生成的文件名
      uploadOptions?.skipExisting || false
    );

    customSuccess(
      `media > ConvertMedia 文件上传到Cloudflare R2成功: ${uploadResult.filename}`
    );

    // 将媒体文件信息存储到数据库
    if (
      uploadOptions?.sid ||
      uploadOptions?.recordId ||
      uploadOptions?.taskId
    ) {
      try {
        const mediaRecord: any = {
          sid: uploadOptions?.sid,
          recordId: uploadOptions?.recordId,
          taskId: uploadOptions?.taskId,
          url: uploadResult.url,
          type: mediaBlob.type,
          mediaType: mediaBlob.type.startsWith("video/")
            ? ("video" as const)
            : ("image" as const),
          uploadSource: "user" as const,
          meta: {
            originalUrl: url,
            filename: uploadResult.filename,
            size: mediaBlob.size,
            uploadPath: uploadPath,
          },
          // category 字段使用数据库默认值，不显式设置
        };

        await db.insert(medias).values(mediaRecord);

        customSuccess(
          `media > ConvertMedia 媒体文件信息已存储到数据库: ${uploadResult.filename}`
        );
      } catch (dbError) {
        customError(
          `media > ConvertMedia 存储媒体文件信息到数据库失败: ${dbError}`
        );
        // 不抛出错误，避免影响主流程
      }
    }

    // 返回公开访问URL
    return uploadResult.url;
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "ConvertMedia processing failed";
    customError(`media > ConvertMedia 处理过程中发生错误: ${errorMsg}`);
    throw error;
  }
}
