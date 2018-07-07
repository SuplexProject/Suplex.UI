using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class GroupVM
    {
        public SecurityPrincipalEditorVM Group { get; set; }
        public List<MemberVM> Members { get; set; }
        public List<MemberVM> NonMembers { get; set; }
        public List<GroupHierarchyVM> GroupHierarchy { get; set; }
    }
    public class GroupSaveVM
    {
        public SecurityPrincipalEditorVM Group { get; set; }
        public List<MemberVM> MembersToAdd { get; set; }
        public List<MemberVM> MembersToRemove { get; set; }
    }
}
