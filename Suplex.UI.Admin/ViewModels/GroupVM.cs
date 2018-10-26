using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class GroupVM
    {
        public SecurityPrincipalEditorVM Group { get; set; }
        public List<MemberVM> MemberOf { get; set; }
        public List<MemberVM> Members { get; set; }
        public List<GroupHierarchyVM> GroupHierarchy { get; set; }
        public List<MemberVM> NotMemberOf { get; set; }
        public List<MemberVM> NotMembers { get; set; }
    }
    public class GroupSaveVM
    {
        public SecurityPrincipalEditorVM Group { get; set; }
        public List<MemberVM> MembersToAdd { get; set; }
        public List<MemberVM> MembersToRemove { get; set; }
        public List<MemberVM> MemberOfToAdd { get; set; }
        public List<MemberVM> MemberOfToRemove { get; set; }
    }
}
