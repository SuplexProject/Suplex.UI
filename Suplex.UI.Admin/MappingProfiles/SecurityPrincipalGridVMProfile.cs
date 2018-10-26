
using AutoMapper;
using Suplex.Security.Principal;
using Suplex.UI.Modules.Admin.ViewModels;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class SecurityPrincipalGridVMProfile : Profile
    {
        public SecurityPrincipalGridVMProfile()
        {
            CreateMap<User, SecurityPrincipalGridVM>().ForMember(dest => dest.Source, opt => opt.UseValue("User"));
            CreateMap<Group, SecurityPrincipalGridVM>().ForMember(dest => dest.Source, opt => opt.MapFrom(src => src.IsLocal ? "Local (Suplex)" : "External"));
        }


    }
}
