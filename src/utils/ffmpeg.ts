import { spawn } from "node:child_process";

/**
 * 合并音视频文件
 */
export function mergeMedia(
  mediaFilepaths: string[],
  outputFilepath: string,
  exArgs: string[] = [],
  ffmpegBinPath = "ffmpeg"
) {
  return new Promise((resolve, reject) => {
    let args = ["-hide_banner", "-loglevel", "error"];
    for (const mediaFilepath of mediaFilepaths) {
      args.push("-i");
      args.push(mediaFilepath);
    }
    args = [...args, "-c", "copy", ...exArgs, "-y", outputFilepath];
    const ffmpeg = spawn(ffmpegBinPath, args);

    ffmpeg.stdout.pipe(process.stdout);

    ffmpeg.stderr.pipe(process.stderr);

    ffmpeg.on("close", code => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(false);
      }
    });
  });
}
