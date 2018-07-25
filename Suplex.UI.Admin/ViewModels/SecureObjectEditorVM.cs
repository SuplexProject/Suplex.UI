using Suplex.Security.AclModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class DaclVM
    {
        public Guid? UId { get; set; }
        public Guid? TrusteeUId { get; set; }
        public bool Allowed { get; set; }
        public bool Inheritable { get; set; }
        public string RightType { get; set; }  // from FriendlyTypeName 
        public int Right { get; set; }
    }
    public class SaclVM
    {
        public Guid? UId { get; set; }
        public Guid? TrusteeUId { get; set; }
        public bool Allowed { get; set; }
        public bool Denied { get; set; }
        public bool Inheritable { get; set; }
        public string RightType { get; set; } 
        public int Right { get; set; }
    }
    public class SecureObjectEditorVM
    {
        public Guid? UId { get; set; }

        [Required]
        public string UniqueName { get; set; }
        public bool IsEnabled { get; set; }
        public Guid? ParentUId { get; set; }

        public bool DaclAllowInherit { get; set; }
        public bool SaclAllowInherit { get; set; }
        public int SaclAuditTypeFilter { get; set; }

        public List<DaclVM> Dacl { get; set; }
        public List<SaclVM> Sacl { get; set; }


    }
}
