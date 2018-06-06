
using AutoMapper;
using Suplex.Security.Principal;
using Suplex.UI.Modules.Admin.ViewModels;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class SecurityPrincipalVMProfile : Profile
    {
        public SecurityPrincipalVMProfile()
        {
            CreateMap<User, SecurityPrincipalVM>().ForMember(dest => dest.Source, opt => opt.UseValue("User"));
            CreateMap<Group, SecurityPrincipalVM>().ForMember(dest => dest.Source, opt => opt.MapFrom(src => src.IsLocal ? "Suplex" : "External"));
        }


    }
}
