using AutoMapper;
using Suplex.UI.Modules.Admin.ViewModels;
using Suplex.Security.Principal;


namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class TrusteeVMProfile : Profile
    {
        public TrusteeVMProfile()
        {
            CreateMap<Group, TrusteeVM>();
            CreateMap<User, TrusteeVM>();
        }
    }
}
