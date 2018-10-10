using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Suplex.Security.AclModel;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class SecureObjectTreeItemVM
    {
        public Guid? UId { get; set; }
        public string UniqueName { get; set; }
        public Guid? ParentUId { get; set; }
        public bool IsEnabled { get; set; }
        public bool IsDefaultSecuritySettings { get; set; }
        public bool HasChildren { get; set; }
        [JsonIgnore]
        public Suplex.Security.AclModel.AuditType DefaultSaclAuditTypeFilter { get; }

        public SecureObjectTreeItemVM()
        {
            SecurityDescriptor sd = new SecurityDescriptor();
            this.DefaultSaclAuditTypeFilter = sd.SaclAuditTypeFilter;
        }
    }
}
