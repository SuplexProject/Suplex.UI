
using System.Collections.Generic;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class ResponseVM
    {
        public string Status { get; set; }
        public string Message { get; set; }
        public List<string> ValidationErrors { get; set; }
        public object Data { get; set; }
    }
}
