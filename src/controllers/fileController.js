export class FileController {
  constructor(fileService) {
    this.fileService = fileService;
  }

  handleListFiles = async (req, res) => {
    const data = await this.fileService.listFilesWithSummary();
    res.json(data);
  };

  handleViewFile = (req, res) => {
    const { fileName } = req.params;
    const { stream, headers } = this.fileService.getFileStream(fileName);
    res.writeHead(200, headers);
    stream.pipe(res);
  };

  handleDeleteFile = async (req, res) => {
    const { fileName } = req.params;
    const summary = await this.fileService.deleteFile(fileName);
    res.json({ success: true, ...summary });
  };
}