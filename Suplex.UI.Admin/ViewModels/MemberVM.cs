using System;
using System.Collections.Generic;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class MemberVM 
    {
        public Guid UId { get; set; }        
        public string Name { get; set; }
        public bool IsUser { get; set; }
        public bool IsLocal { get; set; }
        public bool IsEnabled { get; set; }        
    }
}
