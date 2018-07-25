using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class SecureObjectTreeItemVM
    {
        public Guid? UId { get; set; }
        public string UniqueName { get; set; }
        public Guid? ParentUId { get; set; }
        public bool IsEnabled { get; set; }
        public bool HasChildren { get; set; }
    }
}
