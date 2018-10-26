using AutoMapper;
using Suplex.UI.Modules.Admin.ViewModels;
using Suplex.Security.Principal;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class MemberVMProfile: Profile
    {
        public MemberVMProfile()
        {
            CreateMap<Group, MemberVM>().ForMember(dest => dest.Source, opt => opt.MapFrom(src => src.IsLocal ? "Local (Suplex)" : "External"));
            CreateMap<User, MemberVM>().ForMember(dest => dest.Source, opt => opt.UseValue("User"));
            
        }
    }
}
