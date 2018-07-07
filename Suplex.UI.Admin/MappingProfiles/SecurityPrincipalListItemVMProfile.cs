
using AutoMapper;
using Suplex.Security.Principal;
using Suplex.UI.Modules.Admin.ViewModels;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class SecurityPrincipalListItemVMProfile : Profile
    {
        public SecurityPrincipalListItemVMProfile()
        {
            CreateMap<User, SecurityPrincipalListItemVM>().ForMember(dest => dest.Source, opt => opt.UseValue("User"));
            CreateMap<Group, SecurityPrincipalListItemVM>().ForMember(dest => dest.Source, opt => opt.MapFrom(src => src.IsLocal ? "Suplex" : "External"));
        }


    }
}
