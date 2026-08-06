import axios from "axios";
import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import RangeDownloader from "../src/utils/downloader.js";

describe("RangeDownloader", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not restart a paused download when its previous timeout expires", async () => {
    vi.useFakeTimers();
    vi.spyOn(fs.promises, "unlink").mockResolvedValue(undefined);
    vi.spyOn(axios, "get").mockImplementation(
      () => new Promise(() => {}) as never
    );
    const downloader = new RangeDownloader({
      url: "https://example.com/video",
      filePath: "video.part",
      timeout: 1000,
    });
    const startSpy = vi.spyOn(downloader, "start");

    void downloader.start();
    await Promise.resolve();
    await Promise.resolve();
    downloader.pause();
    await vi.advanceTimersByTimeAsync(1000);

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(downloader.status).toBe("paused");
  });
});
