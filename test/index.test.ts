import { WebVideoUploader } from "../src/index";
import { describe, expect, it, vi } from "vitest";
import axios, { AxiosError } from "axios";
import MockAdapter from "axios-mock-adapter";

describe("WebVideoUploader", () => {
  vi.mock("../src//utils/index.js", async importOriginal => {
    const mod = await importOriginal<typeof import("../src/utils/index.js")>();
    return {
      ...mod,
      getFileSize: vi.fn().mockResolvedValue(240850008),
      readBytesFromFile: vi.fn().mockResolvedValue(Buffer.from("test")),
    };
  });
  describe("upload", () => {
    const uploader = new WebVideoUploader({
      path: "/data/test.mp4",
    }) as any;
    const preuploadSPy = vi.spyOn(uploader, "preupload").mockResolvedValue({
      url: "https://upos-cs-upcdnbldsa.bilivideo.com/ugcfx2lf/n240809sa.mp4",
      biz_id: 50000164324,
      chunk_size: 10485760,
      auth: "ak=14944&cdn=%2F%2Fupos-cs-upcdnbldsa.bilivideo.com&os=upos&sign=aeed1d0f57b27bf9359a5b36d&timestamp=1723173507.145&uid=10995238&uip=1.84.214.166&uport=9896&use_dqp=0",
    });

    const getUploadInfoSpy = vi
      .spyOn(uploader, "getUploadInfo")
      .mockResolvedValue({
        OK: 1,
        bucket: "ugcfx2lf",
        key: "/n240809sa.mp4",
        upload_id: "6bb8-q1fe-442a-82e3-717cc0ed2432",
      });
    const completeUploadSpy = vi
      .spyOn(uploader, "mergeVideoApi")
      .mockResolvedValue({
        OK: 1,
        bucket: "ugcfx2lf",
        key: "/240809sa.mp4",
        etag: "etag",
        location: "ugcfx2lf",
      });
    it("should upload a video successfully", async () => {
      const uploadChunkSpy = vi
        .spyOn(uploader, "uploadChunk")
        .mockResolvedValue([
          {
            partNumber: 1,
            eTag: "etag",
          },
        ]);

      await uploader.upload();
      expect(preuploadSPy).toHaveBeenCalledWith();
      expect(getUploadInfoSpy).toHaveBeenLastCalledWith(
        "https://upos-cs-upcdnbldsa.bilivideo.com/ugcfx2lf/n240809sa.mp4",
        50000164324,
        10485760,
        "ak=14944&cdn=%2F%2Fupos-cs-upcdnbldsa.bilivideo.com&os=upos&sign=aeed1d0f57b27bf9359a5b36d&timestamp=1723173507.145&uid=10995238&uip=1.84.214.166&uport=9896&use_dqp=0"
      );
      expect(uploadChunkSpy).toHaveBeenCalledWith(
        "https://upos-cs-upcdnbldsa.bilivideo.com/ugcfx2lf/n240809sa.mp4",
        "ak=14944&cdn=%2F%2Fupos-cs-upcdnbldsa.bilivideo.com&os=upos&sign=aeed1d0f57b27bf9359a5b36d&timestamp=1723173507.145&uid=10995238&uip=1.84.214.166&uport=9896&use_dqp=0",
        "6bb8-q1fe-442a-82e3-717cc0ed2432",
        10485760
      );
      expect(completeUploadSpy).toHaveBeenCalledWith(
        "https://upos-cs-upcdnbldsa.bilivideo.com/ugcfx2lf/n240809sa.mp4",
        {
          name: "test",
          uploadId: "6bb8-q1fe-442a-82e3-717cc0ed2432",
          biz_id: 50000164324,
          output: "json",
          profile: "ugcupos/bup",
        },
        "ak=14944&cdn=%2F%2Fupos-cs-upcdnbldsa.bilivideo.com&os=upos&sign=aeed1d0f57b27bf9359a5b36d&timestamp=1723173507.145&uid=10995238&uip=1.84.214.166&uport=9896&use_dqp=0"
      );
    });
  });
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  describe("uploadChunk", async () => {
    it("should upload a chunk successfully", async () => {
      const uploader = new WebVideoUploader({
        path: "/data/test.mp4",
      }) as any;
      uploader.size = 240850008;

      const _uploadChunkSpy = vi.spyOn(uploader, "_uploadChunk");
      const uploadChunkApiSpy = vi
        .spyOn(uploader, "uploadChunkApi")
        .mockResolvedValue(true);

      const status = await uploader.uploadChunk(
        "https://upos-cs-upcdnbldsa.bilivideo.com/ugcfx2lf/n240809sa.mp4",
        "",
        "6bb8-q1fe-442a-82e3-717cc0ed2432",
        10485760
      );
      expect(status).toBe(true);
      expect(_uploadChunkSpy).toHaveBeenCalledTimes(23);
      expect(uploadChunkApiSpy).toHaveBeenCalledTimes(23);
      expect(Object.entries(uploader.chunkTasks)).toHaveLength(23);
      expect(
        Object.entries(uploader.chunkTasks).every(([partNumber, task]) => {
          // @ts-ignore
          return task.status === "completed";
        })
      ).toBe(true);
    });
    it("should upload failure", async () => {
      const uploader = new WebVideoUploader(
        {
          path: "/data/test.mp4",
        },
        undefined,
        {
          retryDelay: 0,
        }
      ) as any;
      uploader.size = 240850008;

      const uploadChunkApiSpy = vi
        .spyOn(uploader, "uploadChunkApi")
        .mockRejectedValue(false);
      try {
        const parts = await uploader.uploadChunk(
          "https://upos-cs-upcdnbldsa.bilivideo.com/ugcfx2lf/n240809sa.mp4",
          "",
          "6bb8-q1fe-442a-82e3-717cc0ed2432",
          10485760
        );
      } catch (e) {
        expect(
          Object.entries(uploader.chunkTasks).some(([partNumber, task]) => {
            // @ts-ignore
            return task.status === "completed";
          })
        ).toBe(false);
      }
    });
  });
});
