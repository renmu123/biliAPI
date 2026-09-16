import { WebVideoUploader, Platform, utils } from "../src/index";
import { describe, expect, it, vi } from "vitest";

describe("Platform", () => {
  describe("sortByCid", () => {
    it("should place matched cids first and keep unmatched cids at the end", () => {
      const platform = new Platform() as any;
      const videos = [
        { cid: 3, filename: "3.mp4", title: "3" },
        { cid: 1, filename: "1.mp4", title: "1" },
        { cid: 2, filename: "2.mp4", title: "2" },
        { cid: 4, filename: "4.mp4", title: "4" },
      ];

      const sortedVideos = platform.sortVideosByCid(videos, [2, 1]);

      expect(sortedVideos.map((video: { cid: number }) => video.cid)).toEqual([
        2, 1, 3, 4,
      ]);
    });
    it("should keep original order if sortByCid is not provided", () => {
      const platform = new Platform() as any;
      const videos = [
        { cid: 3, filename: "3.mp4", title: "3" },
        { cid: 1, filename: "1.mp4", title: "1" },
        { cid: 2, filename: "2.mp4", title: "2" },
      ];
      const sortedVideos = platform.sortVideosByCid(videos, undefined);
      expect(sortedVideos.map((video: { cid: number }) => video.cid)).toEqual([
        3, 1, 2,
      ]);
    });

    it("should allow sorting with existing archive cids during edit", async () => {
      const platform = new Platform() as any;
      platform.auth = {
        cookieObj: {
          bili_jct: "csrf",
        },
        authLogin: vi.fn(),
      };

      vi.spyOn(platform, "getArchive").mockResolvedValue({
        archive: {
          aid: 1,
          title: "title",
          tag: "tag",
          tid: 1,
          desc: "",
          copyright: 1,
          no_reprint: 1,
          source: "",
          desc_format_id: 0,
          dynamic: "",
          mission_id: 0,
        },
        watermark: {
          state: 1,
        },
        videos: [
          { cid: 10, filename: "10.mp4", title: "10" },
          { cid: 30, filename: "30.mp4", title: "30" },
        ],
      });
      vi.spyOn(platform, "checkOptions").mockReturnValue(true);
      const postSpy = vi.spyOn(platform.request, "post").mockResolvedValue({
        aid: 1,
        bvid: "BV1",
      } as any);

      await platform.editMediaWebApi(
        [{ cid: 20, filename: "20.mp4", title: "20" }],
        {
          aid: 1,
          title: "title",
          tag: "tag",
          tid: 1,
          sortByCid: [30, 20],
        },
        "append"
      );

      expect(postSpy).toHaveBeenCalled();
      expect(
        // @ts-ignore
        postSpy.mock.calls[0][1].videos.map(
          (video: { cid: number }) => video.cid
        )
      ).toEqual([30, 20, 10]);
      // @ts-ignore
      expect(postSpy.mock.calls[0][1].sortByCid).toBeUndefined();
    });
  });
});

describe("Subtitle Utils", () => {
  it("should convert subtitle JSON to SRT format", () => {
    const subtitleJson = {
      font_size: 0.4,
      font_color: "#FFFFFF",
      background_alpha: 0.5,
      background_color: "#9C27B0",
      stroke: "none",
      body: [
        {
          from: 0,
          to: 3.27,
          location: 2,
          content: "今天我们要上手体验的是一颗非常特殊的芯片",
        },
        {
          from: 4.0,
          to: 7.5,
          location: 2,
          content: "下一句测试字幕转换",
        },
      ],
    };

    const srt = utils.subtitleJsonToSrt(subtitleJson);

    expect(srt).toBe(
      "1\n00:00:00,000 --> 00:00:03,270\n今天我们要上手体验的是一颗非常特殊的芯片\n\n2\n00:00:04,000 --> 00:00:07,500\n下一句测试字幕转换\n"
    );
  });
});

describe("WebVideoUploader", () => {
  vi.mock("../src/utils/index.js", async importOriginal => {
    const mod = await importOriginal<typeof import("../src/utils/index.js")>();
    return {
      ...mod,
      getFileSize: vi.fn().mockResolvedValue(240850008),
      readBytesFromFile: vi.fn().mockResolvedValue(Buffer.from("test")),
      createReadStream: vi
        .fn()
        .mockReturnValue([Buffer.from("test"), 10485760]),
    };
  });
  WebVideoUploader.prototype.getFileSizeSync = () => 240850008;
  describe("line blacklist", () => {
    const lines = [
      { os: "upos", query: "probe_version=20221109&upcdn=bldsa&zone=cs", probe_url: "" },
      { os: "upos", query: new URLSearchParams("probe_version=20221109&upcdn=qn&zone=cs"), probe_url: "" },
      { os: "upos", query: "probe_version=20221109&upcdn=bldsa&zone=hk", probe_url: "" },
    ];

    it("skips matching zone-line pairs while preserving API order", async () => {
      const uploader = new WebVideoUploader(
        { path: "/data/test.mp4" },
        undefined,
        { lineBlacklist: ["cs-bldsa", "cs-qn"] }
      );
      vi.spyOn(uploader.request, "get").mockResolvedValue({
        data: { OK: 1, lines },
      } as any);

      expect(await uploader.getUploadLineApi()).toBe(lines[2]);
    });

    it("reports when every automatic line is excluded", async () => {
      const uploader = new WebVideoUploader(
        { path: "/data/test.mp4" },
        undefined,
        { lineBlacklist: ["cs-bldsa", "cs-qn", "hk-bldsa"] }
      );
      vi.spyOn(uploader.request, "get").mockResolvedValue({
        data: { OK: 1, lines },
      } as any);

      await expect(uploader.getUploadLineApi()).rejects.toThrow("可用线路均在黑名单中");
    });

    it("does not apply the blacklist to a manually selected line", async () => {
      const uploader = new WebVideoUploader(
        { path: "/data/test.mp4" },
        undefined,
        { line: "bldsa", zone: "cs", lineBlacklist: ["cs-bldsa"] }
      );
      const lineSpy = vi.spyOn(uploader, "getUploadLineApi");
      const preuploadSpy = vi.spyOn(uploader, "preuploadApi").mockResolvedValue({
        endpoint: "//upos.example.com",
        upos_uri: "upos://test.mp4",
        biz_id: 1,
        chunk_size: 1024,
        auth: "",
      } as any);

      await uploader.preupload();
      expect(lineSpy).not.toHaveBeenCalled();
      expect(preuploadSpy).toHaveBeenCalledWith({
        zone: "cs",
        upcdn: "bldsa",
        probe_version: "20250923",
      });
    });
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
        .mockImplementation(async () => {
          uploader.chunkTasks = {
            1: {
              status: "completed",
              controller: new AbortController(),
            },
          };
          uploader.progress = { 1: 10485760 };
          return true;
        });

      await uploader.upload();
      expect(uploader.chunkTasks).toEqual({});
      expect(uploader.progress).toEqual({});
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
    it("should clear chunk state after upload failure", async () => {
      const failedUploader = new WebVideoUploader({
        path: "/data/test.mp4",
      }) as any;
      failedUploader.chunkTasks = {
        1: {
          status: "running",
          controller: new AbortController(),
        },
      };
      failedUploader.progress = { 1: 1024 };
      vi.spyOn(failedUploader, "preupload").mockRejectedValue(
        new Error("preupload failed")
      );
      failedUploader.emitter.on("error", () => {});

      await expect(failedUploader.upload()).rejects.toThrow("preupload failed");
      expect(failedUploader.chunkTasks).toEqual({});
      expect(failedUploader.progress).toEqual({});
    });
    it("should clear chunk state after upload cancellation", async () => {
      const canceledUploader = new WebVideoUploader({
        path: "/data/test.mp4",
      }) as any;
      canceledUploader.chunkTasks = {
        1: {
          status: "running",
          controller: new AbortController(),
        },
      };
      canceledUploader.progress = { 1: 1024 };

      let resolvePreupload: (value: any) => void;
      vi.spyOn(canceledUploader, "preupload").mockImplementation(
        () =>
          new Promise(resolve => {
            resolvePreupload = resolve;
          })
      );
      vi.spyOn(canceledUploader, "getUploadInfo").mockResolvedValue({
        OK: 1,
        bucket: "ugcfx2lf",
        key: "/n240809sa.mp4",
        upload_id: "6bb8-q1fe-442a-82e3-717cc0ed2432",
      });

      const uploadPromise = canceledUploader.upload();
      canceledUploader.cancel();
      resolvePreupload({
        url: "https://upos.example.com/test.mp4",
        biz_id: 1,
        chunk_size: 10485760,
        auth: "",
      });

      await uploadPromise;
      expect(canceledUploader.chunkTasks).toEqual({});
      expect(canceledUploader.progress).toEqual({});
    });
    // it("should merge error", async () => {
    //   const mergeVideoSpy = vi
    //     .spyOn(uploader, "mergeVideoApi")
    //     .mockResolvedValue({
    //       OK: 0,
    //     });
    //   const uploadChunkSpy = vi
    //     .spyOn(uploader, "uploadChunk")
    //     .mockResolvedValue([
    //       {
    //         partNumber: 1,
    //         eTag: "etag",
    //       },
    //     ]);
    //   uploader.emitter.on("error", error => {
    //     console.log(error);
    //   });
    //   await uploader.upload();
    // });
  });
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
          return task.status === "completed" && task.controller === undefined;
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

    describe("verifyScheduledPublishTime", () => {
      const platform = new Platform();

      it("should return true if scheduledPublishTime is undefined", () => {
        expect(platform.verifyScheduledPublishTime(undefined)).toBe(true);
      });

      it("should return true if scheduledPublishTime is 0", () => {
        expect(platform.verifyScheduledPublishTime(0)).toBe(true);
      });

      it("should return true if scheduledPublishTime is within valid range", () => {
        const now = Math.floor(Date.now() / 1000);
        const validTime = now + 3 * 60 * 60; // 3 hours from now
        expect(platform.verifyScheduledPublishTime(validTime)).toBe(true);
      });

      it("should return false if scheduledPublishTime is less than 2 hours from now", () => {
        const now = Math.floor(Date.now() / 1000);
        const invalidTime = now + 60 * 60; // 1 hour from now
        expect(platform.verifyScheduledPublishTime(invalidTime)).toBe(false);
      });

      it("should return false if scheduledPublishTime is more than 15 days from now", () => {
        const now = Math.floor(Date.now() / 1000);
        const invalidTime = now + 16 * 24 * 60 * 60; // 16 days from now
        expect(platform.verifyScheduledPublishTime(invalidTime)).toBe(false);
      });
    });
  });
});
