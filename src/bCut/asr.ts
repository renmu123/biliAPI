import axios, { AxiosInstance } from "axios";
import fs from "node:fs";

// from: https://github.com/SocialSisterYi/bcut-asr

// API 端点
const API_BASE_URL = "https://member.bilibili.com/x/bcut/rubick-interface";
const API_REQ_UPLOAD = `${API_BASE_URL}/resource/create`;
const API_COMMIT_UPLOAD = `${API_BASE_URL}/resource/create/complete`;
const API_CREATE_TASK = `${API_BASE_URL}/task`;
const API_QUERY_RESULT = `${API_BASE_URL}/task/result`;

// 支持的音频格式
export type SupportSoundFormat = "flac" | "aac" | "m4a" | "mp3" | "wav";

// 支持的输出格式
export type OutputFormat = "srt" | "json" | "lrc" | "txt";

/**
 * 任务状态枚举
 */
export enum ResultStateEnum {
  STOP = 0, // 未开始
  RUNNING = 1, // 运行中
  ERROR = 3, // 错误
  COMPLETE = 4, // 完成
}

/**
 * 文字识别-逐字
 */
export interface ASRDataWords {
  label: string;
  start_time: number;
  end_time: number;
}

/**
 * 文字识别-断句
 */
export interface ASRDataSeg {
  start_time: number;
  end_time: number;
  transcript: string;
  words: ASRDataWords[];
}

/**
 * 语音识别结果
 */
export interface ASRDataResult {
  utterances: ASRDataSeg[];
  version: string;
}

/**
 * 上传申请响应
 */
export interface ResourceCreateRsp {
  resource_id: string;
  title: string;
  type: number;
  in_boss_key: string;
  size: number;
  upload_urls: string[];
  upload_id: string;
  per_size: number;
}

/**
 * 上传提交响应
 */
export interface ResourceCompleteRsp {
  resource_id: string;
  download_url: string;
}

/**
 * 任务创建响应
 */
export interface TaskCreateRsp {
  resource: string;
  result: string;
  task_id: string;
}

/**
 * 任务结果查询响应
 */
export interface ResultRsp {
  task_id: string;
  result: string | null;
  remark: string;
  state: ResultStateEnum;
}

/**
 * 语音识别结果数据类
 */
export class ASRData {
  private data: ASRDataResult;

  constructor(data: ASRDataResult) {
    this.data = data;
  }

  /**
   * 是否识别到数据
   */
  hasData(): boolean {
    return this.data.utterances.length > 0;
  }

  /**
   * 转换为 srt 时间戳
   */
  private toSrtTimestamp(seg: ASRDataSeg, offset: number = 0): string {
    const conv = (ms: number): [number, number, number, number] => {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms / 60000) % 60);
      const s = Math.floor((ms / 1000) % 60);
      const ms_val = ms % 1000;
      return [h, m, s, ms_val];
    };

    const [s_h, s_m, s_s, s_ms] = conv(seg.start_time + offset);
    const [e_h, e_m, e_s, e_ms] = conv(seg.end_time + offset);

    return `${String(s_h).padStart(2, "0")}:${String(s_m).padStart(2, "0")}:${String(s_s).padStart(2, "0")},${String(s_ms).padStart(3, "0")} --> ${String(e_h).padStart(2, "0")}:${String(e_m).padStart(2, "0")}:${String(e_s).padStart(2, "0")},${String(e_ms).padStart(3, "0")}`;
  }

  /**
   * 转换为 lrc 时间戳
   */
  private toLrcTimestamp(seg: ASRDataSeg): string {
    const conv = (ms: number): [number, number, number] => {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms / 1000) % 60);
      const ms_val = Math.floor((ms % 1000) / 10);
      return [m, s, ms_val];
    };

    const [s_m, s_s, s_ms] = conv(seg.start_time);
    return `[${String(s_m).padStart(2, "0")}:${String(s_s).padStart(2, "0")}.${String(s_ms).padStart(2, "0")}]`;
  }

  /**
   * 转成 txt 格式字幕 (无时间标记)
   */
  toTxt(): string {
    return this.data.utterances.map(seg => seg.transcript).join("\n");
  }

  /**
   * 转成 srt 格式字幕
   * @param offset 时间偏移，单位毫秒，默认为 0
   * @returns srt 字幕字符串
   */
  toSrt(offset: number = 0): string {
    return this.data.utterances
      .map((seg, index) => {
        return `${index + 1}\n${this.toSrtTimestamp(seg, offset)}\n${seg.transcript}\n`;
      })
      .join("\n");
  }

  /**
   * 转成 lrc 格式字幕
   */
  toLrc(): string {
    return this.data.utterances
      .map(seg => `${this.toLrcTimestamp(seg)}${seg.transcript}`)
      .join("\n");
  }

  /**
   * 转成 JSON 格式
   */
  toJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * 获取原始数据
   */
  getRawData(): ASRDataResult {
    return this.data;
  }
}

/**
 * ASR API 错误
 */
export class ASRError extends Error {
  code: number;
  msg: string;

  constructor(code: number, msg: string) {
    super(`${code}:${msg}`);
    this.name = "ASRError";
    this.code = code;
    this.msg = msg;
  }
}

/**
 * 必剪语音识别接口
 */
export class BcutASR {
  private session: AxiosInstance;
  private soundName: string = "";
  private soundBin: Buffer | null = null;
  private soundFmt: SupportSoundFormat | null = null;
  private inBossKey: string = "";
  private resourceId: string = "";
  private uploadId: string = "";
  private uploadUrls: string[] = [];
  private perSize: number = 0;
  private clips: number = 0;
  private etags: string[] = [];
  private downloadUrl: string = "";
  public taskId: string = "";

  constructor(file?: string) {
    this.session = axios.create({
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
    });

    if (file) {
      this.setDataFromFile(file);
    }
  }

  /**
   * 从文件设置数据
   */
  setDataFromFile(file: string): void {
    this.soundBin = fs.readFileSync(file);
    const suffix = file.split(".").pop()?.toLowerCase();

    if (!this.isSupportFormat(suffix)) {
      throw new TypeError(`Format ${suffix} is not supported`);
    }

    this.soundFmt = suffix as SupportSoundFormat;
    this.soundName = file.split(/[/\\]/).pop() || `${Date.now()}.${suffix}`;
  }

  /**
   * 设置原始数据
   */
  setData(data: Buffer, format: SupportSoundFormat, name?: string): void {
    if (!this.isSupportFormat(format)) {
      throw new TypeError(`Format ${format} is not supported`);
    }

    this.soundBin = data;
    this.soundFmt = format;
    this.soundName = name || `${Date.now()}.${format}`;
  }

  /**
   * 检查格式是否支持
   */
  private isSupportFormat(
    format: string | undefined
  ): format is SupportSoundFormat {
    const supportFormats: SupportSoundFormat[] = [
      "flac",
      "aac",
      "m4a",
      "mp3",
      "wav",
    ];
    return !!format && supportFormats.includes(format as SupportSoundFormat);
  }

  /**
   * 申请上传并执行上传流程
   */
  async upload(): Promise<void> {
    if (!this.soundBin || !this.soundFmt) {
      throw new ValueError("No data set");
    }

    const formData = new URLSearchParams({
      type: "2",
      name: this.soundName,
      size: String(this.soundBin.length),
      resource_file_type: this.soundFmt,
      model_id: "7",
    });

    const resp = await this.session.post(API_REQ_UPLOAD, formData);

    const { code, message, data } = resp.data;
    if (code !== 0) {
      throw new ASRError(code, message);
    }

    const uploadData: ResourceCreateRsp = data;
    this.inBossKey = uploadData.in_boss_key;
    this.resourceId = uploadData.resource_id;
    this.uploadId = uploadData.upload_id;
    this.uploadUrls = uploadData.upload_urls;
    this.perSize = uploadData.per_size;
    this.clips = uploadData.upload_urls.length;

    // 上传分片
    await this.uploadParts();

    // 提交上传
    await this.commitUpload();
  }

  /**
   * 上传音频数据分片
   */
  private async uploadParts(): Promise<void> {
    if (!this.soundBin) {
      throw new ValueError("No data set");
    }

    for (let clip = 0; clip < this.clips; clip++) {
      const startRange = clip * this.perSize;
      const endRange = Math.min(
        (clip + 1) * this.perSize,
        this.soundBin.length
      );

      const resp = await this.session.put(
        this.uploadUrls[clip],
        this.soundBin.subarray(startRange, endRange),
        {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        }
      );

      const etag = resp.headers["etag"];
      this.etags.push(etag);
    }
  }

  /**
   * 提交上传数据
   */
  private async commitUpload(): Promise<void> {
    const formData = new URLSearchParams({
      in_boss_key: this.inBossKey,
      resource_id: this.resourceId,
      etags: this.etags.join(","),
      upload_id: this.uploadId,
      model_id: "7",
    });

    const resp = await this.session.post(API_COMMIT_UPLOAD, formData);

    const { code, message, data } = resp.data;
    if (code !== 0) {
      throw new ASRError(code, message);
    }

    const completeData: ResourceCompleteRsp = data;
    this.downloadUrl = completeData.download_url;
  }

  /**
   * 创建转换任务
   */
  async createTask(): Promise<string> {
    const resp = await this.session.post(API_CREATE_TASK, {
      resource: this.downloadUrl,
      model_id: "7",
    });
    // console.log("Create task response:", resp);

    const { code, message, data } = resp.data;
    if (code !== 0) {
      throw new ASRError(code, message);
    }

    const taskData: TaskCreateRsp = data;
    this.taskId = taskData.task_id;
    return this.taskId;
  }

  /**
   * 查询转换结果
   */
  async result(taskId?: string): Promise<ResultRsp> {
    const resp = await this.session.get(API_QUERY_RESULT, {
      params: {
        model_id: 7,
        task_id: taskId || this.taskId,
      },
    });

    const { code, message, data } = resp.data;
    if (code !== 0) {
      throw new ASRError(code, message);
    }

    return data as ResultRsp;
  }

  /**
   * 解析结果数据
   */
  parseResult(resultRsp: ResultRsp): ASRData {
    if (!resultRsp.result) {
      throw new Error("No result data available");
    }
    const data: ASRDataResult = JSON.parse(resultRsp.result);
    return new ASRData(data);
  }

  /**
   * 完整的识别流程
   * @param pollingInterval 轮询间隔（毫秒），默认 30000ms (30秒)
   * @returns ASRData 识别结果
   */
  async recognize(pollingInterval: number = 20000): Promise<ASRData> {
    // 上传文件
    await this.upload();

    // 创建任务
    await this.createTask();

    // 轮询检查任务状态
    while (true) {
      const taskResp = await this.result();

      switch (taskResp.state) {
        case ResultStateEnum.STOP:
          // 等待识别开始
          break;
        case ResultStateEnum.RUNNING:
          // 识别中
          break;
        case ResultStateEnum.ERROR:
          throw new ASRError(-1, `识别失败: ${taskResp.remark}`);
        case ResultStateEnum.COMPLETE:
          // 识别成功
          return this.parseResult(taskResp);
      }

      // 等待后继续轮询
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
  }
}

/**
 * ValueError 错误类
 */
class ValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValueError";
  }
}
