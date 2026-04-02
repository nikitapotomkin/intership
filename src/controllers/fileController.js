import { sendJSON } from "../common/utils/sendJSON.js";

export class FileController {
  constructor(fileService) {
    this.fileService = fileService;
  }

  handleListFiles = (req, res) => {
    const data = this.fileService.listFilesWithSummary();
    sendJSON(res, 200, data);
  };

  handleViewFile = (req, res, params) => {
    const { fileName } = params;
    const { stream, headers } = this.fileService.getFileStream(fileName);
    res.writeHead(200, headers);
    stream.pipe(res);
  };

  handleDeleteFile = (req, res, params) => {
    const { fileName } = params; 
    const summary = this.fileService.deleteFile(fileName);
    sendJSON(res, 200, { success: true, ...summary });
  };
}
