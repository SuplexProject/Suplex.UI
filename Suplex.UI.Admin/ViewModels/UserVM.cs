using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class UserVM
    {
        public SecurityPrincipalEditorVM User { get; set; }
        public List<MemberVM> MemberOf { get; set; }
        public List<MemberVM> NotMemberOf { get; set; }
    }
    public class UserSaveVM
    {
        public SecurityPrincipalEditorVM User { get; set; }
        public List<MemberVM> MemberOfToAdd { get; set; }
        public List<MemberVM> MemberOfToRemove { get; set; }
    }
}
