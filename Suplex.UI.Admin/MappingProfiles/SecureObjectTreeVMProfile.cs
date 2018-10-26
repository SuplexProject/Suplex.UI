using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Suplex.Security.AclModel;
using Suplex.UI.Modules.Admin.ViewModels;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class SecureObjectTreeVMProfile : Profile
    {
        public SecureObjectTreeVMProfile()
        {
            CreateMap<SecureObject, SecureObjectTreeVM>()
                .ForMember(d => d.DaclAllowInherit, opts => opts.MapFrom(s => s.Security.DaclAllowInherit))
                .ForMember(d => d.SaclAllowInherit, opts => opts.MapFrom(s => s.Security.SaclAllowInherit));
        }
    }
}
