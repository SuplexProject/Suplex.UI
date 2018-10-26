using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class GroupHierarchyVM
    {
        public Guid MemberUId { get; set; }
        public Guid? GroupUId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsUser { get; set; }
        public bool IsLocal { get; set; }
        public bool IsEnabled { get; set; }
    }
    
}
