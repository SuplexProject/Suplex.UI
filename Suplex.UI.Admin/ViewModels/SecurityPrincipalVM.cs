using System;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class SecurityPrincipalVM
    {
        public Guid? UId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsUser { get; set; }
        public bool IsEnabled { get; set; }
        public bool IsLocal { get; set; }
        public string Source { get; set; }
    }    
}
