export class UploadController {
  constructor(uploadService) {
    this.uploadService = uploadService;
  }

  handleUploadInit = async (req, res) => {
    const session = await this.uploadService.initUpload(req.body);
    res.json(session);
  };

  handleUploadChunk = async (req, res) => {
    const { id, chunkIndex } = req.params;

    const progress = await this.uploadService.saveChunk(
      id,
      parseInt(chunkIndex, 10),
      req.body,
    );

    res.json({ chunkIndex, ...progress });
  };

  handleUploadComplete = async (req, res) => {
    const { id } = req.params;

    const result = await this.uploadService.completeUpload(id);
    res.json({ success: true, ...result });
  };

  handleUploadStatus = async (req, res) => {
    const { id } = req.params;

    const status = await this.uploadService.getStatus(id);
    res.json(status);
  };
}
