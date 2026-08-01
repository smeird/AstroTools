export interface StorageVolumeInput {
  resolutionWidthPx: number;
  resolutionHeightPx: number;
  bitDepth: number;
  channelCount: number;
  exposureSeconds: number;
  sessionHours: number;
  calibrationFrames: number;
  fileOverheadPercent: number;
}
export interface StorageVolumeResult {
  bytesPerFrame: number;
  lightFrameCount: number;
  totalFrameCount: number;
  lightDataBytes: number;
  calibrationDataBytes: number;
  totalDataBytes: number;
  totalDataGiB: number;
  sustainedWriteMiBPerSecond: number;
}
export function calculateStorageVolume(
  i: StorageVolumeInput,
): StorageVolumeResult {
  for (const [n, v] of Object.entries(i))
    if (!Number.isFinite(v) || v < 0)
      throw new RangeError(`${n} must be non-negative`);
  if (
    i.resolutionWidthPx <= 0 ||
    i.resolutionHeightPx <= 0 ||
    i.bitDepth <= 0 ||
    i.channelCount <= 0 ||
    i.exposureSeconds <= 0 ||
    i.sessionHours <= 0
  )
    throw new RangeError("capture values must be positive");
  const bytesPerFrame =
      i.resolutionWidthPx *
      i.resolutionHeightPx *
      (i.bitDepth / 8) *
      i.channelCount *
      (1 + i.fileOverheadPercent / 100),
    lightFrameCount = Math.floor((i.sessionHours * 3600) / i.exposureSeconds),
    calibrationFrames = Math.floor(i.calibrationFrames),
    lightDataBytes = bytesPerFrame * lightFrameCount,
    calibrationDataBytes = bytesPerFrame * calibrationFrames,
    totalDataBytes = lightDataBytes + calibrationDataBytes;
  return {
    bytesPerFrame,
    lightFrameCount,
    totalFrameCount: lightFrameCount + calibrationFrames,
    lightDataBytes,
    calibrationDataBytes,
    totalDataBytes,
    totalDataGiB: totalDataBytes / 2 ** 30,
    sustainedWriteMiBPerSecond: bytesPerFrame / i.exposureSeconds / 2 ** 20,
  };
}
