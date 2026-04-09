export class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
  }

  handleGetSettings = async (req, res) => {
    const result = await this.adminService.getSettings();
    res.json(result);
  };

  handleUpdateSettings = async (req, res) => {
    const result = await this.adminService.updateSettings(req.body);
    res.json(result);
  };
}
