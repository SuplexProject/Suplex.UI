using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class SecureObjectTreeVM
    {
        //public Guid UId { get; set; }
        public string UId { get; set; }
        public string UniqueName { get; set; }
        //public Guid? ParentUId { get; set; }
        public string ParentUId { get; set; }
        public bool IsEnabled { get; set; }
        public bool IsSecure { get; set; }
        public bool DaclAllowInherit { get; set; }
        public bool SaclAllowInherit { get; set; }
    }
}
