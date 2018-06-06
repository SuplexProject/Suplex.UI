using AutoMapper;
using Suplex.UI.Modules.Admin.ViewModels;
using Suplex.Security.Principal;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class MemberVMProfile: Profile
    {
        public MemberVMProfile()
        {
            CreateMap<Group, MemberVM>();
            CreateMap<User, MemberVM>();
        }
    }
}
