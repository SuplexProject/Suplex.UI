using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class UserVM
    {
        public SPEditorVM User { get; set; }
        public List<MemberVM> MemberOf { get; set; }
        public List<MemberVM> NotMemberOf { get; set; }
    }
    public class UserSaveVM
    {
        public SPEditorVM User { get; set; }
        public List<MemberVM> MembersOfToAdd { get; set; }
        public List<MemberVM> MembersOfToRemove { get; set; }
    }
}
